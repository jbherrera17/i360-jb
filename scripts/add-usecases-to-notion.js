#!/usr/bin/env node

/**
 * Script to add RecCenter Manager Use Cases to Notion
 * Full fidelity version - preserves all details from use-cases.md
 */

require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
  console.error('Missing NOTION_API_KEY or NOTION_PAGE_ID in environment');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28'
};

// Helper functions for creating Notion blocks

function createRichText(text, bold = false) {
  return {
    type: 'text',
    text: { content: text },
    annotations: { bold }
  };
}

function createTextBlock(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: text } }]
    }
  };
}

function createBoldLabelBlock(label, value) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        createRichText(label, true),
        createRichText(' ' + value)
      ]
    }
  };
}

function createHeading1(text) {
  return {
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: text } }]
    }
  };
}

function createHeading2(text) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: text } }]
    }
  };
}

function createHeading3(text) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [{ type: 'text', text: { content: text } }]
    }
  };
}

function createBulletItem(text, bold = false) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [createRichText(text, bold)]
    }
  };
}

function createBulletWithBoldLabel(label, value) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        createRichText(label, true),
        createRichText(' ' + value)
      ]
    }
  };
}

function createNumberedItem(text) {
  return {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: [{ type: 'text', text: { content: text } }]
    }
  };
}

function createDivider() {
  return { object: 'block', type: 'divider', divider: {} };
}

function createCallout(text, emoji = '📋') {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: text } }],
      icon: { type: 'emoji', emoji: emoji }
    }
  };
}

function createTable(headers, rows) {
  const tableWidth = headers.length;
  const children = [];

  children.push({
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: headers.map(h => [{ type: 'text', text: { content: h } }])
    }
  });

  rows.forEach(row => {
    children.push({
      object: 'block',
      type: 'table_row',
      table_row: {
        cells: row.map(cell => [{ type: 'text', text: { content: cell } }])
      }
    });
  });

  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: tableWidth,
      has_column_header: true,
      has_row_header: false,
      children: children
    }
  };
}

function createToggle(title, children) {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: [{ type: 'text', text: { content: title } }],
      children: children
    }
  };
}

// Build the full fidelity use cases content
function buildUseCasesBlocks() {
  const blocks = [];

  // Title
  blocks.push(createHeading1('RecCenter Manager - Use Cases'));

  // Document Information
  blocks.push(createHeading2('Document Information'));
  blocks.push(createBulletWithBoldLabel('Project:', 'RecCenter Manager (Wint\'s Recreation Facility)'));
  blocks.push(createBulletWithBoldLabel('Version:', '1.0'));
  blocks.push(createBulletWithBoldLabel('Date:', 'December 28, 2024'));
  blocks.push(createBulletWithBoldLabel('Status:', 'Requirements Gathering'));

  blocks.push(createDivider());

  // Actors section
  blocks.push(createHeading2('Actors'));
  blocks.push(createTable(
    ['Actor', 'Description'],
    [
      ['Owner/Admin (Wint)', 'Business owner with full system access; views analytics, approves payroll, manages billing'],
      ['Office Staff/Assistant', 'Handles day-to-day scheduling, client communications, data entry'],
      ['Coach', 'Multi-functional staff member who teaches swimming, fitness, basketball; logs time and attendance'],
      ['Client (Direct Pay)', 'Individual or family member paying directly for services'],
      ['Client (Regional Center)', 'Neurodivergent individual whose services are funded by government Regional Center'],
      ['Regional Center', 'Government funding entity requiring specific attendance documentation and billing format']
    ]
  ));

  blocks.push(createDivider());

  // Use Case Categories
  blocks.push(createHeading2('Use Case Categories'));
  blocks.push(createNumberedItem('Scheduling & Booking'));
  blocks.push(createNumberedItem('Time Tracking & Payroll'));
  blocks.push(createNumberedItem('Client & Membership Management'));
  blocks.push(createNumberedItem('Government Billing (Regional Center)'));
  blocks.push(createNumberedItem('Financial Analytics'));
  blocks.push(createNumberedItem('Staff Management'));

  blocks.push(createDivider());

  // ============================================
  // 1. SCHEDULING & BOOKING
  // ============================================
  blocks.push(createHeading2('1. Scheduling & Booking'));

  // UC-1.1: View Master Schedule
  blocks.push(createHeading3('UC-1.1: View Master Schedule'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff, Owner, Coach'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'User is authenticated'));
  blocks.push(createBoldLabelBlock('Description:', 'View the consolidated master schedule showing all bookings across pool lanes, gym spaces, and basketball court.'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('User navigates to Schedule view'));
  blocks.push(createNumberedItem('System displays calendar/grid view with:'));
  blocks.push(createBulletItem('Pool lanes (1-5) with time slots'));
  blocks.push(createBulletItem('Gym/fitness room availability'));
  blocks.push(createBulletItem('Basketball court availability'));
  blocks.push(createNumberedItem('User can filter by:'));
  blocks.push(createBulletItem('Date range'));
  blocks.push(createBulletItem('Service type (swim, fitness, basketball)'));
  blocks.push(createBulletItem('Coach'));
  blocks.push(createBulletItem('Client type (direct pay vs. Regional Center)'));
  blocks.push(createNumberedItem('Color coding indicates:'));
  blocks.push(createBulletItem('Permanent/recurring bookings'));
  blocks.push(createBulletItem('One-time bookings'));
  blocks.push(createBulletItem('Available slots'));
  blocks.push(createBulletItem('Blocked/maintenance time'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'User sees accurate real-time availability'));
  blocks.push(createBoldLabelBlock('Business Rule:', 'Permanent bookings from Wellness Living sync automatically and are visually distinguished'));

  blocks.push(createDivider());

  // UC-1.2: Book a Private Lesson
  blocks.push(createHeading3('UC-1.2: Book a Private Lesson'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff'));
  blocks.push(createTextBlock('Preconditions:'));
  blocks.push(createBulletItem('Client exists in system'));
  blocks.push(createBulletItem('Coach is available'));
  blocks.push(createBulletItem('Lane/space is available'));
  blocks.push(createBoldLabelBlock('Description:', 'Schedule a private lesson (swim, fitness, or basketball)'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Staff selects date/time on schedule'));
  blocks.push(createNumberedItem('Staff selects service type'));
  blocks.push(createNumberedItem('System shows available coaches qualified for that service'));
  blocks.push(createNumberedItem('Staff selects coach'));
  blocks.push(createNumberedItem('Staff searches for client'));
  blocks.push(createNumberedItem('System shows client\'s:'));
  blocks.push(createBulletItem('Billing type (direct/Regional Center)'));
  blocks.push(createBulletItem('Any scheduling preferences or notes'));
  blocks.push(createBulletItem('Cancellation history'));
  blocks.push(createNumberedItem('Staff confirms booking'));
  blocks.push(createNumberedItem('System creates booking and sends confirmation'));

  blocks.push(createTextBlock('Alternative Flow - Regional Center Client:'));
  blocks.push(createBulletItem('Step 6a: System displays authorized hours remaining'));
  blocks.push(createBulletItem('Step 6b: System warns if booking exceeds authorization'));

  blocks.push(createTextBlock('Postconditions:'));
  blocks.push(createBulletItem('Booking appears on master schedule'));
  blocks.push(createBulletItem('Coach sees booking on their schedule'));
  blocks.push(createBulletItem('Client receives confirmation'));

  blocks.push(createDivider());

  // UC-1.3: Book a Group Class
  blocks.push(createHeading3('UC-1.3: Book a Group Class'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Group class template exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Enroll client(s) in a recurring group class'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Staff selects group class from class list'));
  blocks.push(createNumberedItem('System shows:'));
  blocks.push(createBulletItem('Current enrollment count'));
  blocks.push(createBulletItem('Maximum capacity'));
  blocks.push(createBulletItem('Enrolled participants'));
  blocks.push(createNumberedItem('Staff adds client to class'));
  blocks.push(createNumberedItem('System checks client eligibility (membership level, prerequisites)'));
  blocks.push(createNumberedItem('System confirms enrollment'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Client is enrolled in all future instances of recurring class'));

  blocks.push(createDivider());

  // UC-1.4: Handle Cancellation
  blocks.push(createHeading3('UC-1.4: Handle Cancellation'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff, Coach'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Booking exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Process a cancellation (frequent occurrence with neurodivergent clients)'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('User locates booking'));
  blocks.push(createNumberedItem('User initiates cancellation'));
  blocks.push(createNumberedItem('System prompts for:'));
  blocks.push(createBulletItem('Cancellation reason (dropdown: illness, no-show, schedule conflict, other)'));
  blocks.push(createBulletItem('Whether to reschedule'));
  blocks.push(createBulletItem('Whether this is client-initiated or facility-initiated'));
  blocks.push(createNumberedItem('System records cancellation with timestamp'));
  blocks.push(createNumberedItem('System updates:'));
  blocks.push(createBulletItem('Schedule (slot becomes available)'));
  blocks.push(createBulletItem('Client cancellation history'));
  blocks.push(createBulletItem('Coach schedule'));
  blocks.push(createNumberedItem('If Regional Center client:'));
  blocks.push(createBulletItem('System flags as billable or non-billable per RC rules'));
  blocks.push(createBulletItem('System logs for compliance reporting'));

  blocks.push(createTextBlock('Alternative Flow - Late Cancellation:'));
  blocks.push(createBulletItem('Step 3a: System checks cancellation policy (e.g., <24 hours)'));
  blocks.push(createBulletItem('Step 3b: System prompts whether to charge cancellation fee'));
  blocks.push(createBulletItem('Step 3c: If Regional Center, system applies RC-specific late cancel rules'));

  blocks.push(createTextBlock('Postconditions:'));
  blocks.push(createBulletItem('Booking is cancelled with full audit trail'));
  blocks.push(createBulletItem('Availability is restored'));
  blocks.push(createBulletItem('Cancellation metrics are updated'));

  blocks.push(createDivider());

  // UC-1.5: Manage Recurring Booking
  blocks.push(createHeading3('UC-1.5: Manage Recurring Booking'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Client has ongoing service agreement'));
  blocks.push(createBoldLabelBlock('Description:', 'Set up permanent recurring booking (e.g., "Every Tuesday 3pm, Lane 3")'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Staff creates booking with "recurring" option'));
  blocks.push(createNumberedItem('Staff sets:'));
  blocks.push(createBulletItem('Frequency (weekly, bi-weekly, monthly)'));
  blocks.push(createBulletItem('Day(s) of week'));
  blocks.push(createBulletItem('Start/end time'));
  blocks.push(createBulletItem('Duration (ongoing or end date)'));
  blocks.push(createNumberedItem('System validates no conflicts across all occurrences'));
  blocks.push(createNumberedItem('System creates recurring series'));
  blocks.push(createNumberedItem('Staff can later modify:'));
  blocks.push(createBulletItem('Single occurrence (exception)'));
  blocks.push(createBulletItem('This and all future occurrences'));
  blocks.push(createBulletItem('Entire series'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'All occurrences appear on schedule with "recurring" indicator'));

  blocks.push(createDivider());

  // ============================================
  // 2. TIME TRACKING & PAYROLL
  // ============================================
  blocks.push(createHeading2('2. Time Tracking & Payroll'));

  // UC-2.1: Coach Logs Session Completion
  blocks.push(createHeading3('UC-2.1: Coach Logs Session Completion'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Coach'));
  blocks.push(createTextBlock('Preconditions:'));
  blocks.push(createBulletItem('Coach has scheduled session'));
  blocks.push(createBulletItem('Session time has passed'));
  blocks.push(createBoldLabelBlock('Description:', 'Coach confirms session occurred and logs time'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Coach opens their schedule (mobile-friendly)'));
  blocks.push(createNumberedItem('Coach sees list of today\'s sessions'));
  blocks.push(createNumberedItem('For each session, coach:'));
  blocks.push(createBulletItem('Confirms "Completed" OR marks "Cancelled/No-Show"'));
  blocks.push(createBulletItem('Optionally adds notes'));
  blocks.push(createNumberedItem('System records:'));
  blocks.push(createBulletItem('Actual start/end time (or uses scheduled time)'));
  blocks.push(createBulletItem('Session type'));
  blocks.push(createBulletItem('Client(s) served'));
  blocks.push(createBulletItem('Timestamp of confirmation'));

  blocks.push(createTextBlock('Alternative Flow - Session Modification:'));
  blocks.push(createBulletItem('Step 3a: Coach can log that session ran long/short'));
  blocks.push(createBulletItem('Step 3b: System captures actual duration vs. scheduled'));

  blocks.push(createTextBlock('Postconditions:'));
  blocks.push(createBulletItem('Session is marked complete in system'));
  blocks.push(createBulletItem('Hours are ready for payroll calculation'));
  blocks.push(createBulletItem('Attendance is recorded for billing'));

  blocks.push(createCallout('Business Rule: Replaces current WhatsApp → Excel workflow', '🎯'));

  blocks.push(createDivider());

  // UC-2.2: Log Non-Session Work Time
  blocks.push(createHeading3('UC-2.2: Log Non-Session Work Time'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Coach'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Coach is authenticated'));
  blocks.push(createBoldLabelBlock('Description:', 'Coach logs work time that isn\'t tied to a specific session (prep, training, admin)'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Coach selects "Log Additional Time"'));
  blocks.push(createNumberedItem('Coach enters:'));
  blocks.push(createBulletItem('Date'));
  blocks.push(createBulletItem('Time in/out'));
  blocks.push(createBulletItem('Category (training, prep, meetings, admin, other)'));
  blocks.push(createBulletItem('Notes/description'));
  blocks.push(createNumberedItem('System records time entry'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Time entry awaits approval for payroll'));

  blocks.push(createDivider());

  // UC-2.3: Review & Approve Time Entries
  blocks.push(createHeading3('UC-2.3: Review & Approve Time Entries'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner/Admin, Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Pay period has ended'));
  blocks.push(createBoldLabelBlock('Description:', 'Review all time entries before payroll processing'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Admin opens Time Review for pay period'));
  blocks.push(createNumberedItem('System displays:'));
  blocks.push(createBulletItem('All coach time entries grouped by coach'));
  blocks.push(createBulletItem('Session-based time (auto-logged from completed sessions)'));
  blocks.push(createBulletItem('Additional time entries'));
  blocks.push(createBulletItem('Discrepancies or flags'));
  blocks.push(createNumberedItem('Admin can:'));
  blocks.push(createBulletItem('Approve entries individually or in bulk'));
  blocks.push(createBulletItem('Flag entries for follow-up'));
  blocks.push(createBulletItem('Adjust entries with audit note'));
  blocks.push(createNumberedItem('Admin approves pay period'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Approved hours are ready for payroll calculation'));

  blocks.push(createDivider());

  // UC-2.4: Calculate Payroll
  blocks.push(createHeading3('UC-2.4: Calculate Payroll'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner/Admin'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Time entries are approved'));
  blocks.push(createBoldLabelBlock('Description:', 'Generate payroll calculations for pay period'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Admin initiates payroll calculation'));
  blocks.push(createNumberedItem('System computes for each coach:'));
  blocks.push(createBulletItem('Total hours by category'));
  blocks.push(createBulletItem('Pay rate(s) applied (may vary by service type)'));
  blocks.push(createBulletItem('Gross pay'));
  blocks.push(createNumberedItem('System displays summary report'));
  blocks.push(createNumberedItem('Admin reviews and confirms'));
  blocks.push(createNumberedItem('System exports to QuickBooks-compatible format'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Payroll data is ready for QuickBooks import or direct processing'));

  blocks.push(createTextBlock('Business Rule: Coach pay rates may differ:'));
  blocks.push(createBulletItem('Swimming lessons: $X/hour'));
  blocks.push(createBulletItem('Fitness classes: $Y/hour'));
  blocks.push(createBulletItem('Basketball training: $Z/hour'));

  blocks.push(createDivider());

  // UC-2.5: View My Pay Summary (Coach)
  blocks.push(createHeading3('UC-2.5: View My Pay Summary (Coach)'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Coach'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Coach is authenticated'));
  blocks.push(createBoldLabelBlock('Description:', 'Coach views their own time and pay summary'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Coach navigates to "My Pay"'));
  blocks.push(createNumberedItem('System displays:'));
  blocks.push(createBulletItem('Current pay period hours logged'));
  blocks.push(createBulletItem('Breakdown by service type'));
  blocks.push(createBulletItem('Pending approvals'));
  blocks.push(createBulletItem('Historical pay summaries'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Coach has visibility into their earnings'));

  blocks.push(createDivider());

  // ============================================
  // 3. CLIENT & MEMBERSHIP MANAGEMENT
  // ============================================
  blocks.push(createHeading2('3. Client & Membership Management'));

  // UC-3.1: Register New Client
  blocks.push(createHeading3('UC-3.1: Register New Client'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'None'));
  blocks.push(createBoldLabelBlock('Description:', 'Add a new client/family to the system'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Staff initiates new client registration'));
  blocks.push(createNumberedItem('Staff enters:'));
  blocks.push(createBulletItem('Contact information'));
  blocks.push(createBulletItem('Emergency contacts'));
  blocks.push(createBulletItem('Family members (if applicable)'));
  blocks.push(createBulletItem('Billing type (direct pay / Regional Center)'));
  blocks.push(createNumberedItem('If Regional Center:'));
  blocks.push(createBulletItem('Staff enters RC client ID'));
  blocks.push(createBulletItem('Staff enters authorized services and hours'));
  blocks.push(createBulletItem('Staff enters authorization period dates'));
  blocks.push(createNumberedItem('Staff selects membership type (if applicable)'));
  blocks.push(createNumberedItem('System creates client record'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Client is ready for booking'));

  blocks.push(createDivider());

  // UC-3.2: Manage Membership
  blocks.push(createHeading3('UC-3.2: Manage Membership'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff, Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Client exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Set up or modify client membership'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Staff opens client record'));
  blocks.push(createNumberedItem('Staff navigates to Membership section'));
  blocks.push(createNumberedItem('Staff can:'));
  blocks.push(createBulletItem('Assign membership tier (individual, family, etc.)'));
  blocks.push(createBulletItem('Set billing cycle'));
  blocks.push(createBulletItem('Apply discounts or promotions'));
  blocks.push(createBulletItem('Add/remove family members'));
  blocks.push(createNumberedItem('System updates membership status'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Membership is active with correct billing parameters'));

  blocks.push(createDivider());

  // UC-3.3: View Client History
  blocks.push(createHeading3('UC-3.3: View Client History'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff, Coach, Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Client exists'));
  blocks.push(createBoldLabelBlock('Description:', 'View comprehensive client activity history'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('User searches for client'));
  blocks.push(createNumberedItem('System displays client profile with:'));
  blocks.push(createBulletItem('Contact information'));
  blocks.push(createBulletItem('Membership status'));
  blocks.push(createBulletItem('Upcoming bookings'));
  blocks.push(createBulletItem('Past sessions (with attendance status)'));
  blocks.push(createBulletItem('Cancellation history and rate'));
  blocks.push(createBulletItem('Payment history'));
  blocks.push(createBulletItem('Notes from coaches'));
  blocks.push(createNumberedItem('For Regional Center clients, also shows:'));
  blocks.push(createBulletItem('Authorization status'));
  blocks.push(createBulletItem('Hours used vs. authorized'));
  blocks.push(createBulletItem('Billing history'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'User has full context on client'));

  blocks.push(createDivider());

  // ============================================
  // 4. GOVERNMENT BILLING (REGIONAL CENTER)
  // ============================================
  blocks.push(createHeading2('4. Government Billing (Regional Center)'));

  // UC-4.1: Record Attendance for RC Client
  blocks.push(createHeading3('UC-4.1: Record Attendance for RC Client'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Coach, System (automatic)'));
  blocks.push(createTextBlock('Preconditions:'));
  blocks.push(createBulletItem('Session is completed'));
  blocks.push(createBulletItem('Client is Regional Center funded'));
  blocks.push(createBoldLabelBlock('Description:', 'Capture attendance record required for government billing'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Coach completes session (UC-2.1)'));
  blocks.push(createNumberedItem('System automatically creates attendance record with:'));
  blocks.push(createBulletItem('Date and time'));
  blocks.push(createBulletItem('Duration'));
  blocks.push(createBulletItem('Service type'));
  blocks.push(createBulletItem('Coach name'));
  blocks.push(createBulletItem('Client RC ID'));
  blocks.push(createBulletItem('Attendance status (present, absent, late cancel)'));
  blocks.push(createNumberedItem('Record is flagged for billing'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Attendance record is ready for RC billing submission'));

  blocks.push(createDivider());

  // UC-4.2: Generate RC Billing Report
  blocks.push(createHeading3('UC-4.2: Generate RC Billing Report'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner, Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Billing period has ended'));
  blocks.push(createBoldLabelBlock('Description:', 'Generate billing submission for Regional Center'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Admin selects billing period'));
  blocks.push(createNumberedItem('System compiles all RC attendance records'));
  blocks.push(createNumberedItem('System generates report in RC-required format:'));
  blocks.push(createBulletItem('Client ID'));
  blocks.push(createBulletItem('Service dates'));
  blocks.push(createBulletItem('Service types'));
  blocks.push(createBulletItem('Units/hours'));
  blocks.push(createBulletItem('Billable amounts'));
  blocks.push(createNumberedItem('Admin reviews for accuracy'));
  blocks.push(createNumberedItem('Admin can make adjustments with audit notes'));
  blocks.push(createNumberedItem('System exports in format compatible with RC e-billing portal'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Billing report ready for submission to Regional Center'));

  blocks.push(createDivider());

  // UC-4.3: Track RC Authorization
  blocks.push(createHeading3('UC-4.3: Track RC Authorization'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Office Staff, Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'RC client exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Monitor and manage Regional Center authorizations'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Staff views RC client dashboard'));
  blocks.push(createNumberedItem('System displays:'));
  blocks.push(createBulletItem('Current authorization period'));
  blocks.push(createBulletItem('Authorized services and hours'));
  blocks.push(createBulletItem('Hours used to date'));
  blocks.push(createBulletItem('Hours remaining'));
  blocks.push(createBulletItem('Expiration warnings'));
  blocks.push(createNumberedItem('System sends alerts when:'));
  blocks.push(createBulletItem('Authorization is 80% used'));
  blocks.push(createBulletItem('Authorization expires in 30 days'));
  blocks.push(createBulletItem('Booking would exceed authorized hours'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Staff maintains visibility on authorization status'));

  blocks.push(createDivider());

  // UC-4.4: Reconcile RC Payments
  blocks.push(createHeading3('UC-4.4: Reconcile RC Payments'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner, Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'RC payment received'));
  blocks.push(createBoldLabelBlock('Description:', 'Match Regional Center payments to billed services'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Admin records RC payment received'));
  blocks.push(createNumberedItem('System matches payment to submitted billing'));
  blocks.push(createNumberedItem('System identifies:'));
  blocks.push(createBulletItem('Fully paid claims'));
  blocks.push(createBulletItem('Partial payments'));
  blocks.push(createBulletItem('Rejected claims'));
  blocks.push(createNumberedItem('Admin reviews discrepancies'));
  blocks.push(createNumberedItem('Admin can:'));
  blocks.push(createBulletItem('Mark claims as resolved'));
  blocks.push(createBulletItem('Flag for follow-up'));
  blocks.push(createBulletItem('Create adjustment entries'));
  blocks.push(createNumberedItem('System updates accounts receivable'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Payment is reconciled with clear audit trail'));

  blocks.push(createDivider());

  // ============================================
  // 5. FINANCIAL ANALYTICS
  // ============================================
  blocks.push(createHeading2('5. Financial Analytics'));

  // UC-5.1: View Profit Center Dashboard
  blocks.push(createHeading3('UC-5.1: View Profit Center Dashboard'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Financial data exists'));
  blocks.push(createBoldLabelBlock('Description:', 'View revenue and costs broken down by profit center'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Owner opens Analytics dashboard'));
  blocks.push(createNumberedItem('System displays for selected period:'));
  blocks.push(createBulletItem('By Service Type:', true));
  blocks.push(createBulletItem('Swimming: revenue, direct costs, margin'));
  blocks.push(createBulletItem('Fitness: revenue, direct costs, margin'));
  blocks.push(createBulletItem('Basketball: revenue, direct costs, margin'));
  blocks.push(createBulletItem('Memberships: revenue'));
  blocks.push(createBulletItem('By Funding Source:', true));
  blocks.push(createBulletItem('Direct pay revenue'));
  blocks.push(createBulletItem('Regional Center revenue'));
  blocks.push(createBulletItem('Key Metrics:', true));
  blocks.push(createBulletItem('Total revenue'));
  blocks.push(createBulletItem('Total payroll cost'));
  blocks.push(createBulletItem('Gross margin'));
  blocks.push(createBulletItem('Revenue per coach hour'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Owner has P&L visibility by profit center'));

  blocks.push(createDivider());

  // UC-5.2: View Coach Performance Analytics
  blocks.push(createHeading3('UC-5.2: View Coach Performance Analytics'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Time and revenue data exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Analyze individual coach performance'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Owner selects Coach Analytics'));
  blocks.push(createNumberedItem('System displays for each coach:'));
  blocks.push(createBulletItem('Total hours worked (by service type)'));
  blocks.push(createBulletItem('Revenue generated'));
  blocks.push(createBulletItem('Client count'));
  blocks.push(createBulletItem('Cancellation rate (by their clients)'));
  blocks.push(createBulletItem('Revenue per hour'));
  blocks.push(createBulletItem('Utilization rate (booked vs. available)'));
  blocks.push(createNumberedItem('Owner can compare coaches side-by-side'));
  blocks.push(createNumberedItem('Owner can view trends over time'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Owner has data for staffing and performance decisions'));

  blocks.push(createDivider());

  // UC-5.3: Generate Financial Report
  blocks.push(createHeading3('UC-5.3: Generate Financial Report'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Period data exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Generate formatted financial reports'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Owner selects report type:'));
  blocks.push(createBulletItem('P&L by profit center'));
  blocks.push(createBulletItem('Revenue summary'));
  blocks.push(createBulletItem('Payroll summary'));
  blocks.push(createBulletItem('RC billing summary'));
  blocks.push(createBulletItem('Cash flow'));
  blocks.push(createNumberedItem('Owner selects date range'));
  blocks.push(createNumberedItem('System generates report'));
  blocks.push(createNumberedItem('Owner can export to:'));
  blocks.push(createBulletItem('PDF'));
  blocks.push(createBulletItem('Excel'));
  blocks.push(createBulletItem('QuickBooks-compatible format'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Report is generated for review or export'));

  blocks.push(createDivider());

  // UC-5.4: Monitor Key Metrics Dashboard
  blocks.push(createHeading3('UC-5.4: Monitor Key Metrics Dashboard'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'System has operational data'));
  blocks.push(createBoldLabelBlock('Description:', 'Real-time dashboard of business health metrics'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Owner views main dashboard'));
  blocks.push(createNumberedItem('System displays real-time:'));
  blocks.push(createBulletItem('Today\'s bookings and revenue'));
  blocks.push(createBulletItem('This week\'s schedule fill rate'));
  blocks.push(createBulletItem('Outstanding RC billing'));
  blocks.push(createBulletItem('Pending payroll'));
  blocks.push(createBulletItem('Cancellation rate trend'));
  blocks.push(createBulletItem('Member count and churn'));
  blocks.push(createNumberedItem('Visual alerts for:'));
  blocks.push(createBulletItem('Unusual cancellation spikes'));
  blocks.push(createBulletItem('Low utilization periods'));
  blocks.push(createBulletItem('Overdue RC payments'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Owner has immediate visibility into operations'));

  blocks.push(createDivider());

  // ============================================
  // 6. STAFF MANAGEMENT
  // ============================================
  blocks.push(createHeading2('6. Staff Management'));

  // UC-6.1: Manage Coach Profile
  blocks.push(createHeading3('UC-6.1: Manage Coach Profile'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner, Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Coach exists or is being added'));
  blocks.push(createBoldLabelBlock('Description:', 'Create or update coach profile'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Admin navigates to Staff Management'));
  blocks.push(createNumberedItem('Admin creates/edits coach profile:'));
  blocks.push(createBulletItem('Personal information'));
  blocks.push(createBulletItem('Certifications (swim instructor, CPR, etc.)'));
  blocks.push(createBulletItem('Services qualified to teach (swim, fitness, basketball)'));
  blocks.push(createBulletItem('Pay rates by service type'));
  blocks.push(createBulletItem('Availability/schedule preferences'));
  blocks.push(createBulletItem('Start date, status'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Coach profile is current and complete'));
  blocks.push(createBoldLabelBlock('Business Rule:', 'Coaches can be multi-functional across service types'));

  blocks.push(createDivider());

  // UC-6.2: Set Coach Availability
  blocks.push(createHeading3('UC-6.2: Set Coach Availability'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Coach, Office Staff'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Coach exists'));
  blocks.push(createBoldLabelBlock('Description:', 'Define when a coach is available for scheduling'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('User opens coach availability'));
  blocks.push(createNumberedItem('User sets:'));
  blocks.push(createBulletItem('Regular weekly availability'));
  blocks.push(createBulletItem('Blackout dates (vacation, etc.)'));
  blocks.push(createBulletItem('Preferred vs. available hours'));
  blocks.push(createNumberedItem('System uses this to:'));
  blocks.push(createBulletItem('Show/hide coach in booking options'));
  blocks.push(createBulletItem('Calculate utilization metrics'));
  blocks.push(createBulletItem('Prevent overbooking'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Coach availability is reflected in scheduling'));

  blocks.push(createDivider());

  // UC-6.3: View Staff Schedule
  blocks.push(createHeading3('UC-6.3: View Staff Schedule'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Coach, Owner'));
  blocks.push(createBoldLabelBlock('Preconditions:', 'Coach is authenticated'));
  blocks.push(createBoldLabelBlock('Description:', 'Coach views their own schedule'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Coach opens "My Schedule"'));
  blocks.push(createNumberedItem('System displays:'));
  blocks.push(createBulletItem('Day/week/month view of their bookings'));
  blocks.push(createBulletItem('Client names and notes'));
  blocks.push(createBulletItem('Session types'));
  blocks.push(createBulletItem('Location (lane number, room)'));
  blocks.push(createNumberedItem('Coach can see but not directly modify bookings'));

  blocks.push(createBoldLabelBlock('Postconditions:', 'Coach has visibility into their schedule'));

  blocks.push(createDivider());

  // ============================================
  // CROSS-CUTTING CONCERNS
  // ============================================
  blocks.push(createHeading2('Cross-Cutting Concerns'));

  // UC-X.1: Sync with Wellness Living
  blocks.push(createHeading3('UC-X.1: Sync with Wellness Living'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'System (automated)'));
  blocks.push(createBoldLabelBlock('Description:', 'Synchronize permanent bookings from Wellness Living'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('System polls Wellness Living API (or receives webhook)'));
  blocks.push(createNumberedItem('System identifies new/changed bookings'));
  blocks.push(createNumberedItem('System updates master schedule'));
  blocks.push(createNumberedItem('Conflicts are flagged for manual review'));

  blocks.push(createDivider());

  // UC-X.2: Export to QuickBooks
  blocks.push(createHeading3('UC-X.2: Export to QuickBooks'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner'));
  blocks.push(createBoldLabelBlock('Description:', 'Export financial data to QuickBooks'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Owner initiates QuickBooks export'));
  blocks.push(createNumberedItem('Owner selects data type (payroll, invoices, payments)'));
  blocks.push(createNumberedItem('System generates QB-compatible file'));
  blocks.push(createNumberedItem('Owner imports into QuickBooks'));

  blocks.push(createDivider());

  // UC-X.3: Multi-Location Support (Future)
  blocks.push(createHeading3('UC-X.3: Multi-Location Support (Future)'));
  blocks.push(createBoldLabelBlock('Primary Actor:', 'Owner'));
  blocks.push(createBoldLabelBlock('Description:', 'Manage multiple facility locations'));

  blocks.push(createTextBlock('Main Flow:'));
  blocks.push(createNumberedItem('Owner can add new locations'));
  blocks.push(createNumberedItem('Each location has its own:'));
  blocks.push(createBulletItem('Resources (lanes, rooms, courts)'));
  blocks.push(createBulletItem('Staff assignments'));
  blocks.push(createBulletItem('Schedule'));
  blocks.push(createNumberedItem('Analytics can view by location or consolidated'));

  blocks.push(createDivider());

  // ============================================
  // APPENDIX: PRIORITY MATRIX
  // ============================================
  blocks.push(createHeading2('Appendix: Priority Matrix'));
  blocks.push(createTable(
    ['Use Case', 'Priority', 'Complexity', 'Notes'],
    [
      ['UC-2.1 Coach Logs Session', 'P1', 'Low', 'Replaces WhatsApp workflow'],
      ['UC-2.4 Calculate Payroll', 'P1', 'Medium', 'Core pain point'],
      ['UC-1.1 View Master Schedule', 'P1', 'Medium', 'Single source of truth'],
      ['UC-4.1 Record RC Attendance', 'P1', 'Low', 'Government compliance'],
      ['UC-4.2 Generate RC Billing', 'P1', 'Medium', 'Revenue critical'],
      ['UC-5.1 Profit Center Dashboard', 'P1', 'Medium', 'Key visibility need'],
      ['UC-1.4 Handle Cancellation', 'P2', 'Low', 'High frequency operation'],
      ['UC-3.1 Register New Client', 'P2', 'Low', 'Foundational'],
      ['UC-5.2 Coach Performance', 'P2', 'Medium', 'Operational insight'],
      ['UC-1.2 Book Private Lesson', 'P2', 'Medium', 'Daily operation'],
      ['UC-6.1 Manage Coach Profile', 'P3', 'Low', 'Admin function'],
      ['UC-X.1 Wellness Living Sync', 'P3', 'High', 'Integration complexity'],
      ['UC-X.2 QuickBooks Export', 'P3', 'Medium', 'Nice to have initially']
    ]
  ));

  blocks.push(createDivider());

  // ============================================
  // NEXT STEPS
  // ============================================
  blocks.push(createHeading2('Next Steps'));
  blocks.push(createNumberedItem('Review and validate use cases with stakeholders'));
  blocks.push(createNumberedItem('Identify MVP scope (P1 use cases)'));
  blocks.push(createNumberedItem('Create wireframes for key screens'));
  blocks.push(createNumberedItem('Define data model'));
  blocks.push(createNumberedItem('Plan integration architecture with i360'));

  return blocks;
}

async function appendBlocksToPage(pageId, blocks) {
  // Notion API limits to 100 blocks per request
  const chunkSize = 100;
  let totalAppended = 0;

  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);

    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({ children: chunk })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Notion API error: ${JSON.stringify(error)}`);
    }

    totalAppended += chunk.length;
    console.log(`Appended ${totalAppended}/${blocks.length} blocks...`);
  }

  return totalAppended;
}

async function main() {
  console.log('Building FULL FIDELITY use cases content for Notion...');
  const blocks = buildUseCasesBlocks();
  console.log(`Created ${blocks.length} blocks`);

  console.log(`\nAppending to Notion page: ${NOTION_PAGE_ID}`);

  try {
    const count = await appendBlocksToPage(NOTION_PAGE_ID, blocks);
    console.log(`\n✅ Successfully added ${count} blocks to Notion!`);
    console.log(`View at: https://notion.so/${NOTION_PAGE_ID.replace(/-/g, '')}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
