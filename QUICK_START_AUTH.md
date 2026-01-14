# Quick Start: Authentication Setup

This guide helps you get authentication working immediately with minimal setup.

## Step 1: Run Minimal Database Setup

1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Copy and paste the content from `database-minimal-auth-setup.sql`
4. Click "Run" to execute the script

This will add:
- `password_hash` column to store encrypted passwords
- `role_id` column for basic role support
- A basic `roles` table with a default "Cleaner" role
- Necessary indexes for performance

## Step 2: Set a Password for Your Account

After running the SQL script, you need to set a password for your account. You have two options:

### Option A: Using SQL (Quick)

Run this in Supabase SQL Editor:

```sql
-- Replace with your actual phone number and desired password
-- The password shown here will be hashed (this example sets password to 'password123')
UPDATE cleaners
SET password_hash = '482c811da5d5b4bc6d497ffa98491e38'  -- This is SHA-256 hash of 'password123'
WHERE phone_number = 'YOUR_PHONE_NUMBER';
```

**To generate your own password hash:**

1. Go to https://emn178.github.io/online-tools/sha256.html
2. Enter your desired password
3. Copy the hash output
4. Use it in the SQL above

### Option B: Using Forgot Password Flow

1. Open the app
2. Click "Sign In"
3. Click "Forgot your password?"
4. Enter your phone number and employee ID
5. Set your new password

## Step 3: Test Login

1. Open the app
2. Click "Sign In"
3. Enter your phone number and password
4. You should be logged in!

## Common Issues

### Error: "Could not find the 'password_hash' column"
- **Solution:** You haven't run the SQL script yet. Go back to Step 1.

### Error: "Role Not Assigned"
- **Solution:** Your account doesn't have a role. Run this SQL:
```sql
UPDATE cleaners
SET role_id = (SELECT id FROM roles WHERE name = 'cleaner')
WHERE phone_number = 'YOUR_PHONE_NUMBER';
```

### Error: "No account found with this phone number"
- **Solution:** Check that your phone number is correctly stored in the database. Run:
```sql
SELECT name, phone_number FROM cleaners;
```

## Next Steps

Once basic authentication is working, you can run the full RBAC migration (`database-rbac-migration.sql`) to get:
- Multiple role levels (Cleaner, Supervisor, Manager, Admin)
- Granular permissions for each feature
- Account locking after failed login attempts
- Last login tracking
- And more security features

See `RBAC_SETUP_GUIDE.md` for details on the full system.

## Testing Different Phone Formats

The system accepts phone numbers in any format but stores them as digits only. These are all equivalent:
- `5551234567`
- `(555) 123-4567`
- `555-123-4567`
- `555.123.4567`

Make sure the phone number in the database matches what you're entering (digits only, no formatting).
