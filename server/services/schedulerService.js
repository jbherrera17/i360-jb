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

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Store active jobs: Map<userId, cronJob>
const activeJobs = new Map();

// Store S2E health check jobs: Map<`${userId}-${type}`, cronJob>
const activeS2EJobs = new Map();

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
    getS2ESchedulerStatus
};
