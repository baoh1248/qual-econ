
# Cleaner Authentication System Implementation

## Overview

This implementation adds a complete authentication system for cleaners that automatically populates the cleaner management page in the supervisor dashboard when new cleaners sign up.

## Features Implemented

### 1. **Database Integration**
- Added `user_id` column to the `cleaners` table linking to Supabase Auth users
- Created database trigger that automatically creates cleaner records when users sign up with role='cleaner'
- Implemented proper Row Level Security (RLS) policies for data protection

### 2. **Authentication Screens**
- **Cleaner Sign Up** (`/auth/cleaner-signup`): Complete registration form with:
  - Basic information (name, email, phone, employee ID)
  - Security clearance level selection
  - Specialties selection
  - Default hourly rate
  - Emergency contact information
  - Password creation with validation
  
- **Cleaner Sign In** (`/auth/cleaner-signin`): Login screen with:
  - Email and password authentication
  - Password visibility toggle
  - Forgot password functionality
  - Email verification check

### 3. **Automatic Data Synchronization**
When a cleaner signs up:
1. User account is created in Supabase Auth
2. Database trigger automatically creates a cleaner record in the `cleaners` table
3. Cleaner information immediately appears in the supervisor's cleaner management page
4. Real-time updates ensure instant visibility

### 4. **Security Features**
- Email verification required before first sign-in
- Secure password hashing (handled by Supabase)
- Row Level Security policies ensure data protection
- Session management with automatic token refresh

## Database Schema Changes

### Migration: `add_auth_to_cleaners`

```sql
-- Added user_id column to link cleaners with auth users
ALTER TABLE cleaners ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Created trigger function to auto-create cleaner records on signup
CREATE FUNCTION handle_new_cleaner_signup() ...

-- Updated RLS policies for proper access control
CREATE POLICY "Public can view all cleaners" ...
CREATE POLICY "Users can insert their own cleaner profile" ...
CREATE POLICY "Users can update their own cleaner profile" ...
```

## User Flow

### For New Cleaners:
1. Navigate to the app homepage
2. Click "Cleaner Sign Up"
3. Fill out the registration form with all required information
4. Submit the form
5. Receive confirmation email
6. Click verification link in email
7. Sign in with credentials
8. Access cleaner dashboard

### For Supervisors:
1. New cleaner signs up
2. Cleaner record automatically appears in "Cleaner Management" page
3. All cleaner information is immediately available
4. Can view, edit, or manage the new cleaner's profile

## File Structure

```
app/
├── auth/
│   ├── cleaner-signup.tsx    # New cleaner registration
│   └── cleaner-signin.tsx    # Cleaner login
├── cleaner/
│   └── index.tsx              # Updated with auth check
├── supervisor/
│   └── cleaners.tsx           # Automatically shows new cleaners
├── integrations/
│   └── supabase/
│       └── client.ts          # Supabase configuration
└── index.tsx                  # Updated homepage with auth options
```

## Key Components

### 1. Sign Up Form (`cleaner-signup.tsx`)
- Comprehensive form with validation
- Security level selection with visual indicators
- Specialty multi-select with chips
- Emergency contact fields
- Password strength requirements
- Email verification flow

### 2. Sign In Form (`cleaner-signin.tsx`)
- Simple email/password login
- Password visibility toggle
- Forgot password functionality
- Email verification check
- Automatic redirect to dashboard

### 3. Database Trigger
Automatically creates cleaner records with:
- User metadata from sign-up form
- Auto-generated employee ID if not provided
- Default values for optional fields
- Proper timestamps

## Security Considerations

### Row Level Security (RLS) Policies:
- **Public Read**: Anyone can view cleaner profiles (for supervisor dashboard)
- **Self Insert**: Users can only create their own cleaner profile
- **Self Update**: Users can only update their own profile
- **Authenticated Update**: Authenticated users (supervisors) can update any cleaner
- **Authenticated Delete**: Authenticated users (supervisors) can delete cleaners

### Data Protection:
- Passwords are never stored in plain text
- Email verification required before access
- Session tokens automatically refresh
- Secure cookie storage for sessions

## Testing the Implementation

### Test Sign Up Flow:
1. Go to homepage
2. Click "Cleaner Sign Up"
3. Fill in test data:
   - Name: "Test Cleaner"
   - Email: "test@example.com"
   - Phone: "+1 (555) 123-4567"
   - Password: "test123456"
   - Security Level: "Low"
4. Submit form
5. Check email for verification link
6. Click verification link
7. Sign in with credentials

### Verify in Supervisor Dashboard:
1. Navigate to Supervisor Dashboard
2. Go to "Cleaner Management"
3. Verify new cleaner appears in the list
4. Check that all information is correctly displayed

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Future Enhancements

Potential improvements:
1. **Role-based access control**: Separate supervisor and cleaner roles
2. **Profile photos**: Allow cleaners to upload profile pictures
3. **Two-factor authentication**: Add extra security layer
4. **Social login**: Google, Apple, Facebook authentication
5. **Onboarding flow**: Guided tour for new cleaners
6. **Email templates**: Customize verification and welcome emails
7. **Admin approval**: Require supervisor approval before activation

## Troubleshooting

### Common Issues:

**Issue**: Cleaner doesn't appear in supervisor dashboard
- **Solution**: Check that the trigger is properly installed and the user signed up with role='cleaner'

**Issue**: Email verification not working
- **Solution**: Check Supabase email settings and ensure SMTP is configured

**Issue**: Sign in fails after verification
- **Solution**: Ensure email_confirmed_at is set in auth.users table

**Issue**: RLS policies blocking access
- **Solution**: Review policies and ensure proper authentication

## API Reference

### Supabase Auth Methods Used:

```typescript
// Sign up
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed',
    data: { role: 'cleaner', ...metadata }
  }
});

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Sign out
await supabase.auth.signOut();

// Get session
await supabase.auth.getSession();

// Password reset
await supabase.auth.resetPasswordForEmail(email);
```

## Support

For issues or questions:
1. Check Supabase logs in the dashboard
2. Review browser console for errors
3. Verify database trigger is active
4. Check RLS policies are correctly configured

## Conclusion

This implementation provides a complete, secure authentication system that seamlessly integrates cleaner sign-ups with the supervisor dashboard. The automatic synchronization ensures that supervisors always have up-to-date information about their team members.
