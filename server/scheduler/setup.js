/**
 * Scheduler initialization.
 *
 * Kicks off background cron jobs after Supabase is available. Each scheduler
 * runs independently and is non-blocking — failures are logged but do not
 * prevent the server from starting.
 */

const schedulerService = require('../services/schedulerService');

function initializeSchedulers() {
    schedulerService.initializeScheduler()
        .then(() => console.log('  ✅ Briefing scheduler initialized'))
        .catch(err => console.error('  ⚠️ Briefing scheduler failed:', err.message));

    // LLM health monitoring (5-minute checks)
    const modelAvailabilityService = require('../services/modelAvailabilityService');
    modelAvailabilityService.initializeScheduler()
        .then(() => console.log('  ✅ LLM health monitoring initialized (5-min interval)'))
        .catch(err => console.error('  ⚠️ LLM health monitoring failed:', err.message));

    schedulerService.initializePublishingScheduler()
        .then(() => console.log('  ✅ Publishing scheduler initialized'))
        .catch(err => console.error('  ⚠️ Publishing scheduler failed:', err.message));

    // Phase 73 FR-06: Widget Sheets sync (every 15 min)
    schedulerService.initializeWidgetSheetsSync()
        .then(() => console.log('  ✅ Widget Sheets sync initialized (15-min interval)'))
        .catch(err => console.error('  ⚠️ Widget Sheets sync failed:', err.message));

    // Phase 73 R-06: Widget data retention cleanup (daily at 3 AM)
    schedulerService.initializeWidgetDataCleanup()
        .then(() => console.log('  ✅ Widget data retention cleanup initialized (daily)'))
        .catch(err => console.error('  ⚠️ Widget data cleanup failed:', err.message));
}

module.exports = { initializeSchedulers };
