# Team Members User Guide

**For:** Insight 360 Users
**Last Updated:** March 13, 2026

---

## Why Team Members Is Important

Team Members management enables collaboration within your organization. By inviting colleagues and assigning appropriate roles, you can control who has access to your organization's data, clients, and AI capabilities. Proper role assignment ensures security while enabling productive teamwork.

---

## What It Does

| Action | Description |
|--------|-------------|
| **View Members** | See all team members in your organization |
| **Invite Members** | Add new users to your organization |
| **Assign Roles** | Set appropriate access levels for each member |
| **Update Roles** | Change a member's role as responsibilities evolve |
| **Remove Members** | Remove users who no longer need access |
| **Leave Organization** | Remove yourself from an organization |

---

## Step by Step Use

### Viewing Team Members

1. Navigate to **Team Members** from the sidebar
2. Select your organization from the dropdown (if you belong to multiple)
3. View the member table showing:
   - Member name and email
   - Role badge (Owner, Admin, Consultant, Viewer)
   - Status (Active, Pending, Inactive)
   - Join date

### Inviting a New Member

1. Click the **Invite Member** button
2. Enter the member's email address
3. Select an appropriate role:
   - **Admin**: Full access, can manage members and content
   - **Member**: Can work with agents, workflows, and data
   - **Viewer**: Read-only access
4. Click **Send Invitation**

**Note:** If the email address is not yet registered on the platform, Insight 360 will automatically send an invitation email and create the account when the user accepts. You do not need to ask them to register first.

### Changing a Member's Role

1. Find the member in the table
2. Click the **Edit** button (pencil icon)
3. Select the new role from the dropdown
4. Click **Save Changes**

**Notes:**
- Only owners and admins can change member roles.
- You cannot change the owner's role unless you are the owner.
- Admins cannot promote anyone to owner. Ownership transfer is a separate, explicit operation that only the current owner can perform.
- All role changes are recorded in the platform audit trail.

### Removing a Member

1. Find the member in the table
2. Click the **Remove** button (trash icon)
3. Confirm the removal in the dialog

**Warning:** Removed members immediately lose access to the organization.

### Leaving an Organization

1. Click the **Leave Organization** button
2. Confirm your decision

**Note:** Organization owners cannot leave. Transfer ownership first or delete the organization.

---

## Role Descriptions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Organization creator/primary admin | Full access, can delete org, manage all members, transfer ownership |
| **Admin** | Trusted team lead | Full access except deleting org, can invite/remove members, change roles (cannot promote to owner) |
| **Member** | Active team member | Can create/edit clients, run agents, use workflows and data |
| **Viewer** | Read-only observer | Can view data but cannot make changes |

**Important:** Ownership transfer is intentionally restricted. An admin cannot elevate themselves or any other user to owner. Only the current owner can transfer ownership. This protects against unauthorized privilege escalation.

---

## Tips & Best Practices

- **Principle of least privilege**: Assign the minimum role needed for each person's responsibilities
- **Multiple admins**: Consider having at least two admins in case one is unavailable
- **Regular audits**: Periodically review member list and remove inactive users
- **Clear communication**: Inform members when their role changes

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't invite member | Verify the email address is correct. The system will create the account if it doesn't exist yet. |
| Can't see Edit/Remove buttons | You need Admin or Owner role to manage members |
| Can't change owner's role | Only the owner can initiate ownership transfer. Contact the current owner or a platform admin. |
| "Only the current owner can transfer ownership" error | You are attempting to set a role to "owner" as a non-owner admin. Only the current owner may do this. |
| Owner can't leave | Owners must transfer ownership to another member before they can leave. |
| Invitation not appearing | The invited user should check their email and accept the invitation link. |
| Member status shows "Pending" | The member has been invited but has not accepted the invitation email yet. |
