#!/usr/bin/env node
/**
 * SkillSync — Sync Claude Code skills to Insight 360
 *
 * Usage:
 *   node scripts/sync-skills.js marketing              # sync marketing dept
 *   node scripts/sync-skills.js marketing --dry-run     # preview changes
 *   node scripts/sync-skills.js --all                   # sync all depts with manifests
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY in .env
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ─── Configuration ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
// Skills live at the workspace level so every project can share them.
// Default: ../.claude/skills relative to the project root (e.g. AIDevelopment/.claude/skills).
// Override with the SKILLS_DIR env var if a project keeps its skills elsewhere.
const SKILLS_DIR = process.env.SKILLS_DIR
    ? path.resolve(process.env.SKILLS_DIR)
    : path.resolve(ROOT, '..', '.claude', 'skills');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeHash(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function parseSkillMd(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        throw new Error(`Invalid SKILL.md: missing frontmatter in ${filePath}`);
    }

    const frontmatter = {};
    frontmatterMatch[1].split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            frontmatter[key] = value;
        }
    });

    const body = raw.slice(frontmatterMatch[0].length).trim();
    return { frontmatter, body, raw };
}

function extractSections(markdownContent) {
    const sections = {};
    const lines = markdownContent.split('\n');
    let currentHeader = null;
    let currentLines = [];

    for (const line of lines) {
        const headerMatch = line.match(/^## (.+)/);
        if (headerMatch) {
            if (currentHeader) {
                sections[currentHeader] = currentLines.join('\n').trim();
            }
            currentHeader = headerMatch[1].trim();
            currentLines = [];
        } else if (currentHeader) {
            currentLines.push(line);
        }
    }
    if (currentHeader) {
        sections[currentHeader] = currentLines.join('\n').trim();
    }
    return sections;
}

function escapeRegex(str) {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function buildSkillDirToAgentNameMap(manifest) {
    const map = {};
    for (const skillDef of (manifest.skills || [])) {
        if (skillDef.dir && skillDef.agent_name) {
            map[skillDef.dir] = skillDef.agent_name;
        }
    }
    return map;
}

function transformInstructions(body, isOrchestrator, skillDirToAgentName = {}) {
    // Strip relative context references — they'll be injected via context assets.
    // Match any `*-context.md` reference so this isn't tied to one project's file.
    let instructions = body
        .replace(/- Reference: \[.*?\]\([^)]*-context\.md\)/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (isOrchestrator && Object.keys(skillDirToAgentName).length > 0) {
        // Replace `/skill-dir` slug references with the manifest's agent_name.
        // Sort by length descending so longer slugs match before shorter prefixes
        // (e.g. `/mkt-brand-voice` wins over `/mkt-brand`).
        const dirs = Object.keys(skillDirToAgentName).sort((a, b) => b.length - a.length);
        for (const dir of dirs) {
            const pattern = new RegExp('`\\/' + escapeRegex(dir) + '`', 'g');
            instructions = instructions.replace(pattern, skillDirToAgentName[dir]);
        }
    }

    return instructions;
}

// ─── Results Tracker ────────────────────────────────────────────────────────

function createResults() {
    return {
        archived: [],
        context: { created: 0, updated: 0, unchanged: 0, items: [] },
        skills: { created: 0, updated: 0, unchanged: 0, items: [] },
        agents: { created: 0, updated: 0, unchanged: 0, items: [] },
        assignments: { created: 0, existing: 0 },
        mappings: { created: 0, existing: 0 },
        errors: []
    };
}

// ─── Step 0: Archive Legacy Agents ──────────────────────────────────────────

async function archiveLegacyAgents(manifest, dryRun, results) {
    if (!manifest.archive_agents || manifest.archive_agents.length === 0) {
        return;
    }

    console.log('\n--- Step 0: Archive Legacy Agents ---');

    for (const agent of manifest.archive_agents) {
        if (dryRun) {
            console.log(`  [DRY-RUN] Would archive: ${agent.name} — ${agent.reason}`);
            results.archived.push(agent.name);
            continue;
        }

        // Soft-delete: set is_active = false
        const { error: agentError } = await supabase
            .from('agents')
            .update({ is_active: false })
            .eq('id', agent.id);

        if (agentError) {
            // Agent may not exist — not an error
            console.log(`  [SKIP] ${agent.name} (not found or already archived)`);
            continue;
        }

        // Remove department assignment
        await supabase
            .from('department_agents')
            .delete()
            .eq('agent_id', agent.id)
            .eq('department_id', manifest.department_id);

        console.log(`  [ARCHIVED] ${agent.name} — ${agent.reason}`);
        results.archived.push(agent.name);
    }
}

// ─── Step 1: Sync Shared Context ────────────────────────────────────────────

async function syncSharedContext(manifest, dryRun, results) {
    if (!manifest.shared_context || manifest.shared_context.length === 0) {
        return;
    }

    console.log('\n--- Step 1: Sync Shared Context ---');

    for (const contextFile of manifest.shared_context) {
        const filePath = path.join(SKILLS_DIR, contextFile.file);
        if (!fs.existsSync(filePath)) {
            results.errors.push(`Shared context file not found: ${contextFile.file}`);
            console.log(`  [ERROR] File not found: ${contextFile.file}`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const sections = extractSections(content);

        for (const [sectionName, config] of Object.entries(contextFile.sections)) {
            let sectionContent = sections[sectionName] || '';

            // Merge additional sections if configured
            if (config.merge_with) {
                for (const mergeName of config.merge_with) {
                    if (sections[mergeName]) {
                        sectionContent += `\n\n## ${mergeName}\n\n${sections[mergeName]}`;
                    }
                }
            }

            if (!sectionContent.trim()) {
                console.log(`  [SKIP] Section "${sectionName}" not found or empty`);
                continue;
            }

            const hash = computeHash(sectionContent);

            // Look up existing asset by name + org_id
            const { data: existing } = await supabase
                .from('context_assets')
                .select('id, content_text')
                .eq('name', config.asset_name)
                .eq('org_id', manifest.org_id)
                .eq('is_current', true)
                .maybeSingle();

            const existingHash = existing ? computeHash(existing.content_text || '') : null;

            if (!existing) {
                if (dryRun) {
                    console.log(`  [DRY-RUN] Would create: ${config.asset_name} (${config.asset_type})`);
                } else {
                    const { error } = await supabase
                        .from('context_assets')
                        .insert({
                            user_id: manifest.user_id,
                            org_id: manifest.org_id,
                            asset_type: config.asset_type,
                            name: config.asset_name,
                            description: `Synced from ${contextFile.file} — section: ${sectionName}`,
                            content_json: { source: contextFile.file, section: sectionName },
                            content_text: sectionContent,
                            visibility: 'organization',
                            tags: ['skillsync', 'auto-synced']
                        });
                    if (error) {
                        results.errors.push(`Failed to create ${config.asset_name}: ${error.message}`);
                        console.log(`  [ERROR] ${config.asset_name}: ${error.message}`);
                        continue;
                    }
                    console.log(`  [CREATED] ${config.asset_name} (${config.asset_type})`);
                }
                results.context.created++;
                results.context.items.push({ name: config.asset_name, action: 'created' });
            } else if (existingHash !== hash) {
                if (dryRun) {
                    console.log(`  [DRY-RUN] Would update: ${config.asset_name}`);
                } else {
                    const { error } = await supabase
                        .from('context_assets')
                        .update({
                            content_text: sectionContent,
                            content_json: { source: contextFile.file, section: sectionName },
                            version: (existing.version || 1) + 1
                        })
                        .eq('id', existing.id);
                    if (error) {
                        results.errors.push(`Failed to update ${config.asset_name}: ${error.message}`);
                        console.log(`  [ERROR] ${config.asset_name}: ${error.message}`);
                        continue;
                    }
                    console.log(`  [UPDATED] ${config.asset_name}`);
                }
                results.context.updated++;
                results.context.items.push({ name: config.asset_name, action: 'updated' });
            } else {
                console.log(`  [UNCHANGED] ${config.asset_name}`);
                results.context.unchanged++;
            }
        }
    }
}

// ─── Step 2: Sync Skills ────────────────────────────────────────────────────

async function syncSkills(manifest, dryRun, results) {
    console.log('\n--- Step 2: Sync Skills ---');
    const skillMap = {}; // dir -> skill record (for agent sync)
    const skillDirToAgentName = buildSkillDirToAgentNameMap(manifest);

    for (const skillDef of manifest.skills) {
        const skillDir = path.join(SKILLS_DIR, skillDef.dir);
        const skillFile = path.join(skillDir, 'SKILL.md');

        if (!fs.existsSync(skillFile)) {
            results.errors.push(`SKILL.md not found: ${skillDef.dir}/SKILL.md`);
            console.log(`  [ERROR] Not found: ${skillDef.dir}/SKILL.md`);
            continue;
        }

        const { frontmatter, body, raw } = parseSkillMd(skillFile);
        const hash = computeHash(raw);
        const instructions = transformInstructions(body, skillDef.is_orchestrator, skillDirToAgentName);
        const skillName = frontmatter.name || skillDef.dir;

        // Look up existing skill by source_path + org_id
        const { data: existing } = await supabase
            .from('skills')
            .select('id, content_hash, version')
            .eq('source_path', `.claude/skills/${skillDef.dir}`)
            .eq('org_id', manifest.org_id)
            .maybeSingle();

        // Also check by name as fallback
        let existingSkill = existing;
        if (!existingSkill) {
            const { data: byName } = await supabase
                .from('skills')
                .select('id, content_hash, version')
                .eq('name', skillName)
                .eq('org_id', manifest.org_id)
                .maybeSingle();
            existingSkill = byName;
        }

        if (!existingSkill) {
            // CREATE skill
            if (dryRun) {
                console.log(`  [DRY-RUN] Would create skill: ${skillName}`);
                skillMap[skillDef.dir] = { id: 'dry-run', name: skillName };
            } else {
                const { data: newSkill, error } = await supabase
                    .from('skills')
                    .insert({
                        user_id: manifest.user_id,
                        org_id: manifest.org_id,
                        name: skillName,
                        display_name: skillDef.agent_name,
                        description: frontmatter.description || skillDef.description || '',
                        icon: skillDef.icon || 'wand-2',
                        category: skillDef.category || 'custom',
                        suite: skillDef.suite || 'execute',
                        instructions,
                        required_context_types: skillDef.required_context || [],
                        optional_context_types: skillDef.optional_context || [],
                        content_hash: hash,
                        source_path: `.claude/skills/${skillDef.dir}`,
                        sync_source: 'claude_code',
                        last_synced_at: new Date().toISOString(),
                        status: 'active',
                        visibility: 'organization',
                        version: '1.0.0'
                    })
                    .select()
                    .single();

                if (error) {
                    results.errors.push(`Failed to create skill ${skillName}: ${error.message}`);
                    console.log(`  [ERROR] ${skillName}: ${error.message}`);
                    continue;
                }

                // Create initial version
                await supabase.from('skill_versions').insert({
                    skill_id: newSkill.id,
                    version_number: 1,
                    version_label: '1.0.0',
                    instructions,
                    required_context_types: skillDef.required_context || [],
                    optional_context_types: skillDef.optional_context || [],
                    change_summary: `Initial sync from Claude Code (${skillDef.dir})`,
                    lineage_source: 'original',
                    source_hash: hash,
                    created_by: manifest.user_id
                });

                skillMap[skillDef.dir] = newSkill;
                console.log(`  [CREATED] ${skillName}`);
            }
            results.skills.created++;
            results.skills.items.push({ name: skillName, action: 'created' });
        } else if (existingSkill.content_hash !== hash) {
            // UPDATE skill
            const newVersion = ((parseFloat(existingSkill.version) || 1.0) + 0.1).toFixed(1) + '.0';
            if (dryRun) {
                console.log(`  [DRY-RUN] Would update skill: ${skillName} -> ${newVersion}`);
                skillMap[skillDef.dir] = existingSkill;
            } else {
                const { error } = await supabase
                    .from('skills')
                    .update({
                        instructions,
                        content_hash: hash,
                        last_synced_at: new Date().toISOString(),
                        version: newVersion,
                        display_name: skillDef.agent_name,
                        description: frontmatter.description || skillDef.description || ''
                    })
                    .eq('id', existingSkill.id);

                if (error) {
                    results.errors.push(`Failed to update skill ${skillName}: ${error.message}`);
                    console.log(`  [ERROR] ${skillName}: ${error.message}`);
                    continue;
                }

                // Get max version number
                const { data: versions } = await supabase
                    .from('skill_versions')
                    .select('version_number')
                    .eq('skill_id', existingSkill.id)
                    .order('version_number', { ascending: false })
                    .limit(1);
                const nextVersionNum = (versions?.[0]?.version_number || 0) + 1;

                await supabase.from('skill_versions').insert({
                    skill_id: existingSkill.id,
                    version_number: nextVersionNum,
                    version_label: newVersion,
                    instructions,
                    required_context_types: skillDef.required_context || [],
                    optional_context_types: skillDef.optional_context || [],
                    change_summary: `Synced update from Claude Code (${skillDef.dir})`,
                    lineage_source: 'claude_code',
                    source_hash: hash,
                    created_by: manifest.user_id
                });

                skillMap[skillDef.dir] = existingSkill;
                console.log(`  [UPDATED] ${skillName} -> v${newVersion}`);
            }
            results.skills.updated++;
            results.skills.items.push({ name: skillName, action: 'updated' });
        } else {
            console.log(`  [UNCHANGED] ${skillName}`);
            skillMap[skillDef.dir] = existingSkill;
            results.skills.unchanged++;
        }
    }

    return skillMap;
}

// ─── Step 3: Sync Agents ────────────────────────────────────────────────────

async function syncAgents(manifest, skillMap, dryRun, results) {
    console.log('\n--- Step 3: Sync Agents ---');
    const agentMap = {}; // dir -> agent record
    const skillDirToAgentName = buildSkillDirToAgentNameMap(manifest);

    for (const skillDef of manifest.skills) {
        const skill = skillMap[skillDef.dir];
        if (!skill) continue;

        // Look up existing agent by name + org_id
        const { data: existing } = await supabase
            .from('agents')
            .select('id, system_prompt, skill_id')
            .eq('name', skillDef.agent_name)
            .eq('org_id', manifest.org_id)
            .maybeSingle();

        // Read the skill instructions for the system prompt
        const skillFile = path.join(SKILLS_DIR, skillDef.dir, 'SKILL.md');
        const { body } = parseSkillMd(skillFile);
        const systemPrompt = transformInstructions(body, skillDef.is_orchestrator, skillDirToAgentName);

        if (!existing) {
            if (dryRun) {
                console.log(`  [DRY-RUN] Would create agent: ${skillDef.agent_name}`);
                agentMap[skillDef.dir] = { id: 'dry-run' };
            } else {
                const { data: newAgent, error } = await supabase
                    .from('agents')
                    .insert({
                        user_id: manifest.user_id,
                        org_id: manifest.org_id,
                        name: skillDef.agent_name,
                        description: skillDef.description || '',
                        type: 'custom',
                        icon: skillDef.icon || 'bot',
                        is_active: true,
                        suite: skillDef.suite || 'execute',
                        category: skillDef.category || 'custom',
                        llm_provider: 'anthropic',
                        llm_model: skillDef.llm_model || 'claude-sonnet-4-5-20250929',
                        system_prompt: systemPrompt,
                        skill_id: skill.id !== 'dry-run' ? skill.id : null,
                        skill_version: skill.version || '1.0.0',
                        auto_update_skill: true,
                        visibility: 'organization'
                    })
                    .select()
                    .single();

                if (error) {
                    results.errors.push(`Failed to create agent ${skillDef.agent_name}: ${error.message}`);
                    console.log(`  [ERROR] ${skillDef.agent_name}: ${error.message}`);
                    continue;
                }

                agentMap[skillDef.dir] = newAgent;
                console.log(`  [CREATED] ${skillDef.agent_name}`);
            }
            results.agents.created++;
            results.agents.items.push({ name: skillDef.agent_name, action: 'created' });
        } else {
            // Update agent if skill was updated (auto_update_skill)
            const skillUpdated = results.skills.items.some(
                i => i.name === (skillMap[skillDef.dir]?.name || skillDef.dir) && i.action === 'updated'
            );

            if (skillUpdated) {
                if (dryRun) {
                    console.log(`  [DRY-RUN] Would update agent: ${skillDef.agent_name}`);
                } else {
                    await supabase
                        .from('agents')
                        .update({
                            system_prompt: systemPrompt,
                            skill_id: skill.id,
                            skill_version: skill.version || '1.0.0',
                            description: skillDef.description || ''
                        })
                        .eq('id', existing.id);
                    console.log(`  [UPDATED] ${skillDef.agent_name} (skill updated)`);
                }
                results.agents.updated++;
                results.agents.items.push({ name: skillDef.agent_name, action: 'updated' });
            } else {
                // Ensure skill_id link exists even if content unchanged
                if (!existing.skill_id && skill.id !== 'dry-run') {
                    if (!dryRun) {
                        await supabase
                            .from('agents')
                            .update({ skill_id: skill.id })
                            .eq('id', existing.id);
                    }
                }
                console.log(`  [UNCHANGED] ${skillDef.agent_name}`);
                results.agents.unchanged++;
            }
            agentMap[skillDef.dir] = existing;
        }
    }

    return agentMap;
}

// ─── Step 4: Sync Department Assignments ────────────────────────────────────

async function syncDepartmentAssignments(manifest, agentMap, dryRun, results) {
    console.log('\n--- Step 4: Sync Department Assignments ---');

    for (const skillDef of manifest.skills) {
        const agent = agentMap[skillDef.dir];
        if (!agent || agent.id === 'dry-run') {
            if (dryRun) {
                console.log(`  [DRY-RUN] Would assign ${skillDef.agent_name} to ${manifest.department}`);
                results.assignments.created++;
            }
            continue;
        }

        // Check if assignment exists
        const { data: existing } = await supabase
            .from('department_agents')
            .select('id')
            .eq('agent_id', agent.id)
            .eq('department_id', manifest.department_id)
            .maybeSingle();

        if (!existing) {
            if (!dryRun) {
                const { error } = await supabase
                    .from('department_agents')
                    .insert({
                        department_id: manifest.department_id,
                        agent_id: agent.id,
                        is_featured: skillDef.is_orchestrator || false,
                        sort_order: skillDef.sort_order || 50,
                        use_case_summary: skillDef.description || ''
                    });
                if (error) {
                    results.errors.push(`Failed to assign ${skillDef.agent_name}: ${error.message}`);
                    console.log(`  [ERROR] ${skillDef.agent_name}: ${error.message}`);
                    continue;
                }
            }
            console.log(`  [ASSIGNED] ${skillDef.agent_name} -> ${manifest.department}`);
            results.assignments.created++;
        } else {
            console.log(`  [EXISTS] ${skillDef.agent_name} already in ${manifest.department}`);
            results.assignments.existing++;
        }
    }
}

// ─── Step 5: Sync Context Mappings ──────────────────────────────────────────

async function syncContextMappings(manifest, agentMap, dryRun, results) {
    console.log('\n--- Step 5: Sync Context Mappings ---');

    // Build a map of asset_type -> asset_id from existing context assets
    const { data: orgAssets } = await supabase
        .from('context_assets')
        .select('id, asset_type, name')
        .eq('org_id', manifest.org_id)
        .eq('is_current', true);

    const assetByType = {};
    for (const asset of (orgAssets || [])) {
        assetByType[asset.asset_type] = asset;
    }

    for (const skillDef of manifest.skills) {
        const agent = agentMap[skillDef.dir];
        if (!agent || agent.id === 'dry-run') {
            if (dryRun) {
                const total = (skillDef.required_context || []).length + (skillDef.optional_context || []).length;
                console.log(`  [DRY-RUN] Would create ${total} mappings for ${skillDef.agent_name}`);
                results.mappings.created += total;
            }
            continue;
        }

        // Map required context
        for (const ctxType of (skillDef.required_context || [])) {
            const asset = assetByType[ctxType];
            if (!asset) {
                console.log(`  [SKIP] No ${ctxType} asset found for ${skillDef.agent_name}`);
                continue;
            }
            await upsertMapping(agent.id, asset.id, 'always', 10, dryRun, results);
        }

        // Map optional context
        for (const ctxType of (skillDef.optional_context || [])) {
            const asset = assetByType[ctxType];
            if (!asset) continue;
            await upsertMapping(agent.id, asset.id, 'on_demand', 0, dryRun, results);
        }
    }
}

async function upsertMapping(agentId, assetId, injectionMode, priority, dryRun, results) {
    const { data: existing } = await supabase
        .from('agent_context_mappings')
        .select('id')
        .eq('agent_id', agentId)
        .eq('asset_id', assetId)
        .maybeSingle();

    if (!existing) {
        if (!dryRun) {
            await supabase
                .from('agent_context_mappings')
                .insert({
                    agent_id: agentId,
                    asset_id: assetId,
                    injection_mode: injectionMode,
                    priority,
                    is_active: true
                });
        }
        results.mappings.created++;
    } else {
        results.mappings.existing++;
    }
}

// ─── Step 6: Sync Expert Skills (Future) ────────────────────────────────────

async function syncExpertSkills(manifest, dryRun, results) {
    if (!manifest.expert_skills || manifest.expert_skills.length === 0) {
        return;
    }

    console.log('\n--- Step 6: Sync Expert Skills ---');

    for (const expert of manifest.expert_skills) {
        const skillFile = path.join(SKILLS_DIR, expert.dir, 'SKILL.md');
        if (!fs.existsSync(skillFile)) {
            console.log(`  [SKIP] Expert skill not found: ${expert.dir}/SKILL.md`);
            continue;
        }

        const { body, raw } = parseSkillMd(skillFile);
        const hash = computeHash(raw);

        // Extract framework sections if configured
        if (expert.deploy_as_context && expert.framework_sections) {
            const sections = extractSections(body);
            let frameworkContent = '';
            for (const sectionHeader of expert.framework_sections) {
                const sectionName = sectionHeader.replace(/^## /, '');
                if (sections[sectionName]) {
                    frameworkContent += `## ${sectionName}\n\n${sections[sectionName]}\n\n`;
                }
            }

            if (frameworkContent.trim()) {
                const assetName = `${expert.expert_name} - ${expert.domain} Framework`;
                const { data: existing } = await supabase
                    .from('context_assets')
                    .select('id')
                    .eq('name', assetName)
                    .eq('org_id', manifest.org_id)
                    .maybeSingle();

                if (!existing && !dryRun) {
                    await supabase.from('context_assets').insert({
                        user_id: manifest.user_id,
                        org_id: manifest.org_id,
                        asset_type: 'expert_framework',
                        name: assetName,
                        description: `${expert.expert_name}'s ${expert.domain} methodology`,
                        content_json: {
                            expert_name: expert.expert_name,
                            domain: expert.domain,
                            source: expert.dir
                        },
                        content_text: frameworkContent.trim(),
                        visibility: 'organization',
                        tags: ['skillsync', 'expert-framework', expert.domain]
                    });
                    console.log(`  [CREATED] Context: ${assetName}`);
                }
            }
        }

        if (expert.deploy_as_agent) {
            console.log(`  [INFO] Agent creation for expert skills follows same pattern as regular skills`);
        }
    }
}

// ─── Summary ────────────────────────────────────────────────────────────────

function printSummary(results, dryRun) {
    console.log('\n' + '='.repeat(60));
    console.log(dryRun ? '  SYNC PREVIEW (DRY RUN)' : '  SYNC COMPLETE');
    console.log('='.repeat(60));

    if (results.archived.length > 0) {
        console.log(`\n  Archived agents:  ${results.archived.length}`);
        results.archived.forEach(name => console.log(`    - ${name}`));
    }

    console.log(`\n  Context assets:   ${results.context.created} created, ${results.context.updated} updated, ${results.context.unchanged} unchanged`);
    console.log(`  Skills:           ${results.skills.created} created, ${results.skills.updated} updated, ${results.skills.unchanged} unchanged`);
    console.log(`  Agents:           ${results.agents.created} created, ${results.agents.updated} updated, ${results.agents.unchanged} unchanged`);
    console.log(`  Dept assignments: ${results.assignments.created} created, ${results.assignments.existing} existing`);
    console.log(`  Context mappings: ${results.mappings.created} created, ${results.mappings.existing} existing`);

    if (results.errors.length > 0) {
        console.log(`\n  ERRORS (${results.errors.length}):`);
        results.errors.forEach(err => console.log(`    ! ${err}`));
    }

    console.log('\n' + '='.repeat(60));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function syncDepartment(deptName, dryRun) {
    console.log(`\nSkillSync: ${deptName}${dryRun ? ' (DRY RUN)' : ''}`);
    console.log('='.repeat(60));

    // Find manifest
    const manifestPath = path.join(SKILLS_DIR, `${deptName}-manifest.json`);
    // Also check short names (e.g., "marketing" -> "mkt-manifest.json")
    const shortNames = {
        marketing: 'mkt',
        sales: 'sales',
        finance: 'fin',
        operations: 'ops',
        support: 'sup',
        executive: 'exec'
    };
    const altPath = shortNames[deptName]
        ? path.join(SKILLS_DIR, `${shortNames[deptName]}-manifest.json`)
        : null;

    let manifest;
    if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } else if (altPath && fs.existsSync(altPath)) {
        manifest = JSON.parse(fs.readFileSync(altPath, 'utf8'));
    } else {
        console.error(`Manifest not found: ${manifestPath}`);
        if (altPath) console.error(`  Also tried: ${altPath}`);
        process.exit(1);
    }

    // Validate manifest
    if (!manifest.department_id || !manifest.org_id || !manifest.user_id) {
        console.error('Manifest missing required fields: department_id, org_id, user_id');
        process.exit(1);
    }

    const results = createResults();
    const startTime = Date.now();

    // Execute sync pipeline
    await archiveLegacyAgents(manifest, dryRun, results);
    await syncSharedContext(manifest, dryRun, results);
    const skillMap = await syncSkills(manifest, dryRun, results);
    const agentMap = await syncAgents(manifest, skillMap, dryRun, results);
    await syncDepartmentAssignments(manifest, agentMap, dryRun, results);
    await syncContextMappings(manifest, agentMap, dryRun, results);
    await syncExpertSkills(manifest, dryRun, results);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    printSummary(results, dryRun);
    console.log(`  Duration: ${elapsed}s\n`);

    return results;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const syncAll = args.includes('--all');

    // Filter out flags
    const positional = args.filter(a => !a.startsWith('--'));

    if (!syncAll && positional.length === 0) {
        console.log('Usage:');
        console.log('  node scripts/sync-skills.js marketing          # sync marketing dept');
        console.log('  node scripts/sync-skills.js marketing --dry-run # preview changes');
        console.log('  node scripts/sync-skills.js --all               # sync all depts');
        process.exit(0);
    }

    // Validate env
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
        process.exit(1);
    }

    if (syncAll) {
        // Find all manifest files
        const manifests = fs.readdirSync(SKILLS_DIR)
            .filter(f => f.endsWith('-manifest.json'))
            .map(f => f.replace('-manifest.json', ''));

        if (manifests.length === 0) {
            console.log('No manifest files found in .claude/skills/');
            process.exit(0);
        }

        console.log(`Found ${manifests.length} manifest(s): ${manifests.join(', ')}`);
        for (const dept of manifests) {
            await syncDepartment(dept, dryRun);
        }
    } else {
        await syncDepartment(positional[0], dryRun);
    }
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
