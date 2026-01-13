# Schedule Activity Log Setup

## Overview
The schedule activity log tracks all modifications to the schedule, including:
- Shifts created, edited, or deleted
- Cleaners added or removed from shifts
- Shifts unassigned due to approved time off
- And more!

## Setup Instructions

### Step 1: Create the Database Table

You **MUST** run the SQL migration to create the `schedule_change_logs` table before the activity log will work.

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of: `supabase/migrations/create_schedule_change_logs.sql`
5. Click **Run** to execute the SQL

The migration will create:
- The `schedule_change_logs` table
- Indexes for performance
- Row Level Security policies

### Step 2: Verify the Table Was Created

Run this query in the SQL Editor to verify:

```sql
SELECT * FROM schedule_change_logs LIMIT 1;
```

If you see a result (even if empty), the table was created successfully!

### Step 3: Test the Activity Log

1. Go to the **Schedule** screen in the app
2. Click the **clock icon** (⏰) in the top right header
3. The activity log modal should open
4. If the table is set up correctly, you'll see:
   - "No recent activity" (if nothing has been logged yet)
   - OR a list of recent changes

### Step 4: Generate Some Activity

To test that logging is working:

1. Go to **Time Off Requests** screen
2. Approve a time off request that has shifts during that period
3. The system will automatically:
   - Unassign the cleaner from those shifts
   - Log each unassignment to the activity log
4. Go back to **Schedule** screen
5. Click the clock icon
6. You should now see the logged changes!

## Troubleshooting

### "Database table not created yet" Error

This means the SQL migration hasn't been run. Follow **Step 1** above.

### Table Created But No Changes Showing

- Make sure you've approved at least one time off request that unassigns shifts
- The log only captures changes made AFTER the table was created
- Try approving a new time off request to generate activity

### Permission Errors

If you get permission errors when trying to view the log:
1. Check that the RLS policies were created (they're in the SQL migration)
2. Make sure you're authenticated when viewing the log
3. You may need to adjust the RLS policies for your specific setup

## SQL Migration Location

The full SQL migration is located at:
```
supabase/migrations/create_schedule_change_logs.sql
```

## Features

Once set up, the activity log will show:
- ✅ **What changed**: Clear description of each modification
- ✅ **Who made it**: Shows "Supervisor" or the user who made the change
- ✅ **When**: Relative timestamps like "5m ago", "2h ago", "1d ago"
- ✅ **Where**: Client name, building name, and cleaner names involved
- ✅ **Why**: For time off unassignments, shows the reason for time off

## Future Enhancements

You can extend the logging system to track:
- Manual shift creation/editing (call `logShiftCreated()` or `logShiftEdited()`)
- Shift status changes
- Bulk operations
- Schedule imports
- Any other schedule modifications!

See `utils/scheduleChangeLogger.ts` for all available logging functions.
