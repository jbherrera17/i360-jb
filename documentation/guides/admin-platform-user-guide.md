# Platform Administration User Guide

**For:** Synergi Platform Administrators
**Last Updated:** March 13, 2026

---

## Why Platform Administration Is Important

The Platform Administration dashboard is the central control panel for Synergi administrators to manage all organizations on the Insight 360 platform. It provides oversight of subscriptions, resource usage, module access, user accounts, voice settings, and platform-wide configuration across 7 tabs.

---

## What It Does

| Action | Description |
|--------|-------------|
| **View All Organizations** | See every organization on the platform with their tier and status |
| **Manage Users** | View all platform users, suspend accounts, and manage user status |
| **Manage Subscription Tiers** | Configure limits and features for each subscription level |
| **Control Module Access** | Enable or disable modules globally or per-organization |
| **Manage Platform Admins** | Add or remove Synergi super-administrators |
| **Configure Voice Settings** | Manage speech-to-text and text-to-speech models, voices, and feature toggles |
| **Platform Configuration** | Set platform name, default tier, trial duration, maintenance mode, and payment settings |
| **View Platform Statistics** | Monitor overall platform usage and health |

---

## Step by Step Use

### Page Header Controls

The page header includes:
- A **Help** button to open contextual documentation
- A **Refresh** button to reload all platform data across all tabs

### Maintenance Banner

When maintenance mode is enabled (via the Configuration tab), an alert banner appears at the top of the page:
- The banner reads: "Maintenance mode is active. Only platform admins can access the system."
- A **Disable** button on the banner allows you to turn off maintenance mode directly without navigating to the Configuration tab
- The banner is hidden when maintenance mode is inactive

### Viewing Organizations

1. Navigate to **Admin > Platform Admin** in the sidebar
2. The Organizations tab displays all tenant organizations
3. View tier, status, member count, client count, and creation date for each
4. Use the search box to filter organizations by name
5. Use the **Tier** dropdown to filter by subscription tier (Platform, Starter, Business, Enterprise, Agency)
6. Use the **Status** dropdown to filter by status (Active, Trial, Suspended)
7. Click an organization row to see detailed information

### Creating an Organization

1. On the Organizations tab, click the **Create Organization** button
2. Fill in the required organization details
3. Select the subscription tier
4. Click **Create Organization** to submit

### Changing an Organization's Tier

1. Find the organization in the list
2. Click the **Edit** button in the Actions column
3. Select the new tier from the dropdown
4. Click **Save Changes**
5. The organization's limits and module access will update immediately

### Managing Platform Users

The Users tab provides a complete view of all users across the platform. A **Create User** button in the section header allows platform admins to create new user accounts directly.

#### Creating a User

1. Click the **Users** tab
2. Click the **Create User** button in the section header
3. Fill in the user details (email, name, organization, role)
4. Click **Create User** to submit
5. The new user will appear in the users list

#### Viewing Users

1. Click the **Users** tab
2. View all users with their:
   - Email and display name
   - Account status (active, suspended, inactive)
   - Organization memberships
   - System role
   - Creation date
3. Use the summary cards to see total counts by status

#### Filtering Users

1. **Search**: Type in the search box to find users by email or name
2. **Status Filter**: Select "Active", "Suspended", or "Inactive" to filter by account status
3. **Organization Filter**: Select an organization to see only its members

#### Understanding User Status

| Status | Description |
|--------|-------------|
| **Active** | User can log in and access the platform normally |
| **Suspended** | User cannot log in; shown a suspension message at login |
| **Inactive** | Account is deactivated; user cannot log in |
| **Pending Deletion** | Account is scheduled for permanent deletion |

#### Suspending a User

1. Find the user in the Users tab
2. Click the **Suspend** button
3. Enter a reason for the suspension (optional but recommended)
4. Click **Suspend User** to confirm
5. The user will immediately be unable to log in

**Note:** Suspended users see a clear message explaining why their account is suspended when they attempt to log in.

#### Reactivating a User

1. Filter by status "Suspended" to find suspended users
2. Click the **Reactivate** button next to the user
3. Confirm the action
4. The user can now log in again

#### Viewing User Details

1. Click the **eye icon** in the Actions column
2. View complete user information including:
   - All organization memberships with roles
   - Subscription tier of each organization
   - Suspension history (if applicable)
   - Platform admin status

#### Understanding Orphaned Users

Users with "No organization" (shown in the No Org stat) are users who don't belong to any active organization. This typically happens when:

- Their organization was deleted
- They were removed from all organizations
- Their membership was deactivated

**Automatic Suspension:** When an organization is deleted, users who have no other active organization memberships are automatically suspended to prevent abandoned accounts.

### Managing Subscription Tiers

1. Click the **Tiers** tab
2. View all tier definitions with their current limits
3. Click **Edit** on any tier to modify:
   - Maximum members
   - Maximum clients (Agency tier only)
   - Maximum agents, workflows, skills
   - Feature flags (SSO, white-label, API access)
4. Click **Save** to apply changes

### Managing Modules

1. Click the **Modules** tab
2. View all platform modules with their tier requirements
3. Toggle modules on/off globally using the Enable switch
4. Click a module to set per-organization overrides
5. Adjust minimum tier or role requirements as needed

### Adding Platform Administrators

1. Click the **Admins** tab
2. Click **Add Admin**
3. Search for the user by email
4. Select their role:
   - **Super Admin**: Full platform control
   - **Admin**: Manage orgs and tiers
   - **Support**: View-only with limited actions
5. Click **Add** to grant platform admin access

### Configuring Voice Settings

The Voice tab provides full control over speech-to-text (STT) and text-to-speech (TTS) features used in Higgins chat.

#### Voice Service Status

At the top of the tab, a status card shows:
- Whether the voice service is **running** or **unavailable**
- The number of available STT models, TTS models, and voices
- If the service is unavailable, it indicates that the `OPENAI_API_KEY` may not be configured

#### Voice Feature Controls

Toggle voice features on or off for the entire platform:
1. **Enable Voice Input (STT)** -- Allows users to use their microphone for speech-to-text in Higgins chat
2. **Enable Voice Output (TTS)** -- Allows users to hear AI responses read aloud
3. Click **Save** to apply changes

#### Speech-to-Text (STT) Settings

1. **Default STT Model** -- Select from:
   - **GPT-4o Transcribe** (Most Accurate)
   - **GPT-4o Mini Transcribe** (Fast)
   - **Whisper** (Legacy/Budget)
2. **Max Audio Duration** -- Set the maximum recording length in seconds (10--600) before auto-stop

#### Text-to-Speech (TTS) Settings

1. **Default TTS Model** -- Select from:
   - **GPT-4o Mini TTS** (Steerable)
   - **TTS-1** (Standard)
   - **TTS-1 HD** (High Quality)
2. **Default Voice** -- Choose the platform default voice:
   - **Alloy** -- Neutral and balanced
   - **Echo** -- Warm and conversational
   - **Fable** -- British and narrative
   - **Onyx** -- Deep and authoritative
   - **Nova** -- Friendly and energetic (default)
   - **Shimmer** -- Clear and expressive
3. **Default Speed** -- Use the slider to set playback speed from 0.5x to 2.0x (default 1.0x)
4. **TTS Voice Instructions** -- Enter custom instructions for the GPT-4o Mini TTS model to control tone, pacing, and style (e.g., "Speak in a professional, calm tone. Pause briefly between sentences.")

#### Voice Preview

Test the current voice configuration before saving:
1. Enter custom text in the preview input field (or use the default greeting)
2. Click **Preview** to hear the text spoken with the currently selected voice and model
3. Click **Stop** to halt playback

#### Available Voices Reference

A reference table at the bottom of the Voice tab lists all available voices with:
- Voice name
- Character description
- A **Preview** button to hear a sample of each voice individually

### Configuring Platform Settings

The Configuration tab controls platform-wide settings.

#### Platform Settings

1. **Platform Name** -- Set the display name for the platform (default: "Insight 360")
2. **Default Tier for New Orgs** -- Select which subscription tier is assigned to newly created organizations (Starter or Business)
3. **Trial Duration (days)** -- Set the number of trial days for new organizations (0--90, default: 14)
4. **Enable Maintenance Mode** -- When checked, only platform admins can access the system. A maintenance banner appears at the top of the admin page, and all non-admin users are locked out
5. **Enable Stripe Payments** -- Toggle Stripe payment integration on or off
6. **Maintenance Message** -- Customize the message displayed to users during maintenance (e.g., "System is under maintenance...")
7. Click **Save** to apply all configuration changes

### Viewing Platform Statistics

1. The top of the page shows summary cards:
   - Total organizations (with tier breakdown)
   - Total users (with status breakdown)
   - Total clients (Agency tier)
   - Total agents created
2. Click the Users tab for detailed user statistics
3. Use filters to analyze specific segments

---

## Tips & Best Practices

- **Review suspended users regularly**: Check the Suspended filter to follow up on account issues
- **Monitor orphaned users**: Users with no organization may need to be assigned to a new org or cleaned up
- **Document suspension reasons**: Always include a reason when suspending users for audit trails
- **Review tier usage monthly**: Identify organizations needing upgrades before they hit limits
- **Use the Support admin role**: Appropriate for customer service team members who need view access

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot see Platform Admin menu | Verify your account has platform admin role in database |
| Organization tier change not applying | Check for active caching - refresh the organization's page |
| Module toggle not saving | Ensure you have super_admin or admin role |
| Statistics not loading | Check browser console for API errors, verify authentication |
| Cannot suspend user | Verify you have admin write permissions (not Support role) |
| User still logged in after suspension | Their session continues until they log out; suspension blocks new logins |
| Voice service status shows unavailable | Ensure `OPENAI_API_KEY` is configured in the server environment variables |
| Voice preview not playing | Check browser audio permissions and ensure TTS is enabled in Voice Feature Controls |
| Voice config changes not taking effect | Click the **Save** button in Voice Feature Controls after making changes |
| Maintenance mode not activating | Save the Configuration tab settings, then refresh the page to see the banner |
| Configuration Save button not responding | Check browser console for API errors; verify you have super_admin or admin role |

---

## What Happens When an Organization is Deleted

When a platform admin or organization owner deletes an organization:

1. **Data Removal**: All organization data is permanently deleted (agents, workflows, clients, etc.)
2. **Membership Records**: Organization membership records are removed
3. **User Impact**:
   - Users who belong to **other organizations** keep their accounts active
   - Users who **only** belonged to the deleted organization are automatically **suspended**
   - Suspended users see a message: "Your account has been suspended: Organization [name] was deleted"
4. **Recovery**: Platform admins can reactivate suspended users and add them to a new organization

---

## Access Requirements

- User must be in the `platform_admins` table
- Roles: `super_admin`, `admin`, or `support`
- Support role has view-only access to most features
- User management (suspend/reactivate) requires `admin` or `super_admin` role

### User Management API Access (Phase 70 Hardening)

All `/api/users` endpoints now enforce explicit authorization:

| Operation | Required Access |
|-----------|----------------|
| View user list or individual user | Platform admin, OR org owner/admin (scoped to their org) |
| Update a user's profile | Platform admin only |
| Update a user's org/platform assignments | Platform admin only |

Org admins who call the user list endpoints must pass their organization ID (via the `x-org-id` header or `org_id` query parameter). Without it, the request will be rejected even for org admins.

### Role Change Audit Trail (Phase 70)

All role and permission changes across the platform are now recorded in the `role_change_audit` table. This includes:
- Platform admin grants, updates, and removals
- Organization membership invitations, role changes, and removals
- Ownership transfers
- Client portal access grants and removals

Platform admins can query the full audit trail. Org admins can query audit entries scoped to their own organization. See the [Role Audit Technical Guide](./role-audit-technical-guide.md) for API details.
