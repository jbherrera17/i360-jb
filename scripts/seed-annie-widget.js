#!/usr/bin/env node
/**
 * Seed Annie widget for HealthyLifeCoach org
 * Run: node scripts/seed-annie-widget.js
 */

require('dotenv').config();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Use Synergi org for demo (platform tier, has module access)
// HealthyLifeCoach org not yet in DB — will be created when Jon onboards
const ORG_ID = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce';

async function seedWidget() {
    console.log('Creating Annie widget for HealthyLifeCoach...');

    // Generate HMAC token
    const widgetId = crypto.randomUUID();
    const tokenSecret = crypto.randomBytes(32).toString('hex');
    const widgetToken = crypto
        .createHmac('sha256', tokenSecret)
        .update(widgetId)
        .digest('hex');

    const { data: widget, error } = await supabase
        .from('chat_widgets')
        .insert({
            id: widgetId,
            org_id: ORG_ID,
            widget_name: 'Annie',
            widget_token: widgetToken,
            widget_token_secret: tokenSecret,
            cors_origins: ['*.railway.app', 'localhost:3000', '127.0.0.1:3000'],
            branding: {
                primary_color: '#1a5276',
                welcome_message: "Hi! I'm Annie, your AI assistant. I can help you learn about our cosmetic surgery procedures, recovery timelines, and preparation. How can I help you today?",
                avatar_url: null,
                disclaimer: 'This AI assistant provides general information only and does not replace professional medical advice.'
            },
            pre_chat_fields: {
                mode: 'lead_capture',
                fields: {
                    email: { enabled: true, required: true, label: 'Email', placeholder: 'your@email.com' },
                    name: { enabled: true, required: false, label: 'Name', placeholder: 'Your name' }
                },
                show_consent_checkbox: true
            },
            limits: {
                max_messages_per_session: 50,
                max_sessions_per_day: 500,
                max_messages_per_month: 10000,
                daily_llm_spend_cap: 5.00
            },
            consent_text: 'I agree to the [Privacy Policy] and understand I am chatting with an AI assistant.',
            data_retention_days: 90,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create widget:', error.message);
        process.exit(1);
    }

    console.log('\n✅ Widget created successfully!');
    console.log(`   Widget ID:    ${widget.id}`);
    console.log(`   Widget Token: ${widget.widget_token}`);
    console.log(`   Widget Name:  ${widget.widget_name}`);
    console.log(`   Org ID:       ${widget.org_id}`);

    console.log('\n📋 Embed code for demo pages:');
    console.log(`<script src="/js/chat-widget.js"
        data-widget-id="${widget.id}"
        data-token="${widget.widget_token}"></script>`);

    return widget;
}

async function seedContextAssets(orgId) {
    console.log('\nSeeding procedure context assets for knowledge base...');

    const procedures = [
        {
            name: 'Facelift (Rhytidectomy)',
            type: 'reference',
            description: 'Comprehensive information about facelift procedures',
            content_text: `# Facelift (Rhytidectomy)

## Overview
A facelift is one of the most effective procedures for addressing visible signs of aging in the face and neck. The procedure tightens underlying muscles, removes excess fat, and re-drapes the skin for a naturally refreshed appearance.

## Procedure Details
- Duration: 3-5 hours under general anesthesia
- Incisions placed along the hairline and around the ears to minimize visible scarring
- Addresses: sagging skin, deep creases, loss of muscle tone, jowling

## Recovery Timeline
- Week 1: Swelling and bruising are normal. Rest at home with head elevated.
- Week 2: Most patients return to light activities. Sutures removed.
- Week 3-4: Swelling continues to subside. Most social activities can resume.
- Month 3: Final results begin to emerge as all swelling resolves.

## Ideal Candidates
Patients experiencing moderate to advanced facial aging, including sagging skin, deep creases between nose and mouth, jowling along jawline, and loss of definition in chin and neck area.

## Combining Procedures
Often combined with neck lift, brow lift, or eyelid surgery for comprehensive facial rejuvenation.

## Consultation
Schedule a private consultation for a personalized assessment with our board-certified surgeon.`
        },
        {
            name: 'Rhinoplasty (Nose Reshaping)',
            type: 'reference',
            description: 'Comprehensive information about rhinoplasty procedures',
            content_text: `# Rhinoplasty (Nose Reshaping)

## Overview
Rhinoplasty reshapes the nose to improve facial harmony, correct breathing problems, or repair injury-related deformities. It is one of the most popular cosmetic procedures worldwide.

## Procedure Details
- Duration: 1.5-3 hours
- Open or closed technique depending on complexity
- Can address: bridge bumps, wide nostrils, drooping tip, asymmetry, deviated septum

## Recovery Timeline
- Week 1: Splint worn on nose. Bruising around eyes is common.
- Week 2: Splint removed. Most visible bruising fades.
- Week 3-4: Most swelling subsides. Return to normal activities.
- Month 6-12: Subtle refinement continues as tip swelling resolves completely.

## Revision Rhinoplasty
Secondary procedures are available for patients who have had previous nose surgery and want further refinement.

## Consultation
A thorough evaluation including analysis of facial proportions and breathing function.`
        },
        {
            name: 'Blepharoplasty (Eyelid Surgery)',
            type: 'reference',
            description: 'Comprehensive information about eyelid surgery',
            content_text: `# Blepharoplasty (Eyelid Surgery)

## Overview
Eyelid surgery removes excess skin and fat from the upper and/or lower eyelids, reducing droopiness and bags for a refreshed, alert appearance. Can also improve peripheral vision blocked by drooping upper lids.

## Procedure Details
- Duration: 1-2 hours
- Upper blepharoplasty: incision in the natural eyelid crease
- Lower blepharoplasty: incision just below lash line or inside the lid
- Can be performed under local anesthesia with sedation

## Recovery Timeline
- Days 1-3: Cold compresses to reduce swelling. Eyes may feel dry or gritty.
- Week 1: Sutures removed. Bruising begins to fade.
- Week 2: Most patients return to work and normal activities.
- Month 1: Final results visible.

## Ideal Candidates
Patients with drooping upper lids, puffy bags beneath the eyes, excess skin obscuring the natural fold, or fine wrinkles of the lower lid.

## Consultation
Includes thorough eye examination and discussion of realistic expectations.`
        },
        {
            name: 'Neck Lift (Lower Rhytidectomy)',
            type: 'reference',
            description: 'Comprehensive information about neck lift procedures',
            content_text: `# Neck Lift (Lower Rhytidectomy)

## Overview
A neck lift addresses sagging skin, excess fat, and muscle banding in the neck for a smoother, more defined jawline and profile. Often performed alongside a facelift for comprehensive rejuvenation.

## Procedure Details
- Duration: 2-4 hours
- Addresses: "turkey neck," double chin, muscle banding, excess skin
- Incisions behind the ears and potentially under the chin
- Platysma muscle may be tightened

## Recovery Timeline
- Week 1: Compression garment worn. Moderate swelling and bruising.
- Week 2: Return to light activities. Bruising fades.
- Week 3-4: Resume most normal activities.
- Month 2-3: Final results emerge.

## Ideal Candidates
Patients with loose neck skin, visible platysmal bands, excess fat beneath the chin, or loss of jawline definition.

## Consultation
Evaluation includes assessment of skin elasticity, fat deposits, and muscle tone.`
        },
        {
            name: 'Brow Lift (Forehead Lift)',
            type: 'reference',
            description: 'Comprehensive information about brow lift procedures',
            content_text: `# Brow Lift (Forehead Lift)

## Overview
A brow lift elevates drooping brows and smooths forehead creases for a more youthful, rested appearance. Modern techniques use minimally invasive endoscopic approaches.

## Procedure Details
- Duration: 1-2 hours
- Endoscopic technique: small incisions behind the hairline
- Addresses: forehead creases, drooping brows, frown lines, heavy upper eyelids caused by brow descent

## Recovery Timeline
- Week 1: Some numbness and swelling. Head should be elevated.
- Week 2: Most swelling resolves. Return to light activities.
- Week 3: Resume normal activities.
- Month 1-2: Final results visible.

## Ideal Candidates
Patients with low or sagging brows, deep horizontal forehead creases, or frown lines between the eyebrows.

## Often Combined With
- Eyelid surgery (blepharoplasty) for comprehensive eye rejuvenation
- Facelift for full facial rejuvenation

## Consultation
Assessment of brow position, forehead skin, and discussion of expected outcomes.`
        },
        {
            name: 'Practice General Information',
            type: 'reference',
            description: 'General practice information, scheduling, and contact details',
            content_text: `# Advanced Cosmetic Surgery & Laser Center

## About Us
Board-certified cosmetic surgery practice specializing in facial rejuvenation procedures. Our team combines surgical expertise with personalized patient care.

## Services Offered
- Facelift (Rhytidectomy)
- Rhinoplasty (Nose Reshaping)
- Blepharoplasty (Eyelid Surgery)
- Neck Lift
- Brow Lift
- Non-surgical treatments (Botox, fillers, laser treatments)

## Consultation Process
1. Schedule a consultation online or by phone
2. Meet with the surgeon for a personalized assessment
3. Receive a customized treatment plan
4. Review before-and-after photos of similar procedures
5. Discuss financing options if needed

## What to Bring to Your Consultation
- List of current medications
- Medical history summary
- Photos showing your areas of concern
- Questions about the procedure

## General Recovery Guidelines
- Follow all post-operative instructions carefully
- Attend all follow-up appointments
- Avoid strenuous activity as directed
- Keep incision areas clean and protected from sun
- Be patient — final results take weeks to months

## Important Notes
- All procedures require a consultation before scheduling
- Pricing is discussed during consultation based on individual needs
- We do not provide medical diagnoses via chat — always consult with the surgeon
- For emergencies, call 911 or visit your nearest emergency room`
        }
    ];

    for (const proc of procedures) {
        const { error } = await supabase
            .from('context_assets')
            .insert({
                org_id: orgId,
                name: proc.name,
                asset_type: proc.type,
                description: proc.description,
                content_text: proc.content_text,
                visibility: 'organization',
                is_current: true,
                tags: ['annie', 'procedures', 'widget-kb']
            });

        if (error) {
            console.log(`  ⚠️  ${proc.name}: ${error.message}`);
        } else {
            console.log(`  ✅ ${proc.name}`);
        }
    }
}

async function main() {
    try {
        const widget = await seedWidget();
        await seedContextAssets(ORG_ID);

        console.log('\n════════════════════════════════════════');
        console.log('  Annie widget is ready!');
        console.log('  Update demo pages with:');
        console.log(`  Widget ID: ${widget.id}`);
        console.log(`  Token:     ${widget.widget_token}`);
        console.log('════════════════════════════════════════\n');
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

main();
