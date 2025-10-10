
# Real-Time Synchronization Between Supervisor Dashboard and Cleaner App

## Overview

This system enables real-time data synchronization between the Supervisor Dashboard and the Cleaner App using Supabase Realtime. When a supervisor schedules, updates, or deletes a shift, the changes are immediately reflected in the cleaner's app.

## Architecture

### Components

1. **`hooks/useRealtimeSync.ts`** - Real-time subscription hook for receiving database changes
2. **`hooks/useSupabaseScheduleSync.ts`** - Sync hook for pushing changes to Supabase
3. **Supabase Realtime** - WebSocket-based real-time database change notifications

### Data Flow

```
Supervisor Dashboard → Supabase Database → Real-time Broadcast → Cleaner App
```

## Setup Instructions

### 1. Enable Realtime for the schedule_entries table

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable realtime for schedule_entries table
alter publication supabase_realtime add table schedule_entries;
```

### 2. Verify RLS Policies

Make sure the `schedule_entries` table has proper RLS policies:

```sql
-- Allow authenticated users to read their own shifts
create policy "Users can view their assigned shifts"
on schedule_entries for select
to authenticated
using (
  auth.uid()::text = any(cleaner_ids)
  or auth.jwt() ->> 'role' = 'supervisor'
);

-- Allow supervisors to insert/update/delete shifts
create policy "Supervisors can manage shifts"
on schedule_entries for all
to authenticated
using (auth.jwt() ->> 'role' = 'supervisor')
with check (auth.jwt() ->> 'role' = 'supervisor');
```

## Usage

### Cleaner App (Receiving Changes)

The cleaner app automatically subscribes to real-time changes:

```typescript
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

// In your component
const { isConnected, lastSyncTime, manualSync } = useRealtimeSync({
  enabled: true,
  cleanerName: 'Sarah Johnson', // Filter for specific cleaner
  onSyncComplete: () => {
    console.log('Sync completed');
    loadShifts(); // Refresh UI
  },
  onError: (error) => {
    console.error('Sync error:', error);
  },
});
```

### Supervisor Dashboard (Sending Changes)

The supervisor dashboard should use the sync hook when making changes:

```typescript
import { useSupabaseScheduleSync } from '../../hooks/useSupabaseScheduleSync';
import { useScheduleStorage } from '../../hooks/useScheduleStorage';

// In your component
const { addScheduleEntry, updateScheduleEntry, deleteScheduleEntry } = useScheduleStorage();
const { syncInsert, syncUpdate, syncDelete } = useSupabaseScheduleSync();

// When adding a shift
const handleAddShift = async (entry: ScheduleEntry) => {
  // Add to local storage
  await addScheduleEntry(weekId, entry);
  
  // Sync to Supabase (will trigger real-time update for cleaners)
  syncInsert(entry);
};

// When updating a shift
const handleUpdateShift = async (entry: ScheduleEntry) => {
  await updateScheduleEntry(weekId, entry.id, entry);
  syncUpdate(entry);
};

// When deleting a shift
const handleDeleteShift = async (entry: ScheduleEntry) => {
  await deleteScheduleEntry(weekId, entry.id);
  syncDelete(entry);
};
```

## Features

### Real-Time Updates

- **INSERT**: New shifts appear immediately in the cleaner's app
- **UPDATE**: Shift changes (time, location, status) update in real-time
- **DELETE**: Removed shifts disappear from the cleaner's schedule

### Connection Status

The cleaner app displays a live connection indicator:
- 🟢 **Live** - Connected to real-time updates
- ⚫ **Offline** - Not connected (will sync when connection restored)

### Automatic Filtering

Cleaners only receive updates for shifts assigned to them:
- Filters by `cleaner_names` array
- Only relevant shifts are synced

### Offline Support

- Changes are queued when offline
- Automatic sync when connection is restored
- Local storage fallback ensures data persistence

## Testing

### Test Real-Time Sync

1. **Open Cleaner App** on one device/browser
2. **Open Supervisor Dashboard** on another device/browser
3. **Create a shift** in the supervisor dashboard assigned to the cleaner
4. **Verify** the shift appears immediately in the cleaner app

### Test Update Sync

1. **Update a shift** (change time, status, etc.) in the supervisor dashboard
2. **Verify** the changes appear immediately in the cleaner app

### Test Delete Sync

1. **Delete a shift** in the supervisor dashboard
2. **Verify** the shift disappears from the cleaner app

## Troubleshooting

### Shifts not appearing in cleaner app

1. Check that realtime is enabled for the table:
   ```sql
   select * from pg_publication_tables where pubname = 'supabase_realtime';
   ```

2. Verify the cleaner name matches exactly:
   ```typescript
   cleanerName: 'Sarah Johnson' // Must match entry.cleanerNames
   ```

3. Check browser console for connection errors

### Connection shows "Offline"

1. Verify Supabase credentials are correct
2. Check network connectivity
3. Look for CORS or firewall issues

### Duplicate entries appearing

1. Ensure you're not calling both local and sync operations
2. Check for multiple subscriptions
3. Verify entry IDs are unique

## Performance Considerations

- **Batching**: Sync operations are batched with a 500ms delay
- **Filtering**: Only relevant shifts are sent to each cleaner
- **Caching**: Local storage prevents unnecessary re-fetches
- **Debouncing**: Multiple rapid changes are combined

## Security

- **RLS Policies**: Ensure proper Row Level Security policies
- **Authentication**: Only authenticated users can access shifts
- **Authorization**: Cleaners can only see their assigned shifts
- **Validation**: All data is validated before syncing

## Future Enhancements

- [ ] Conflict resolution for simultaneous edits
- [ ] Optimistic UI updates
- [ ] Retry logic for failed syncs
- [ ] Sync status notifications
- [ ] Bandwidth optimization
- [ ] Compression for large payloads

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify Supabase connection status
3. Review RLS policies
4. Check network connectivity
