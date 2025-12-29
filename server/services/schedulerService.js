/**
 * INSIGHT 360 - Scheduler Service
 * Version: 1.0.0
 *
 * Handles cron scheduling for daily briefing generation.
 * Uses node-cron for job scheduling with timezone support.
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const briefingService = require('./briefingService');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Store active jobs: Map<userId, cronJob>
const activeJobs = new Map();

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
    updateNextRunTime
};
