# RecCenter Manager - Use Cases

## Document Information
- **Project:** RecCenter Manager (Wint's Recreation Facility)
- **Version:** 1.0
- **Date:** December 28, 2024
- **Status:** Requirements Gathering

---

## Actors

| Actor | Description |
|-------|-------------|
| **Owner/Admin (Wint)** | Business owner with full system access; views analytics, approves payroll, manages billing |
| **Office Staff/Assistant** | Handles day-to-day scheduling, client communications, data entry |
| **Coach** | Multi-functional staff member who teaches swimming, fitness, basketball; logs time and attendance |
| **Client (Direct Pay)** | Individual or family member paying directly for services |
| **Client (Regional Center)** | Neurodivergent individual whose services are funded by government Regional Center |
| **Regional Center** | Government funding entity requiring specific attendance documentation and billing format |

---

## Use Case Categories

1. [Scheduling & Booking](#1-scheduling--booking)
2. [Time Tracking & Payroll](#2-time-tracking--payroll)
3. [Client & Membership Management](#3-client--membership-management)
4. [Government Billing (Regional Center)](#4-government-billing-regional-center)
5. [Financial Analytics](#5-financial-analytics)
6. [Staff Management](#6-staff-management)

---

## 1. Scheduling & Booking

### UC-1.1: View Master Schedule

**Primary Actor:** Office Staff, Owner, Coach

**Preconditions:** User is authenticated

**Description:** View the consolidated master schedule showing all bookings across pool lanes, gym spaces, and basketball court.

**Main Flow:**
1. User navigates to Schedule view
2. System displays calendar/grid view with:
   - Pool lanes (1-5) with time slots
   - Gym/fitness room availability
   - Basketball court availability
3. User can filter by:
   - Date range
   - Service type (swim, fitness, basketball)
   - Coach
   - Client type (direct pay vs. Regional Center)
4. Color coding indicates:
   - Permanent/recurring bookings
   - One-time bookings
   - Available slots
   - Blocked/maintenance time

**Postconditions:** User sees accurate real-time availability

**Business Rule:** Permanent bookings from Wellness Living sync automatically and are visually distinguished

---

### UC-1.2: Book a Private Lesson

**Primary Actor:** Office Staff

**Preconditions:**
- Client exists in system
- Coach is available
- Lane/space is available

**Description:** Schedule a private lesson (swim, fitness, or basketball)

**Main Flow:**
1. Staff selects date/time on schedule
2. Staff selects service type
3. System shows available coaches qualified for that service
4. Staff selects coach
5. Staff searches for client
6. System shows client's:
   - Billing type (direct/Regional Center)
   - Any scheduling preferences or notes
   - Cancellation history
7. Staff confirms booking
8. System creates booking and sends confirmation

**Alternative Flow - Regional Center Client:**
- Step 6a: System displays authorized hours remaining
- Step 6b: System warns if booking exceeds authorization

**Postconditions:**
- Booking appears on master schedule
- Coach sees booking on their schedule
- Client receives confirmation

---

### UC-1.3: Book a Group Class

**Primary Actor:** Office Staff

**Preconditions:** Group class template exists

**Description:** Enroll client(s) in a recurring group class

**Main Flow:**
1. Staff selects group class from class list
2. System shows:
   - Current enrollment count
   - Maximum capacity
   - Enrolled participants
3. Staff adds client to class
4. System checks client eligibility (membership level, prerequisites)
5. System confirms enrollment

**Postconditions:** Client is enrolled in all future instances of recurring class

---

### UC-1.4: Handle Cancellation

**Primary Actor:** Office Staff, Coach

**Preconditions:** Booking exists

**Description:** Process a cancellation (frequent occurrence with neurodivergent clients)

**Main Flow:**
1. User locates booking
2. User initiates cancellation
3. System prompts for:
   - Cancellation reason (dropdown: illness, no-show, schedule conflict, other)
   - Whether to reschedule
   - Whether this is client-initiated or facility-initiated
4. System records cancellation with timestamp
5. System updates:
   - Schedule (slot becomes available)
   - Client cancellation history
   - Coach schedule
6. If Regional Center client:
   - System flags as billable or non-billable per RC rules
   - System logs for compliance reporting

**Alternative Flow - Late Cancellation:**
- Step 3a: System checks cancellation policy (e.g., <24 hours)
- Step 3b: System prompts whether to charge cancellation fee
- Step 3c: If Regional Center, system applies RC-specific late cancel rules

**Postconditions:**
- Booking is cancelled with full audit trail
- Availability is restored
- Cancellation metrics are updated

---

### UC-1.5: Manage Recurring Booking

**Primary Actor:** Office Staff

**Preconditions:** Client has ongoing service agreement

**Description:** Set up permanent recurring booking (e.g., "Every Tuesday 3pm, Lane 3")

**Main Flow:**
1. Staff creates booking with "recurring" option
2. Staff sets:
   - Frequency (weekly, bi-weekly, monthly)
   - Day(s) of week
   - Start/end time
   - Duration (ongoing or end date)
3. System validates no conflicts across all occurrences
4. System creates recurring series
5. Staff can later modify:
   - Single occurrence (exception)
   - This and all future occurrences
   - Entire series

**Postconditions:** All occurrences appear on schedule with "recurring" indicator

---

## 2. Time Tracking & Payroll

### UC-2.1: Coach Logs Session Completion

**Primary Actor:** Coach

**Preconditions:**
- Coach has scheduled session
- Session time has passed

**Description:** Coach confirms session occurred and logs time

**Main Flow:**
1. Coach opens their schedule (mobile-friendly)
2. Coach sees list of today's sessions
3. For each session, coach:
   - Confirms "Completed" OR marks "Cancelled/No-Show"
   - Optionally adds notes
4. System records:
   - Actual start/end time (or uses scheduled time)
   - Session type
   - Client(s) served
   - Timestamp of confirmation

**Alternative Flow - Session Modification:**
- Step 3a: Coach can log that session ran long/short
- Step 3b: System captures actual duration vs. scheduled

**Postconditions:**
- Session is marked complete in system
- Hours are ready for payroll calculation
- Attendance is recorded for billing

**Business Rule:** Replaces current WhatsApp → Excel workflow

---

### UC-2.2: Log Non-Session Work Time

**Primary Actor:** Coach

**Preconditions:** Coach is authenticated

**Description:** Coach logs work time that isn't tied to a specific session (prep, training, admin)

**Main Flow:**
1. Coach selects "Log Additional Time"
2. Coach enters:
   - Date
   - Time in/out
   - Category (training, prep, meetings, admin, other)
   - Notes/description
3. System records time entry

**Postconditions:** Time entry awaits approval for payroll

---

### UC-2.3: Review & Approve Time Entries

**Primary Actor:** Owner/Admin, Office Staff

**Preconditions:** Pay period has ended

**Description:** Review all time entries before payroll processing

**Main Flow:**
1. Admin opens Time Review for pay period
2. System displays:
   - All coach time entries grouped by coach
   - Session-based time (auto-logged from completed sessions)
   - Additional time entries
   - Discrepancies or flags
3. Admin can:
   - Approve entries individually or in bulk
   - Flag entries for follow-up
   - Adjust entries with audit note
4. Admin approves pay period

**Postconditions:** Approved hours are ready for payroll calculation

---

### UC-2.4: Calculate Payroll

**Primary Actor:** Owner/Admin

**Preconditions:** Time entries are approved

**Description:** Generate payroll calculations for pay period

**Main Flow:**
1. Admin initiates payroll calculation
2. System computes for each coach:
   - Total hours by category
   - Pay rate(s) applied (may vary by service type)
   - Gross pay
3. System displays summary report
4. Admin reviews and confirms
5. System exports to QuickBooks-compatible format

**Postconditions:** Payroll data is ready for QuickBooks import or direct processing

**Business Rule:** Coach pay rates may differ:
- Swimming lessons: $X/hour
- Fitness classes: $Y/hour
- Basketball training: $Z/hour

---

### UC-2.5: View My Pay Summary (Coach)

**Primary Actor:** Coach

**Preconditions:** Coach is authenticated

**Description:** Coach views their own time and pay summary

**Main Flow:**
1. Coach navigates to "My Pay"
2. System displays:
   - Current pay period hours logged
   - Breakdown by service type
   - Pending approvals
   - Historical pay summaries

**Postconditions:** Coach has visibility into their earnings

---

## 3. Client & Membership Management

### UC-3.1: Register New Client

**Primary Actor:** Office Staff

**Preconditions:** None

**Description:** Add a new client/family to the system

**Main Flow:**
1. Staff initiates new client registration
2. Staff enters:
   - Contact information
   - Emergency contacts
   - Family members (if applicable)
   - Billing type (direct pay / Regional Center)
3. If Regional Center:
   - Staff enters RC client ID
   - Staff enters authorized services and hours
   - Staff enters authorization period dates
4. Staff selects membership type (if applicable)
5. System creates client record

**Postconditions:** Client is ready for booking

---

### UC-3.2: Manage Membership

**Primary Actor:** Office Staff, Owner

**Preconditions:** Client exists

**Description:** Set up or modify client membership

**Main Flow:**
1. Staff opens client record
2. Staff navigates to Membership section
3. Staff can:
   - Assign membership tier (individual, family, etc.)
   - Set billing cycle
   - Apply discounts or promotions
   - Add/remove family members
4. System updates membership status

**Postconditions:** Membership is active with correct billing parameters

---

### UC-3.3: View Client History

**Primary Actor:** Office Staff, Coach, Owner

**Preconditions:** Client exists

**Description:** View comprehensive client activity history

**Main Flow:**
1. User searches for client
2. System displays client profile with:
   - Contact information
   - Membership status
   - Upcoming bookings
   - Past sessions (with attendance status)
   - Cancellation history and rate
   - Payment history
   - Notes from coaches
3. For Regional Center clients, also shows:
   - Authorization status
   - Hours used vs. authorized
   - Billing history

**Postconditions:** User has full context on client

---

## 4. Government Billing (Regional Center)

### UC-4.1: Record Attendance for RC Client

**Primary Actor:** Coach, System (automatic)

**Preconditions:**
- Session is completed
- Client is Regional Center funded

**Description:** Capture attendance record required for government billing

**Main Flow:**
1. Coach completes session (UC-2.1)
2. System automatically creates attendance record with:
   - Date and time
   - Duration
   - Service type
   - Coach name
   - Client RC ID
   - Attendance status (present, absent, late cancel)
3. Record is flagged for billing

**Postconditions:** Attendance record is ready for RC billing submission

---

### UC-4.2: Generate RC Billing Report

**Primary Actor:** Owner, Office Staff

**Preconditions:** Billing period has ended

**Description:** Generate billing submission for Regional Center

**Main Flow:**
1. Admin selects billing period
2. System compiles all RC attendance records
3. System generates report in RC-required format:
   - Client ID
   - Service dates
   - Service types
   - Units/hours
   - Billable amounts
4. Admin reviews for accuracy
5. Admin can make adjustments with audit notes
6. System exports in format compatible with RC e-billing portal

**Postconditions:** Billing report ready for submission to Regional Center

---

### UC-4.3: Track RC Authorization

**Primary Actor:** Office Staff, Owner

**Preconditions:** RC client exists

**Description:** Monitor and manage Regional Center authorizations

**Main Flow:**
1. Staff views RC client dashboard
2. System displays:
   - Current authorization period
   - Authorized services and hours
   - Hours used to date
   - Hours remaining
   - Expiration warnings
3. System sends alerts when:
   - Authorization is 80% used
   - Authorization expires in 30 days
   - Booking would exceed authorized hours

**Postconditions:** Staff maintains visibility on authorization status

---

### UC-4.4: Reconcile RC Payments

**Primary Actor:** Owner, Office Staff

**Preconditions:** RC payment received

**Description:** Match Regional Center payments to billed services

**Main Flow:**
1. Admin records RC payment received
2. System matches payment to submitted billing
3. System identifies:
   - Fully paid claims
   - Partial payments
   - Rejected claims
4. Admin reviews discrepancies
5. Admin can:
   - Mark claims as resolved
   - Flag for follow-up
   - Create adjustment entries
6. System updates accounts receivable

**Postconditions:** Payment is reconciled with clear audit trail

---

## 5. Financial Analytics

### UC-5.1: View Profit Center Dashboard

**Primary Actor:** Owner

**Preconditions:** Financial data exists

**Description:** View revenue and costs broken down by profit center

**Main Flow:**
1. Owner opens Analytics dashboard
2. System displays for selected period:
   - **By Service Type:**
     - Swimming: revenue, direct costs, margin
     - Fitness: revenue, direct costs, margin
     - Basketball: revenue, direct costs, margin
     - Memberships: revenue
   - **By Funding Source:**
     - Direct pay revenue
     - Regional Center revenue
   - **Key Metrics:**
     - Total revenue
     - Total payroll cost
     - Gross margin
     - Revenue per coach hour

**Postconditions:** Owner has P&L visibility by profit center

---

### UC-5.2: View Coach Performance Analytics

**Primary Actor:** Owner

**Preconditions:** Time and revenue data exists

**Description:** Analyze individual coach performance

**Main Flow:**
1. Owner selects Coach Analytics
2. System displays for each coach:
   - Total hours worked (by service type)
   - Revenue generated
   - Client count
   - Cancellation rate (by their clients)
   - Revenue per hour
   - Utilization rate (booked vs. available)
3. Owner can compare coaches side-by-side
4. Owner can view trends over time

**Postconditions:** Owner has data for staffing and performance decisions

---

### UC-5.3: Generate Financial Report

**Primary Actor:** Owner

**Preconditions:** Period data exists

**Description:** Generate formatted financial reports

**Main Flow:**
1. Owner selects report type:
   - P&L by profit center
   - Revenue summary
   - Payroll summary
   - RC billing summary
   - Cash flow
2. Owner selects date range
3. System generates report
4. Owner can export to:
   - PDF
   - Excel
   - QuickBooks-compatible format

**Postconditions:** Report is generated for review or export

---

### UC-5.4: Monitor Key Metrics Dashboard

**Primary Actor:** Owner

**Preconditions:** System has operational data

**Description:** Real-time dashboard of business health metrics

**Main Flow:**
1. Owner views main dashboard
2. System displays real-time:
   - Today's bookings and revenue
   - This week's schedule fill rate
   - Outstanding RC billing
   - Pending payroll
   - Cancellation rate trend
   - Member count and churn
3. Visual alerts for:
   - Unusual cancellation spikes
   - Low utilization periods
   - Overdue RC payments

**Postconditions:** Owner has immediate visibility into operations

---

## 6. Staff Management

### UC-6.1: Manage Coach Profile

**Primary Actor:** Owner, Office Staff

**Preconditions:** Coach exists or is being added

**Description:** Create or update coach profile

**Main Flow:**
1. Admin navigates to Staff Management
2. Admin creates/edits coach profile:
   - Personal information
   - Certifications (swim instructor, CPR, etc.)
   - Services qualified to teach (swim, fitness, basketball)
   - Pay rates by service type
   - Availability/schedule preferences
   - Start date, status

**Postconditions:** Coach profile is current and complete

**Business Rule:** Coaches can be multi-functional across service types

---

### UC-6.2: Set Coach Availability

**Primary Actor:** Coach, Office Staff

**Preconditions:** Coach exists

**Description:** Define when a coach is available for scheduling

**Main Flow:**
1. User opens coach availability
2. User sets:
   - Regular weekly availability
   - Blackout dates (vacation, etc.)
   - Preferred vs. available hours
3. System uses this to:
   - Show/hide coach in booking options
   - Calculate utilization metrics
   - Prevent overbooking

**Postconditions:** Coach availability is reflected in scheduling

---

### UC-6.3: View Staff Schedule

**Primary Actor:** Coach, Owner

**Preconditions:** Coach is authenticated

**Description:** Coach views their own schedule

**Main Flow:**
1. Coach opens "My Schedule"
2. System displays:
   - Day/week/month view of their bookings
   - Client names and notes
   - Session types
   - Location (lane number, room)
3. Coach can see but not directly modify bookings

**Postconditions:** Coach has visibility into their schedule

---

## Cross-Cutting Concerns

### UC-X.1: Sync with Wellness Living

**Primary Actor:** System (automated)

**Description:** Synchronize permanent bookings from Wellness Living

**Main Flow:**
1. System polls Wellness Living API (or receives webhook)
2. System identifies new/changed bookings
3. System updates master schedule
4. Conflicts are flagged for manual review

---

### UC-X.2: Export to QuickBooks

**Primary Actor:** Owner

**Description:** Export financial data to QuickBooks

**Main Flow:**
1. Owner initiates QuickBooks export
2. Owner selects data type (payroll, invoices, payments)
3. System generates QB-compatible file
4. Owner imports into QuickBooks

---

### UC-X.3: Multi-Location Support (Future)

**Primary Actor:** Owner

**Description:** Manage multiple facility locations

**Main Flow:**
1. Owner can add new locations
2. Each location has its own:
   - Resources (lanes, rooms, courts)
   - Staff assignments
   - Schedule
3. Analytics can view by location or consolidated

---

## Appendix: Priority Matrix

| Use Case | Priority | Complexity | Notes |
|----------|----------|------------|-------|
| UC-2.1 Coach Logs Session | **P1** | Low | Replaces WhatsApp workflow |
| UC-2.4 Calculate Payroll | **P1** | Medium | Core pain point |
| UC-1.1 View Master Schedule | **P1** | Medium | Single source of truth |
| UC-4.1 Record RC Attendance | **P1** | Low | Government compliance |
| UC-4.2 Generate RC Billing | **P1** | Medium | Revenue critical |
| UC-5.1 Profit Center Dashboard | **P1** | Medium | Key visibility need |
| UC-1.4 Handle Cancellation | **P2** | Low | High frequency operation |
| UC-3.1 Register New Client | **P2** | Low | Foundational |
| UC-5.2 Coach Performance | **P2** | Medium | Operational insight |
| UC-1.2 Book Private Lesson | **P2** | Medium | Daily operation |
| UC-6.1 Manage Coach Profile | **P3** | Low | Admin function |
| UC-X.1 Wellness Living Sync | **P3** | High | Integration complexity |
| UC-X.2 QuickBooks Export | **P3** | Medium | Nice to have initially |

---

## Next Steps

1. Review and validate use cases with stakeholders
2. Identify MVP scope (P1 use cases)
3. Create wireframes for key screens
4. Define data model
5. Plan integration architecture with i360
