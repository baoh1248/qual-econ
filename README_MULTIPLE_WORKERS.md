
# Multiple Workers Feature Implementation

This document describes the implementation of the multiple workers feature for the cleaning company schedule system.

## Overview

The multiple workers feature allows supervisors to assign multiple cleaners to a single job, providing better flexibility in workforce management and enabling team-based cleaning assignments.

## Key Features

### 1. Multi-Cleaner Job Assignment
- **Create jobs with multiple cleaners**: Select multiple cleaners when creating new schedule entries
- **Add cleaners to existing jobs**: Add additional cleaners to jobs that are already scheduled
- **Remove cleaners from jobs**: Remove specific cleaners from multi-cleaner jobs (minimum 1 cleaner required)

### 2. Enhanced User Interface
- **Multi-select dropdown**: Checkbox-based cleaner selection with visual feedback
- **Cleaner chips**: Visual representation of assigned cleaners with remove buttons
- **Compact grid display**: Shows primary cleaner + "+X more" indicator for multiple assignments

### 3. Improved Conflict Detection
- **Multi-cleaner conflict detection**: Detects scheduling conflicts for each assigned cleaner
- **Workload distribution**: Calculates workload by distributing hours among assigned cleaners
- **Enhanced validation**: Prevents conflicts when adding/removing cleaners from jobs

### 4. Recurring Task Support
- **Multi-cleaner recurring tasks**: Assign multiple cleaners to recurring job patterns
- **Consistent assignments**: All selected cleaners are assigned to every occurrence in the series

## Technical Implementation

### Data Structure Changes

```typescript
interface ScheduleEntry {
  // Existing fields...
  cleanerName: string;           // Kept for backward compatibility
  cleanerNames?: string[];       // New: Array of cleaner names
  cleanerIds?: string[];         // New: Array of cleaner IDs
}
```

### New API Functions

```typescript
// Get all cleaners assigned to an entry
getEntryCleaners(entry: ScheduleEntry): string[]

// Add a cleaner to an existing job
addCleanerToEntry(weekId: string, entryId: string, cleanerName: string, cleanerId?: string): Promise<void>

// Remove a cleaner from a job
removeCleanerFromEntry(weekId: string, entryId: string, cleanerName: string): Promise<void>

// Update all cleaners for a job
updateEntryCleaners(weekId: string, entryId: string, cleanerNames: string[], cleanerIds?: string[]): Promise<void>
```

## User Workflows

### Creating a Job with Multiple Cleaners

1. **Open schedule modal**: Tap on empty cell or "Add" button
2. **Select building and time**: Choose client building and job details
3. **Select multiple cleaners**: 
   - Click on cleaners dropdown
   - Check multiple cleaners from the list
   - Click "Done" to confirm selection
4. **Review selection**: See selected cleaners as chips below dropdown
5. **Save job**: All selected cleaners are assigned to the job

### Managing Cleaners on Existing Jobs

1. **View job details**: Tap on existing schedule entry
2. **See current cleaners**: View all assigned cleaners as chips
3. **Add cleaner**: 
   - Click "Add Cleaner" button
   - Select from available cleaners
   - Cleaner is immediately added to the job
4. **Remove cleaner**: 
   - Click X button on cleaner chip
   - Cleaner is removed (if not the last one)

### Creating Recurring Jobs with Multiple Cleaners

1. **Open recurring task modal**: Click "Recurring" button
2. **Set job details**: Choose building, hours, and schedule pattern
3. **Select multiple cleaners**: Use multi-select dropdown
4. **Create recurring series**: All cleaners assigned to every occurrence

## Conflict Detection

The system automatically detects conflicts when multiple cleaners are involved:

- **Double booking**: Prevents assigning the same cleaner to multiple jobs at the same time
- **Workload balancing**: Distributes hours among cleaners for workload calculations
- **Time conflicts**: Checks for overlapping time slots for each assigned cleaner

## Backward Compatibility

The implementation maintains full backward compatibility:

- **Existing jobs**: Single-cleaner jobs continue to work without changes
- **Data migration**: Automatic conversion when jobs are edited
- **Fallback handling**: Graceful fallback to single cleaner when multi-cleaner data unavailable

## Visual Design

### Schedule Grid
- **Single cleaner**: Shows cleaner name normally
- **Multiple cleaners**: Shows primary cleaner name + "+2 more" indicator
- **Conflict indicators**: Shows warning icons for any cleaner conflicts

### Modal Interface
- **Selected cleaners**: Displayed as colored chips with remove buttons
- **Dropdown**: Multi-select with checkboxes and "Done" button
- **Add/Remove**: Clear buttons for managing cleaner assignments

## Error Handling

- **Validation**: Prevents creating jobs without cleaners
- **Minimum requirement**: Cannot remove the last cleaner from a job
- **Conflict warnings**: Shows alerts when assignments create conflicts
- **Network errors**: Graceful handling of save/update failures

## Performance Considerations

- **Efficient rendering**: Optimized display for large numbers of cleaners
- **Conflict calculation**: Efficient algorithms for multi-cleaner conflict detection
- **Data caching**: Cached cleaner data for improved performance
- **Batch operations**: Optimized database operations for multiple cleaner updates

## Future Enhancements

Potential future improvements to the multiple workers feature:

1. **Role-based assignments**: Assign cleaners with specific roles (lead, assistant, etc.)
2. **Skill matching**: Automatically suggest cleaners based on required skills
3. **Team templates**: Save and reuse common cleaner combinations
4. **Advanced scheduling**: Optimize cleaner assignments across multiple jobs
5. **Performance tracking**: Track individual and team performance metrics
