/**
 * INSIGHT 360 - Scheduler Service
 * Version: 2.0.0
 *
 * Handles cron scheduling for:
 * - Daily briefing generation
 * - S2E health check generation (weekly/monthly)
 *
 * Uses node-cron for job scheduling with timezone support.
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const briefingService = require('./briefingService');
const s2eService = require('./s2eService');
const modelAvailabilityService = require('./modelAvailabilityService');
const linkedinService = require('./linkedinService');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Store active jobs: Map<userId, cronJob>
const activeJobs = new Map();

// Store S2E health check jobs: Map<`${userId}-${type}`, cronJob>
const activeS2EJobs = new Map();

// Store publishing jobs: Map<publicationId, timeoutId>
const activePublishingJobs = new Map();

// Scheduler status
let isInitialized = false;
let initializationError = null;

/**
 * Parse time string (HH:MM:SS or HH:MM) to cron expression
 * @param {string} timeStr - Time in HH:MM:SS format
 * @returns {string} - Cron expression for daily at that time
 */
function timeToCron(timeStr) {
    const [hour, minute] = timeStr.split(':');
    // Cron format: minute hour * * * (every day at specified time)
    return `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;
}

/**
 * Generate a briefing for a user (called by cron job)
 * @param {string} userId - User ID
 */
async function generateBriefingForUser(userId) {
    console.log(`[Scheduler] Starting scheduled briefing for user ${userId}`);
    const startTime = Date.now();

    try {
        const briefing = await briefingService.generateBriefing(userId, {
            onSectionStart: ({ name, index, total }) => {
                console.log(`[Scheduler] User ${userId}: Generating section ${index + 1}/${total} - ${name}`);
            },
            onSectionComplete: ({ section, index, total }) => {
                console.log(`[Scheduler] User ${userId}: Completed section ${section.name} (${section.status})`);
            }
        });

        const duration = Date.now() - startTime;
        console.log(`[Scheduler] Completed briefing for user ${userId} in ${duration}ms (status: ${briefing.status})`);

        // Update next run time
        await updateNextRunTime(userId);

        return briefing;
    } catch (error) {
        console.error(`[Scheduler] Error generating briefing for user ${userId}:`, error);

        // Update config with error status
        await supabase
            .from('briefing_configs')
            .update({
                last_run_at: new Date().toISOString(),
                last_run_status: 'failed'
            })
            .eq('user_id', userId);

        throw error;
    }
}

/**
 * Calculate and update the next run time for a user
 * @param {string} userId - User ID
 */
async function updateNextRunTime(userId) {
    const { data: config } = await supabase
        .from('briefing_configs')
        .select('schedule_time, timezone')
        .eq('user_id', userId)
        .single();

    if (!config) return;

    // Calculate next run time (tomorrow at schedule_time)
    const now = new Date();
    const [hour, minute] = config.schedule_time.split(':');

    const nextRun = new Date();
    nextRun.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);

    // If it's past today's scheduled time, set to tomorrow
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    await supabase
        .from('briefing_configs')
        .update({ next_run_at: nextRun.toISOString() })
        .eq('user_id', userId);
}

/**
 * Schedule a briefing for a specific user
 * @param {string} userId - User ID
 * @param {string} scheduleTime - Time in HH:MM:SS format
 * @param {string} timezone - Timezone string (e.g., 'America/New_York')
 */
function scheduleUserBriefing(userId, scheduleTime, timezone = 'America/New_York') {
    // Cancel existing job if any
    if (activeJobs.has(userId)) {
        console.log(`[Scheduler] Cancelling existing job for user ${userId}`);
        activeJobs.get(userId).stop();
        activeJobs.delete(userId);
    }

    // Create cron expression
    const cronExpression = timeToCron(scheduleTime);

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
        console.error(`[Scheduler] Invalid cron expression: ${cronExpression} for time ${scheduleTime}`);
        return false;
    }

    console.log(`[Scheduler] Scheduling briefing for user ${userId} at ${scheduleTime} (${timezone}) - cron: ${cronExpression}`);

    // Create the cron job
    const job = cron.schedule(cronExpression, async () => {
        try {
            await generateBriefingForUser(userId);
        } catch (error) {
            // Error already logged in generateBriefingForUser
        }
    }, {
        timezone,
        scheduled: true
    });

    // Store the job
    activeJobs.set(userId, job);

    // Update next run time
    updateNextRunTime(userId);

    return true;
}

/**
 * Cancel a scheduled briefing for a user
 * @param {string} userId - User ID
 */
function cancelSchedule(userId) {
    if (activeJobs.has(userId)) {
        console.log(`[Scheduler] Cancelling schedule for user ${userId}`);
        activeJobs.get(userId).stop();
        activeJobs.delete(userId);

        // Clear next run time
        supabase
            .from('briefing_configs')
            .update({ next_run_at: null })
            .eq('user_id', userId);

        return true;
    }
    return false;
}

/**
 * Initialize the scheduler - load all enabled briefing configs
 * Should be called on server startup after Supabase is initialized
 */
async function initializeScheduler() {
    console.log('[Scheduler] Initializing briefing scheduler...');

    try {
        // Load all enabled briefing configs
        const { data: configs, error } = await supabase
            .from('briefing_configs')
            .select('user_id, schedule_time, timezone')
            .eq('is_enabled', true);

        if (error) {
            throw error;
        }

        if (!configs || configs.length === 0) {
            console.log('[Scheduler] No enabled briefing configs found');
            isInitialized = true;
            return;
        }

        console.log(`[Scheduler] Found ${configs.length} enabled briefing config(s)`);

        // Schedule each user's briefing
        let scheduled = 0;
        for (const config of configs) {
            const success = scheduleUserBriefing(
                config.user_id,
                config.schedule_time,
                config.timezone
            );
            if (success) scheduled++;
        }

        console.log(`[Scheduler] Successfully scheduled ${scheduled}/${configs.length} briefings`);
        isInitialized = true;

        // Initialize model availability scheduler
        try {
            await modelAvailabilityService.initializeScheduler();
            console.log('[Scheduler] ✅ Model availability scheduler initialized');
        } catch (modelError) {
            console.error('[Scheduler] Failed to initialize model availability scheduler:', modelError);
            // Don't throw - model availability scheduling is not critical
        }
    } catch (error) {
        console.error('[Scheduler] Failed to initialize:', error);
        initializationError = error;
        throw error;
    }
}

/**
 * Reload all schedules from database
 * Useful after bulk updates to briefing configs
 */
async function rescheduleAll() {
    console.log('[Scheduler] Reloading all schedules...');

    // Stop all current jobs
    for (const [userId, job] of activeJobs) {
        job.stop();
    }
    activeJobs.clear();

    // Re-initialize
    await initializeScheduler();
}

/**
 * Get scheduler status for health checks
 * @returns {Object} - Scheduler status information
 */
function getSchedulerStatus() {
    return {
        initialized: isInitialized,
        error: initializationError?.message || null,
        activeJobs: activeJobs.size,
        jobs: Array.from(activeJobs.keys()).map(userId => ({
            userId,
            running: true
        }))
    };
}

/**
 * Get schedule info for a specific user
 * @param {string} userId - User ID
 * @returns {Object|null} - Schedule info or null
 */
function getUserScheduleInfo(userId) {
    const hasJob = activeJobs.has(userId);
    return {
        scheduled: hasJob,
        userId
    };
}

/**
 * Manually trigger a briefing for a user (bypasses schedule)
 * @param {string} userId - User ID
 * @returns {Object} - Generated briefing
 */
async function triggerManualBriefing(userId) {
    console.log(`[Scheduler] Manual briefing triggered for user ${userId}`);
    return generateBriefingForUser(userId);
}

/**
 * Shutdown the scheduler - stop all jobs
 * Call this on server shutdown
 */
function shutdownScheduler() {
    console.log('[Scheduler] Shutting down...');
    for (const [userId, job] of activeJobs) {
        job.stop();
    }
    activeJobs.clear();
    isInitialized = false;
    console.log('[Scheduler] Shutdown complete');
}

// ============================================================================
// S2E HEALTH CHECK SCHEDULING
// ============================================================================

/**
 * Generate a health check for a user (called by cron job)
 * @param {string} userId - User ID
 * @param {string} checkType - 'weekly' or 'monthly'
 */
async function generateHealthCheckForUser(userId, checkType) {
    console.log(`[Scheduler] Starting scheduled ${checkType} health check for user ${userId}`);
    const startTime = Date.now();

    try {
        // Get current foundation for user
        const foundation = await s2eService.getCurrentFoundationWithHierarchy(userId);

        if (!foundation) {
            console.log(`[Scheduler] User ${userId} has no current foundation, skipping health check`);
            return null;
        }

        // Generate the health check
        const healthCheck = await s2eService.generateHealthCheck(userId, foundation.id, checkType);

        const duration = Date.now() - startTime;
        console.log(`[Scheduler] Completed ${checkType} health check for user ${userId} in ${duration}ms`);

        // Update schedule config
        const updateField = checkType === 'weekly' ? 'last_weekly_run' : 'last_monthly_run';
        await supabase
            .from('s2e_schedule_config')
            .update({ [updateField]: new Date().toISOString() })
            .eq('user_id', userId);

        return healthCheck;
    } catch (error) {
        console.error(`[Scheduler] Error generating ${checkType} health check for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Schedule S2E health checks for a user
 * @param {string} userId - User ID
 * @param {Object} config - Schedule configuration
 * @param {string} timezone - Timezone string
 */
function scheduleS2EHealthChecks(userId, config, timezone = 'America/New_York') {
    // Cancel existing S2E jobs for this user
    cancelS2ESchedule(userId);

    // Schedule weekly check if enabled (default: Monday at 9 AM)
    if (config.weekly_enabled) {
        const weeklyDay = config.weekly_day || 1; // 0 = Sunday, 1 = Monday, etc.
        const weeklyCron = `0 9 * * ${weeklyDay}`; // 9:00 AM on specified day

        if (cron.validate(weeklyCron)) {
            console.log(`[Scheduler] Scheduling weekly S2E health check for user ${userId} (cron: ${weeklyCron})`);

            const weeklyJob = cron.schedule(weeklyCron, async () => {
                try {
                    await generateHealthCheckForUser(userId, 'weekly');
                } catch (error) {
                    // Error already logged
                }
            }, {
                timezone,
                scheduled: true
            });

            activeS2EJobs.set(`${userId}-weekly`, weeklyJob);
        }
    }

    // Schedule monthly check if enabled (default: 1st of month at 9 AM)
    if (config.monthly_enabled) {
        const monthlyDay = config.monthly_day || 1;
        const monthlyCron = `0 9 ${monthlyDay} * *`; // 9:00 AM on specified day of month

        if (cron.validate(monthlyCron)) {
            console.log(`[Scheduler] Scheduling monthly S2E health check for user ${userId} (cron: ${monthlyCron})`);

            const monthlyJob = cron.schedule(monthlyCron, async () => {
                try {
                    await generateHealthCheckForUser(userId, 'monthly');
                } catch (error) {
                    // Error already logged
                }
            }, {
                timezone,
                scheduled: true
            });

            activeS2EJobs.set(`${userId}-monthly`, monthlyJob);
        }
    }

    return true;
}

/**
 * Cancel S2E health check schedules for a user
 * @param {string} userId - User ID
 */
function cancelS2ESchedule(userId) {
    let cancelled = 0;

    // Cancel weekly job
    const weeklyKey = `${userId}-weekly`;
    if (activeS2EJobs.has(weeklyKey)) {
        activeS2EJobs.get(weeklyKey).stop();
        activeS2EJobs.delete(weeklyKey);
        cancelled++;
    }

    // Cancel monthly job
    const monthlyKey = `${userId}-monthly`;
    if (activeS2EJobs.has(monthlyKey)) {
        activeS2EJobs.get(monthlyKey).stop();
        activeS2EJobs.delete(monthlyKey);
        cancelled++;
    }

    if (cancelled > 0) {
        console.log(`[Scheduler] Cancelled ${cancelled} S2E job(s) for user ${userId}`);
    }

    return cancelled > 0;
}

/**
 * Initialize S2E health check scheduler
 * Loads all enabled S2E schedule configs
 */
async function initializeS2EScheduler() {
    console.log('[Scheduler] Initializing S2E health check scheduler...');

    try {
        // Load all S2E schedule configs where at least one is enabled
        const { data: configs, error } = await supabase
            .from('s2e_schedule_config')
            .select('*')
            .or('weekly_enabled.eq.true,monthly_enabled.eq.true');

        if (error) {
            // Table might not exist yet - not a fatal error
            if (error.code === '42P01') {
                console.log('[Scheduler] S2E schedule config table not found, skipping');
                return;
            }
            throw error;
        }

        if (!configs || configs.length === 0) {
            console.log('[Scheduler] No enabled S2E health check configs found');
            return;
        }

        console.log(`[Scheduler] Found ${configs.length} enabled S2E health check config(s)`);

        // Schedule each user's health checks
        let scheduled = 0;
        for (const config of configs) {
            const success = scheduleS2EHealthChecks(
                config.user_id,
                config,
                config.timezone || 'America/New_York'
            );
            if (success) scheduled++;
        }

        console.log(`[Scheduler] Successfully scheduled S2E health checks for ${scheduled} user(s)`);
    } catch (error) {
        console.error('[Scheduler] Failed to initialize S2E scheduler:', error);
        // Don't throw - S2E scheduling is not critical
    }
}

/**
 * Get S2E scheduler status
 * @returns {Object} - S2E scheduler status
 */
function getS2ESchedulerStatus() {
    const jobs = [];
    for (const [key, job] of activeS2EJobs) {
        const [userId, type] = key.split('-');
        jobs.push({ userId, type, running: true });
    }

    return {
        activeJobs: activeS2EJobs.size,
        jobs
    };
}

/**
 * Manually trigger a health check for a user
 * @param {string} userId - User ID
 * @param {string} checkType - 'weekly', 'monthly', or 'adhoc'
 * @returns {Object} - Generated health check
 */
async function triggerManualHealthCheck(userId, checkType = 'adhoc') {
    console.log(`[Scheduler] Manual ${checkType} health check triggered for user ${userId}`);
    return generateHealthCheckForUser(userId, checkType);
}

// ============================================================================
// OPTIMAL POSTING TIME LOGIC
// ============================================================================

/**
 * Optimal posting times by platform and content type (in local timezone)
 * Based on B2B social media engagement research
 */
const OPTIMAL_POSTING_TIMES = {
    linkedin: {
        article: {
            preferredDays: [2, 3, 4],  // Tuesday, Wednesday, Thursday
            preferredHours: [8, 9],     // 8-9 AM
            alternativeHours: [11, 12], // 11 AM - 12 PM
            avoidDays: [0, 6],          // Sunday, Saturday
            avoidHours: [0, 1, 2, 3, 4, 5, 22, 23]  // Late night/early morning
        },
        linkedin_post: {
            preferredDays: [2, 3],      // Tuesday, Wednesday
            preferredHours: [10, 11],   // 10-11 AM
            alternativeHours: [8, 9, 14, 15],  // 8-9 AM or 2-3 PM
            avoidDays: [0, 6],
            avoidHours: [0, 1, 2, 3, 4, 5, 22, 23]
        },
        default: {
            preferredDays: [2, 3, 4],
            preferredHours: [9, 10],
            alternativeHours: [8, 11, 14],
            avoidDays: [0, 6],
            avoidHours: [0, 1, 2, 3, 4, 5, 22, 23]
        }
    },
    x: {
        default: {
            preferredDays: [1, 2, 3, 4],  // Monday-Thursday
            preferredHours: [9, 12, 17],   // 9 AM, 12 PM, 5 PM
            alternativeHours: [8, 10, 11, 13, 14, 15, 16, 18],
            avoidDays: [0, 6],
            avoidHours: [0, 1, 2, 3, 4, 5, 6, 23]
        }
    }
};

/**
 * Get the next optimal posting time for a given platform and content type
 *
 * @param {string} platform - Platform (linkedin, x, etc.)
 * @param {string} timezone - User's timezone
 * @param {string} contentType - Type of content (article, linkedin_post, etc.)
 * @returns {Object} - { recommendedTime, reason, alternatives }
 */
function getOptimalPublishTime(platform, timezone = 'America/New_York', contentType = 'default') {
    const platformConfig = OPTIMAL_POSTING_TIMES[platform] || OPTIMAL_POSTING_TIMES.linkedin;
    const config = platformConfig[contentType] || platformConfig.default;

    // Get current time in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === 'hour').value);
    const currentDay = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getDay();

    // Find next optimal slot
    let recommendedDate = new Date(now);
    let daysToAdd = 0;
    let selectedHour = config.preferredHours[0];
    let reason = '';

    // Check if we can schedule today
    const todayIsPreferred = config.preferredDays.includes(currentDay);
    const todayIsNotAvoided = !config.avoidDays.includes(currentDay);

    if (todayIsPreferred) {
        // Find next preferred hour today
        const nextHourToday = config.preferredHours.find(h => h > currentHour);
        if (nextHourToday) {
            selectedHour = nextHourToday;
            reason = `${getDayName(currentDay)} ${selectedHour}:00 - peak ${platform} engagement window`;
        }
    }

    if (!reason && todayIsNotAvoided) {
        // Try alternative hours today
        const nextAltHour = config.alternativeHours.find(h => h > currentHour);
        if (nextAltHour) {
            selectedHour = nextAltHour;
            reason = `${getDayName(currentDay)} ${selectedHour}:00 - good engagement window`;
        }
    }

    // If nothing found today, find next preferred day
    if (!reason) {
        for (let i = 1; i <= 7; i++) {
            const checkDay = (currentDay + i) % 7;
            if (config.preferredDays.includes(checkDay)) {
                daysToAdd = i;
                selectedHour = config.preferredHours[0];
                reason = `${getDayName(checkDay)} ${selectedHour}:00 - peak B2B engagement for ${platform}`;
                break;
            }
        }
    }

    // Fallback to next non-avoided day
    if (!reason) {
        for (let i = 1; i <= 7; i++) {
            const checkDay = (currentDay + i) % 7;
            if (!config.avoidDays.includes(checkDay)) {
                daysToAdd = i;
                selectedHour = config.alternativeHours[0] || 10;
                reason = `${getDayName(checkDay)} ${selectedHour}:00 - reasonable engagement window`;
                break;
            }
        }
    }

    // Calculate recommended time
    recommendedDate.setDate(recommendedDate.getDate() + daysToAdd);
    recommendedDate.setHours(selectedHour, 0, 0, 0);

    // Generate alternatives
    const alternatives = [];

    // Alternative 1: Different hour same day (if preferred day)
    if (config.preferredDays.includes((currentDay + daysToAdd) % 7)) {
        const altHour = config.alternativeHours.find(h => h !== selectedHour);
        if (altHour) {
            const altDate = new Date(recommendedDate);
            altDate.setHours(altHour, 0, 0, 0);
            alternatives.push({
                time: altDate.toISOString(),
                reason: `Alternative time slot - ${altHour}:00`
            });
        }
    }

    // Alternative 2: Next preferred day
    const nextPreferredDay = config.preferredDays.find(d => d > (currentDay + daysToAdd) % 7);
    if (nextPreferredDay !== undefined) {
        const daysUntilNext = (nextPreferredDay - currentDay + 7) % 7 || 7;
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + daysUntilNext);
        nextDate.setHours(config.preferredHours[0], 0, 0, 0);
        alternatives.push({
            time: nextDate.toISOString(),
            reason: `${getDayName(nextPreferredDay)} morning - another peak engagement window`
        });
    }

    return {
        recommendedTime: recommendedDate.toISOString(),
        reason,
        alternatives: alternatives.slice(0, 2),
        timezone,
        platform,
        contentType
    };
}

/**
 * Helper to get day name from day number
 */
function getDayName(dayNum) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
}

// ============================================================================
// PUBLISHING SCHEDULER
// ============================================================================

/**
 * Initialize the publishing scheduler - load all scheduled publications
 */
async function initializePublishingScheduler() {
    console.log('[Scheduler] Initializing publishing scheduler...');

    try {
        // Load all scheduled publications
        const { data: scheduled, error } = await supabase
            .from('scheduled_publications')
            .select('*')
            .eq('status', 'scheduled')
            .gte('scheduled_at', new Date().toISOString());

        if (error) throw error;

        let scheduledCount = 0;
        for (const pub of scheduled || []) {
            schedulePublication(pub);
            scheduledCount++;
        }

        console.log(`[Scheduler] Loaded ${scheduledCount} scheduled publication(s)`);
    } catch (error) {
        console.error('[Scheduler] Failed to initialize publishing scheduler:', error);
    }
}

/**
 * Schedule a publication for future execution
 * @param {Object} publication - Publication record from database
 */
function schedulePublication(publication) {
    const scheduledTime = new Date(publication.scheduled_at);
    const now = new Date();

    // If already past, execute immediately
    if (scheduledTime <= now) {
        console.log(`[Scheduler] Publication ${publication.id} is past due, executing now`);
        executePublication(publication.id);
        return;
    }

    const delay = scheduledTime.getTime() - now.getTime();
    console.log(`[Scheduler] Scheduling publication ${publication.id} for ${scheduledTime.toISOString()} (${Math.round(delay / 60000)} min)`);

    const timeoutId = setTimeout(() => {
        executePublication(publication.id);
    }, delay);

    activePublishingJobs.set(publication.id, timeoutId);
}

/**
 * Execute a scheduled publication
 * @param {string} publicationId - Publication ID
 */
async function executePublication(publicationId) {
    console.log(`[Scheduler] Executing publication ${publicationId}`);

    try {
        // Get publication details
        const { data: pub, error: fetchError } = await supabase
            .from('scheduled_publications')
            .select('*')
            .eq('id', publicationId)
            .single();

        if (fetchError || !pub) {
            console.error(`[Scheduler] Publication ${publicationId} not found`);
            return;
        }

        if (pub.status !== 'scheduled') {
            console.log(`[Scheduler] Publication ${publicationId} status is ${pub.status}, skipping`);
            return;
        }

        // Update status to publishing
        await supabase
            .from('scheduled_publications')
            .update({ status: 'publishing', updated_at: new Date().toISOString() })
            .eq('id', publicationId);

        let result;
        let errorMessage = null;

        try {
            switch (pub.platform) {
                case 'linkedin':
                    result = await linkedinService.publishPost(pub.user_id, pub.content_text, {
                        imageUrl: pub.media_urls?.[0],
                        articleUrl: pub.content_json?.articleUrl,
                        articleTitle: pub.content_json?.articleTitle
                    });
                    break;

                // Future platforms
                case 'x':
                case 'substack':
                    throw new Error(`${pub.platform} publishing not yet implemented`);

                default:
                    throw new Error(`Unknown platform: ${pub.platform}`);
            }

            // Success - update publication record
            await supabase
                .from('scheduled_publications')
                .update({
                    status: 'published',
                    published_at: new Date().toISOString(),
                    published_url: result.postUrl,
                    platform_post_id: result.postId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', publicationId);

            // Add to publication history
            await supabase
                .from('publication_history')
                .insert({
                    scheduled_publication_id: publicationId,
                    user_id: pub.user_id,
                    calendar_entry_id: pub.calendar_entry_id,
                    platform: pub.platform,
                    content_type: pub.content_type,
                    published_at: new Date().toISOString(),
                    published_url: result.postUrl,
                    platform_post_id: result.postId,
                    content_preview: pub.content_text.substring(0, 500),
                    media_count: pub.media_urls?.length || 0
                });

            console.log(`[Scheduler] Publication ${publicationId} completed successfully`);

        } catch (publishError) {
            errorMessage = publishError.message;
            console.error(`[Scheduler] Publication ${publicationId} failed:`, publishError);

            const retryCount = (pub.retry_count || 0) + 1;
            const maxRetries = pub.max_retries || 3;

            if (retryCount < maxRetries) {
                // Schedule retry in 5 minutes
                const retryAt = new Date(Date.now() + 5 * 60 * 1000);

                await supabase
                    .from('scheduled_publications')
                    .update({
                        status: 'scheduled',
                        scheduled_at: retryAt.toISOString(),
                        retry_count: retryCount,
                        last_retry_at: new Date().toISOString(),
                        error_message: errorMessage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', publicationId);

                console.log(`[Scheduler] Publication ${publicationId} scheduled for retry ${retryCount}/${maxRetries}`);

                // Schedule the retry
                schedulePublication({
                    ...pub,
                    scheduled_at: retryAt.toISOString(),
                    retry_count: retryCount
                });
            } else {
                // Max retries reached
                await supabase
                    .from('scheduled_publications')
                    .update({
                        status: 'failed',
                        error_message: errorMessage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', publicationId);

                console.log(`[Scheduler] Publication ${publicationId} failed after ${maxRetries} retries`);
            }
        }

    } catch (error) {
        console.error(`[Scheduler] Error executing publication ${publicationId}:`, error);
    } finally {
        activePublishingJobs.delete(publicationId);
    }
}

/**
 * Cancel a scheduled publication
 * @param {string} publicationId - Publication ID
 */
async function cancelScheduledPublication(publicationId) {
    // Cancel the timeout
    if (activePublishingJobs.has(publicationId)) {
        clearTimeout(activePublishingJobs.get(publicationId));
        activePublishingJobs.delete(publicationId);
    }

    // Update database
    const { error } = await supabase
        .from('scheduled_publications')
        .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
        })
        .eq('id', publicationId);

    if (error) throw error;

    console.log(`[Scheduler] Publication ${publicationId} cancelled`);
    return { success: true };
}

/**
 * Create and schedule a new publication
 * @param {Object} options - Publication options
 */
async function createScheduledPublication(options) {
    const {
        userId,
        calendarEntryId,
        outputId,
        platform,
        scheduledAt,
        timezone = 'America/New_York',
        contentType,
        contentText,
        contentJson,
        mediaUrls,
        wasOptimalTime = false,
        optimalTimeReason = null
    } = options;

    const { data, error } = await supabase
        .from('scheduled_publications')
        .insert({
            user_id: userId,
            calendar_entry_id: calendarEntryId,
            output_id: outputId,
            platform,
            scheduled_at: scheduledAt,
            timezone,
            content_type: contentType,
            content_text: contentText,
            content_json: contentJson,
            media_urls: mediaUrls,
            was_optimal_time: wasOptimalTime,
            optimal_time_reason: optimalTimeReason,
            status: 'scheduled'
        })
        .select()
        .single();

    if (error) throw error;

    // Schedule the job
    schedulePublication(data);

    console.log(`[Scheduler] Created publication ${data.id} for ${scheduledAt}`);
    return data;
}

/**
 * Get publishing scheduler status
 */
function getPublishingSchedulerStatus() {
    return {
        activeJobs: activePublishingJobs.size,
        jobIds: Array.from(activePublishingJobs.keys())
    };
}

module.exports = {
    // Core scheduling
    initializeScheduler,
    scheduleUserBriefing,
    cancelSchedule,
    rescheduleAll,
    shutdownScheduler,

    // Manual triggers
    triggerManualBriefing,
    generateBriefingForUser,

    // Status
    getSchedulerStatus,
    getUserScheduleInfo,

    // Utilities
    timeToCron,
    updateNextRunTime,

    // S2E Health Check Scheduling
    initializeS2EScheduler,
    scheduleS2EHealthChecks,
    cancelS2ESchedule,
    generateHealthCheckForUser,
    triggerManualHealthCheck,
    getS2ESchedulerStatus,

    // Publishing Scheduling (NEW)
    initializePublishingScheduler,
    getOptimalPublishTime,
    schedulePublication,
    executePublication,
    cancelScheduledPublication,
    createScheduledPublication,
    getPublishingSchedulerStatus
};
