# Role-Based Access Control (RBAC) Setup Guide

This guide explains how to set up and use the role-based access control system for the cleaning management application.

## Overview

The RBAC system provides:
- 4 role levels: Cleaner, Supervisor, Manager, Admin/Owner
- Password-based authentication with phone number
- Role-based routing (cleaners → cleaner interface, management → supervisor interface)
- Fine-grained permissions for each feature
- Route protection for all pages
- Admin tools for user management

## Role Hierarchy

| Role | Level | Description | Interface |
|------|-------|-------------|-----------|
| Cleaner | 1 | Field worker with limited access to assigned tasks | Cleaner Interface |
| Supervisor | 2 | Team leader managing cleaners and reviewing work | Management Interface |
| Manager | 3 | Manager with full operational access | Management Interface |
| Admin/Owner | 4 | Full system access and control | Management Interface |

## Setup Instructions

### 1. Run Database Migrations

Execute the following SQL scripts in your Supabase SQL Editor **in this order**:

#### Step 1: Run RBAC Migration
```bash
# File: database-rbac-migration.sql
```

This script will:
- Create `roles`, `permissions`, and `role_permissions` tables
- Add `role_id` and `password_hash` columns to the `cleaners` table
- Populate all roles and permissions based on the permission matrix
- Create helper functions for permission checking
- Set default role for existing cleaners

#### Step 2: Run RLS Policies (Optional but Recommended)
```bash
# File: database-rls-policies.sql
```

This script will:
- Drop overly permissive "Allow all operations" policies
- Create role-based access control policies
- Restrict data access based on user roles

**Note:** The current RLS policies are basic. For production, you'll want to implement more granular policies based on your specific requirements.

### 2. Set Up Initial Admin Account

After running the migrations, you need to set up at least one admin account:

#### Option A: Using the Admin Setup Page (Recommended)

1. **Temporarily bypass authentication** to access the admin setup page:
   - Comment out the auth check in `/app/supervisor/_layout.tsx`
   - Navigate to `/supervisor/admin-setup`

2. **Configure your admin account:**
   - Select a user from the list
   - Choose "Admin/Owner" role
   - Set a strong password
   - Click "Save Changes"

3. **Re-enable authentication** in the layout file

4. **Test login** with your new admin credentials

#### Option B: Using SQL

If you prefer to set up the admin account directly via SQL:

```sql
-- First, get the admin role ID
SELECT id FROM roles WHERE name = 'admin';

-- Then update a cleaner record with admin role and password
-- Replace the values with actual data
UPDATE cleaners
SET
  role_id = '<admin-role-id-from-above>',
  password_hash = '<password-hash>'  -- See note below on generating hash
WHERE phone_number = '<your-phone-number>';
```

**Generating Password Hash:**
The password is hashed using SHA-256. You can generate it using:
- Node.js: `crypto.createHash('sha256').update('yourpassword').digest('hex')`
- Online tool (not recommended for production): Any SHA-256 hash generator
- The Admin Setup page (which handles hashing automatically)

### 3. Configure Additional Users

Once you have admin access:

1. Log in to the management interface
2. Navigate to Settings → Admin Setup (or directly to `/supervisor/admin-setup`)
3. For each user:
   - Select the user
   - Assign appropriate role (Cleaner, Supervisor, Manager, Admin)
   - Set their password
   - Save changes

## Permission Matrix

The system implements the following permission levels:

### Job Viewing
- **Cleaner:** View only assigned jobs
- **Supervisor:** View all jobs for team
- **Manager:** View all jobs company-wide
- **Admin:** Full access/control

### Job Creation/Editing
- **Cleaner:** None
- **Supervisor:** Create/edit/delete jobs for cleaners
- **Manager:** Full access
- **Admin:** Full access/control

### Job Completion Reporting
- **Cleaner:** Submit completion forms, photos, notes
- **Supervisor:** Review and approve cleaner submissions
- **Manager:** Full access
- **Admin:** Full access/control

### Payroll
- **Cleaner:** View own hours & pay summary
- **Supervisor:** None
- **Manager:** View all payroll
- **Admin:** Full access/control (including edit)

### Client Management
- **Cleaner:** None
- **Supervisor:** View assigned clients only
- **Manager:** View/edit clients
- **Admin:** Full access/control

### And many more... (see permission matrix image for complete list)

## Authentication Flow

### Login Process

1. User enters phone number and password on the login page (`/auth/login`)
2. System looks up user in the `cleaners` table by phone number
3. Password is hashed and compared with stored hash
4. Account status checks:
   - Is the account active?
   - Is there a role assigned?
   - Is the account locked due to failed attempts?
5. If valid, session is created in AsyncStorage
6. User is routed based on role:
   - **Cleaner (Level 1)** → `/cleaner` interface
   - **Supervisor/Manager/Admin (Level 2-4)** → `/supervisor` interface

### Security Features

- **Password Hashing:** SHA-256 hashing for password storage
- **Failed Login Attempts:** Account locks for 15 minutes after 5 failed attempts
- **Route Protection:** All routes check authentication before rendering
- **Role Verification:** Management routes require minimum role level
- **Session Management:** Secure session storage in AsyncStorage

## Using the System

### For Administrators

#### Setting Up New Users
1. Create user record in the `cleaners` table (if not exists)
2. Use Admin Setup page to assign role and password
3. Share credentials with the user securely

#### Changing User Roles
1. Navigate to Admin Setup page
2. Select user
3. Change role
4. Save changes
5. User's permissions update immediately on next login

#### Resetting Passwords
1. Navigate to Admin Setup page
2. Select user
3. Enter new password
4. Save changes

### For Users

#### First Time Login
1. Navigate to the app
2. Click "Sign In"
3. Enter phone number and password (provided by admin)
4. System routes you to appropriate interface

#### Forgot Password
- Contact your administrator to reset password
- Admin can reset via Admin Setup page

### For Developers

#### Checking Permissions in Code

```typescript
import { hasPermission, getPermissionLevel } from '../utils/permissions';
import { PERMISSIONS } from '../utils/permissions';

// Check if user has permission
const canManageJobs = await hasPermission(PERMISSIONS.JOB_CREATION);

// Get specific permission level
const level = await getPermissionLevel(PERMISSIONS.JOB_VIEWING);
if (level === 'view_company_wide') {
  // Show all jobs
}
```

#### Using Auth Hooks

```typescript
import { useAuth, useProtectedRoute, useRoleProtectedRoute } from '../hooks/useAuth';
import { ROLE_LEVELS } from '../utils/auth';

// Basic auth check
const { user, isAuthenticated, logout } = useAuth();

// Protect a route (requires login)
const { loading, session } = useProtectedRoute();

// Protect with role requirement
const { loading, session, hasAccess } = useRoleProtectedRoute(ROLE_LEVELS.SUPERVISOR);
```

#### Using Permission Hooks

```typescript
import { useHasPermission, usePermissionLevel } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';

// Check permission
const { allowed, loading } = useHasPermission(PERMISSIONS.PAYROLL_VIEW);

// Get permission level
const { level, loading } = usePermissionLevel(PERMISSIONS.JOB_VIEWING);
```

## Files Overview

### Database Scripts
- `database-rbac-migration.sql` - Creates roles, permissions, and updates schema
- `database-rls-policies.sql` - Implements row-level security policies

### Utilities
- `app/utils/auth.ts` - Authentication utilities (password hashing, session management)
- `app/utils/permissions.ts` - Permission checking utilities

### Hooks
- `app/hooks/useAuth.ts` - React hooks for authentication
- `app/hooks/usePermissions.ts` - React hooks for permission checking

### Components
- `app/auth/login.tsx` - Unified login page for all roles
- `app/supervisor/admin-setup.tsx` - Admin tool for user management

### Protected Layouts
- `app/cleaner/_layout.tsx` - Protected cleaner interface
- `app/supervisor/_layout.tsx` - Protected management interface (requires supervisor+)

## Troubleshooting

### Issue: "No account found with this phone number"
- **Solution:** Check that the phone number is registered in the `cleaners` table
- Ensure phone number format matches (no spaces, dashes, or special characters)

### Issue: "Your account does not have a password set"
- **Solution:** Contact administrator to set password via Admin Setup page

### Issue: "Your account does not have a role assigned"
- **Solution:** Contact administrator to assign role via Admin Setup page

### Issue: "Account Locked" after failed login attempts
- **Solution:** Wait 15 minutes or contact administrator to manually unlock
- Admin can unlock by running: `UPDATE cleaners SET failed_login_attempts = 0, locked_until = NULL WHERE phone_number = '<phone>';`

### Issue: Can't access Admin Setup page
- **Solution:** Ensure your account has admin role (level 4)
- Check that you're logged in with admin credentials

### Issue: Route redirects to wrong interface
- **Solution:** Check your role level in the database
- Cleaners (level 1) go to `/cleaner`, others go to `/supervisor`

## Security Best Practices

1. **Use Strong Passwords:** Require minimum 6 characters (recommend 8+)
2. **Regular Password Changes:** Implement password rotation policy
3. **Audit Logs:** Monitor the `last_login` field for unusual activity
4. **Role Review:** Periodically review user roles and remove unnecessary access
5. **RLS Policies:** Customize RLS policies for your specific security requirements
6. **Secure Communication:** Always use HTTPS in production
7. **Environment Variables:** Never commit sensitive data (API keys, etc.)

## Next Steps / Future Enhancements

- [ ] Implement two-factor authentication (2FA)
- [ ] Add password reset via SMS/email
- [ ] Create audit log for sensitive operations
- [ ] Implement team-based restrictions for supervisors
- [ ] Add session timeout and automatic logout
- [ ] Create role management UI for admins
- [ ] Implement field-level permissions (hide salary info, etc.)
- [ ] Add IP whitelisting for admin accounts
- [ ] Implement refresh tokens for longer sessions
- [ ] Add biometric authentication for mobile

## Support

For issues or questions:
1. Check this documentation first
2. Review the permission matrix
3. Check database logs in Supabase
4. Contact the development team

---

**Last Updated:** 2026-01-13
**Version:** 1.0.0
