
# Integration Guide: Adding Real-Time Sync to Supervisor Schedule

## Quick Start

To enable real-time synchronization in the supervisor schedule screen, follow these steps:

## Step 1: Import the Sync Hook

Add this import to `app/supervisor/schedule.tsx`:

```typescript
import { useSupabaseScheduleSync } from '../../hooks/useSupabaseScheduleSync';
```

## Step 2: Initialize the Hook

In your component, add:

```typescript
const { syncInsert, syncUpdate, syncDelete } = useSupabaseScheduleSync();
```

## Step 3: Update Your Save Function

Modify your `handleSave` function to sync changes:

```typescript
const handleSave = async () => {
  try {
    if (modalType === 'add') {
      const newEntry: ScheduleEntry = {
        id: String(Date.now() + Math.random()),
        clientName: selectedClient?.name || '',
        buildingName: selectedClientBuilding?.building_name || '',
        cleanerName: selectedCleaners[0] || '',
        cleanerNames: selectedCleaners,
        hours: parseFloat(hours) || 0,
        day: currentDay,
        date: currentDate,
        startTime: startTime,
        status: 'scheduled',
        weekId: currentWeekId,
        paymentType: paymentType,
        flatRateAmount: paymentType === 'flat_rate' ? parseFloat(flatRateAmount) || 0 : 0,
        hourlyRate: paymentType === 'hourly' ? parseFloat(hourlyRate) || 15 : 15,
      };

      // Add to local storage
      await addScheduleEntry(currentWeekId, newEntry);
      
      // Sync to Supabase for real-time updates
      syncInsert(newEntry);
      
      showToast('Shift added successfully', 'success');
    } else if (modalType === 'edit' && selectedEntry) {
      const updatedEntry: ScheduleEntry = {
        ...selectedEntry,
        clientName: selectedClient?.name || selectedEntry.clientName,
        buildingName: selectedClientBuilding?.building_name || selectedEntry.buildingName,
        cleanerNames: selectedCleaners,
        hours: parseFloat(hours) || selectedEntry.hours,
        startTime: startTime,
        paymentType: paymentType,
        flatRateAmount: paymentType === 'flat_rate' ? parseFloat(flatRateAmount) || 0 : selectedEntry.flatRateAmount,
        hourlyRate: paymentType === 'hourly' ? parseFloat(hourlyRate) || 15 : selectedEntry.hourlyRate,
      };

      // Update local storage
      await updateScheduleEntry(currentWeekId, selectedEntry.id, updatedEntry);
      
      // Sync to Supabase for real-time updates
      syncUpdate(updatedEntry);
      
      showToast('Shift updated successfully', 'success');
    }

    closeModal();
    await loadCurrentWeekSchedule();
  } catch (error) {
    console.error('Error saving shift:', error);
    showToast('Failed to save shift', 'error');
  }
};
```

## Step 4: Update Your Delete Function

Modify your `handleDelete` function:

```typescript
const handleDelete = async () => {
  if (!selectedEntry) return;

  Alert.alert(
    'Delete Shift',
    'Are you sure you want to delete this shift?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete from local storage
            await deleteScheduleEntry(currentWeekId, selectedEntry.id);
            
            // Sync to Supabase for real-time updates
            syncDelete(selectedEntry);
            
            showToast('Shift deleted successfully', 'success');
            closeModal();
            await loadCurrentWeekSchedule();
          } catch (error) {
            console.error('Error deleting shift:', error);
            showToast('Failed to delete shift', 'error');
          }
        },
      },
    ]
  );
};
```

## Step 5: Bulk Operations (Optional)

For bulk operations like recurring tasks:

```typescript
import { useSupabaseScheduleSync } from '../../hooks/useSupabaseScheduleSync';

const { syncBulkInsert, syncBulkUpdate, syncBulkDelete } = useSupabaseScheduleSync();

// When creating recurring tasks
const handleRecurringTask = async (entries: ScheduleEntry[]) => {
  // Add all entries to local storage
  for (const entry of entries) {
    await addScheduleEntry(entry.weekId, entry);
  }
  
  // Sync all at once
  syncBulkInsert(entries);
  
  showToast(`${entries.length} recurring shifts created`, 'success');
};
```

## Complete Example

Here's a complete example of a save function with real-time sync:

```typescript
import { useSupabaseScheduleSync } from '../../hooks/useSupabaseScheduleSync';
import { useScheduleStorage } from '../../hooks/useScheduleStorage';
import { useToast } from '../../hooks/useToast';

export default function ScheduleView() {
  const { addScheduleEntry, updateScheduleEntry, deleteScheduleEntry } = useScheduleStorage();
  const { syncInsert, syncUpdate, syncDelete } = useSupabaseScheduleSync();
  const { showToast } = useToast();

  const handleSave = async () => {
    try {
      if (modalType === 'add') {
        const newEntry: ScheduleEntry = {
          // ... entry data
        };

        await addScheduleEntry(currentWeekId, newEntry);
        syncInsert(newEntry); // Real-time sync
        
        showToast('Shift added and synced', 'success');
      } else if (modalType === 'edit' && selectedEntry) {
        const updatedEntry: ScheduleEntry = {
          // ... updated data
        };

        await updateScheduleEntry(currentWeekId, selectedEntry.id, updatedEntry);
        syncUpdate(updatedEntry); // Real-time sync
        
        showToast('Shift updated and synced', 'success');
      }

      closeModal();
      await loadCurrentWeekSchedule();
    } catch (error) {
      console.error('Error saving shift:', error);
      showToast('Failed to save shift', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;

    Alert.alert(
      'Delete Shift',
      'Are you sure you want to delete this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduleEntry(currentWeekId, selectedEntry.id);
              syncDelete(selectedEntry); // Real-time sync
              
              showToast('Shift deleted and synced', 'success');
              closeModal();
              await loadCurrentWeekSchedule();
            } catch (error) {
              console.error('Error deleting shift:', error);
              showToast('Failed to delete shift', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    // ... your component JSX
  );
}
```

## Testing Checklist

- [ ] Import sync hook
- [ ] Initialize sync functions
- [ ] Add syncInsert() to create operations
- [ ] Add syncUpdate() to update operations
- [ ] Add syncDelete() to delete operations
- [ ] Test with cleaner app open
- [ ] Verify real-time updates appear
- [ ] Check connection indicator
- [ ] Test offline behavior

## Common Issues

### Issue: Changes not syncing

**Solution**: Make sure you're calling the sync function AFTER the local storage operation:

```typescript
// ✅ Correct
await addScheduleEntry(weekId, entry);
syncInsert(entry);

// ❌ Wrong
syncInsert(entry);
await addScheduleEntry(weekId, entry);
```

### Issue: Duplicate entries

**Solution**: Don't call both local and sync operations twice:

```typescript
// ✅ Correct
await addScheduleEntry(weekId, entry);
syncInsert(entry);

// ❌ Wrong - creates duplicates
await addScheduleEntry(weekId, entry);
syncInsert(entry);
await addScheduleEntry(weekId, entry); // Duplicate!
```

### Issue: Sync not working

**Solution**: Check that Supabase realtime is enabled:

```sql
alter publication supabase_realtime add table schedule_entries;
```

## Next Steps

1. Add the sync hook to your schedule screen
2. Test with the cleaner app
3. Monitor the console for sync logs
4. Verify real-time updates work
5. Test offline behavior

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase connection
3. Review the sync logs
4. Test with a simple entry first
