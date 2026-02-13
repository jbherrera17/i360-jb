# Profile Settings User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why Your Profile Matters

Your profile is the foundation of your Insight 360 experience. It determines how you appear to others, which department content you see, and what platform features are available to you. A complete profile ensures that dashboards, briefings, and workflows are personalized to your role and responsibilities. Platform administrators also use the profile page to test different organizational contexts through impersonation.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Set Display Name & Avatar** | Choose how you appear across the platform in chat, navigation, and activity logs |
| **View Role & Organization** | See your assigned access level, organization membership, and platform admin status |
| **Select Department** | Set your primary department to personalize content filtering throughout the platform |
| **Connect Social Platforms** | Link LinkedIn, X/Twitter, and Substack accounts for publishing from Insight 360 |
| **Impersonate (Act As)** | Platform admins can temporarily switch organization and role context for testing |
| **Toggle Dark Mode** | Switch between dark and light themes across all pages |
| **Track Onboarding** | View and manage your getting-started progress |

---

## Step by Step Use

### Updating Your Display Name

1. Navigate to the **Profile** page from the sidebar
2. In the **Profile Information** card, locate the **Display Name** field
3. Enter your preferred name (this is visible to other users in chat and activity logs)
4. Click **Save Changes** at the bottom of the form

### Choosing an Avatar

1. In the **Profile Information** card, find the **Choose Avatar** section at the top
2. Click on any emoji from the avatar picker to select it
3. Your selection appears in the large circular avatar preview on the left
4. Click **Save Changes** to apply

### Viewing Your Email

Your email address is displayed as a read-only field. This is your login identifier and cannot be changed from the profile page. Contact your administrator if you need to update it.

### Understanding Your Role

Your role is displayed as a colored badge and determines your access level:

- **Admin** (purple badge) -- Full access to all features including user management
- **User** (green badge) -- Standard access to all features
- **Viewer** (gray badge) -- Read-only access to dashboards and reports
- **Platform Admin** (gold badge) -- Synergi platform-level administrator (see Platform Role section below)

Roles are assigned by administrators and cannot be changed from the profile page.

### Setting Your Department

1. In the **Profile Information** card, locate the **Department** dropdown
2. Select your primary department from the list
3. Click **Save Changes**

Your department selection is critical for personalization:
- **Execute 120** will automatically filter content to your department on page load
- **Briefings** will generate department-specific daily intelligence
- **Agents, workflows, actions, and context assets** will be filtered to your department

### Viewing Your Organization

The **Organization** field displays the name of the organization you belong to. This is a read-only display showing your current organizational membership (e.g., "Synergi", "HealthyLifeCoach"). Organization assignment is managed by platform administrators.

### Platform Role (Platform Admins Only)

If you are a Synergi platform administrator, an additional **Platform Role** badge appears in your profile showing your platform-level access:

- **Super Administrator** -- Full platform control
- **Platform Administrator** -- Platform management access
- **Platform Support** -- Support-level platform access

This badge is only visible to users who have been designated as platform administrators.

### Viewing Member Since Date

At the bottom of the profile form, the **Member since** line displays the date your account was created, formatted as month, day, and year (e.g., "Member since January 15, 2025").

---

## Platform Connections

The **Platform Connections** card allows you to link external social accounts to enable publishing directly from Insight 360.

### Supported Platforms

| Platform | Icon Color | Purpose |
|----------|-----------|---------|
| **LinkedIn** | Blue | Professional content publishing |
| **X / Twitter** | Black | Social media posting |
| **Substack** | Orange | Newsletter publishing |

### Connecting an Account

1. In the **Platform Connections** card, find the platform you want to link
2. Click the **Connect** button next to it
3. You will be redirected to the platform's OAuth authorization page
4. Authorize Insight 360 to access your account
5. You will be redirected back to the Profile page with a success confirmation
6. The platform now shows **Connected as [your username]** with a green border

### Disconnecting an Account

1. Find the connected platform in the **Platform Connections** card
2. Click **Disconnect**
3. Confirm the disconnection when prompted
4. The platform reverts to a "Not connected" status

Platforms marked as "Coming soon" are not yet configured for OAuth and cannot be connected.

---

## Act As / Impersonation (Platform Admins Only)

The **Act As (Impersonation)** card is only visible to platform administrators. It allows you to temporarily assume a different organization and role context for testing and support purposes.

### Starting an Impersonation Session

1. In the **Act As (Impersonation)** card, select an **Organization** from the dropdown (shows organization name and subscription tier)
2. Select a **Role** from the available options: Owner, Admin, Consultant, Viewer, or User
3. Click **Start Impersonation**
4. A gold banner appears confirming your active impersonation: "Currently Acting As: [role] in [organization]"
5. All platform actions now use the impersonated context

### Ending an Impersonation Session

1. In the active impersonation banner, click **End Session**
2. Your context reverts to your original platform admin identity
3. A confirmation toast appears: "Impersonation ended"

**Important:** While impersonating, all navigation and module access reflects the impersonated organization and role. This is useful for verifying what different users see and can access.

---

## Preferences

### Dark Mode

1. In the **Preferences** card, find the **Dark Mode** toggle
2. Toggle the switch on for dark theme or off for light theme
3. The change applies immediately across all pages
4. Your preference is saved automatically in your browser

---

## Getting Started (Onboarding)

If you have not completed the onboarding process, the **Getting Started** card appears with a progress tracker showing three milestones:

1. **Complete your profile** -- Fill in your profile information
2. **Take the feature tour** -- Click "Start" to launch the guided tour of key features
3. **Run your first workflow** -- Click "Start" to navigate to Execute 120

Each completed milestone displays a green checkmark. Once all milestones are complete, the Getting Started card is hidden automatically.

To restart the onboarding process, click the **Restart Onboarding** button. You will be redirected to the onboarding wizard.

---

## Saving and Canceling Changes

- **Save Changes** -- Saves your display name, department, and avatar selections. A green toast notification confirms the update.
- **Cancel** -- Reverts the form to your last saved profile state without saving.

---

## Tips & Best Practices

- Keep your display name professional -- it is visible to other users in shared spaces like chat
- Set your department early -- it is required for Execute 120, briefings, and content filtering to work properly
- Complete onboarding -- the tour introduces features you might not discover on your own
- Connect social accounts before using content publishing workflows
- Platform admins should use impersonation to verify tier-based access before onboarding new organizations

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Profile changes not saving | Check your network connection. Ensure you click "Save Changes" and see the green confirmation toast. |
| Department dropdown is empty | The departments list is loaded from your organization. Contact your administrator if no departments appear. |
| OAuth connection fails | You will be redirected back with an error message. Verify that the platform is configured (not marked "Coming soon") and try again. |
| "Failed to load profile" error | Your authentication token may have expired. Log out and log back in. |
| Act As card not visible | The impersonation feature is only available to platform administrators. Regular users will not see this card. |
| Platform Role badge not showing | This badge only appears for users with platform admin status. It is not visible to regular admin, user, or viewer roles. |
| Avatar not updating in sidebar | After saving, the navigation sidebar refreshes automatically. If it does not, reload the page. |
| Dark mode not persisting | Ensure your browser allows localStorage. The theme preference is stored locally in your browser. |

---

## Related Documentation

- **Execute 120 User Guide** -- How department selection affects your Execute 120 dashboard
- **Soul Configuration User Guide** -- How organizational values and guardrails are managed
- **Platform Admin Guide** -- Managing organizations, tiers, and platform-level settings
- **Onboarding Guide** -- Detailed walkthrough of the getting-started wizard
