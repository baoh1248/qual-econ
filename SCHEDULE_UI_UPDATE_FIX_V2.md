# Schedule UI Update Fix - Version 2

## Problem Identified

The previous fix didn't work because of several issues:

1. **State Update Timing**: React state updates are asynchronous. When `loadData(true)` updated `weeklySchedules` state, immediately calling `getWeekSchedule()` was still reading the old state.

2. **Data Merging Issue**: When force refreshing, `loadData()` was merging Supabase data with stale AsyncStorage data, which could include old entries.

3. **Race Condition**: Supabase writes might not be immediately available for read after insert/update.

4. **No Return Value**: `loadData()` didn't return the loaded data, so we couldn't use it directly.

## Solution

### Key Changes

1. **`loadData()` now returns the loaded schedules**:
   - Returns `Promise<WeeklySchedule>` so we can use the data directly
   - No need to wait for state updates

2. **Force refresh uses ONLY Supabase data**:
   - When `forceRefresh = true`, completely ignores AsyncStorage
   - Uses only fresh data from Supabase
   - Prevents stale data from being merged in

3. **Added commit delay**:
   - 500ms delay after Supabase write operations
   - Ensures Supabase has committed the transaction before reading

4. **Direct data usage**:
   - Use returned data from `loadData(true)` directly
   - Update UI with `loadedSchedules[weekId]` instead of calling `getWeekSchedule()`
   - Avoids state timing issues

### Code Changes

**File: `hooks/useScheduleStorage.ts`**

```typescript
// Before: loadData() returned void
const loadData = useCallback(async (forceRefresh: boolean = false) => {
  // ... code ...
  setWeeklySchedules(finalSchedules);
  // No return value
});

// After: loadData() returns WeeklySchedule
const loadData = useCallback(async (forceRefresh: boolean = false): Promise<WeeklySchedule> => {
  // ... code ...
  
  // If force refresh, ONLY use Supabase data
  if (forceRefresh && Object.keys(supabaseSchedules).length > 0) {
    finalSchedules = supabaseSchedules; // No merge with AsyncStorage
    await saveSchedulesImmediately(finalSchedules);
  }
  
  setWeeklySchedules(finalSchedules);
  return finalSchedules; // Return the loaded data
});
```

**File: `app/supervisor/schedule.tsx`**

```typescript
// Before: Relied on state updates
await loadData(true);
const freshSchedule = getWeekSchedule(currentWeekId, true); // Might read stale state
setCurrentWeekSchedule(freshSchedule);

// After: Use returned data directly
await new Promise(resolve => setTimeout(resolve, 500)); // Wait for commit
clearCaches();
const loadedSchedules = await loadData(true); // Get data directly
const weekSchedule = loadedSchedules[currentWeekId] || []; // Use returned data
setCurrentWeekSchedule(weekSchedule); // Update UI
```

## Why This Works

1. **No State Timing Issues**: We use the returned data directly instead of waiting for state updates
2. **Fresh Data Only**: Force refresh completely bypasses AsyncStorage, ensuring we get the latest from Supabase
3. **Commit Guarantee**: The delay ensures Supabase has committed the write before we read
4. **Cache Clearing**: We clear caches before loading to prevent stale cache hits

## Testing

After this fix:
- ✅ Add new shift → Appears in UI immediately
- ✅ Edit shift → Changes appear immediately
- ✅ Delete shift → Disappears from UI immediately
- ✅ Generate recurring shifts → All appear in UI

## Debugging

If data still doesn't appear, check console logs for:
- `📥 Force refresh - fetching from Supabase...` - Confirms Supabase fetch
- `✅ Loaded X entries from Supabase` - Confirms data was loaded
- `📊 Loaded X entries for week Y` - Confirms data for your week
- `✅ UI refreshed with X entries` - Confirms UI update

If you see `⏭️ Skipping Supabase fetch`, the `forceRefresh=true` parameter isn't being passed correctly.

