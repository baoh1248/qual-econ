
import { useMemo, useCallback } from 'react';
import type { ScheduleEntry } from './useScheduleStorage';
import type { Cleaner } from './useClientData';

export interface ConflictDetails {
  id: string;
  type: 'cleaner_double_booking' | 'location_overlap' | 'time_conflict' | 'workload_imbalance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedEntries: ScheduleEntry[];
  suggestedResolutions: ConflictResolution[];
  estimatedImpact: {
    timeWasted: number;
    costIncrease: number;
    efficiencyLoss: number;
  };
}

export interface ConflictResolution {
  id: string;
  type: 'reassign_cleaner' | 'reschedule_time' | 'split_shift' | 'merge_shifts';
  title: string;
  description: string;
  changes: {
    entryId: string;
    newCleaner?: string;
    newDay?: string;
    newTime?: string;
    newHours?: number;
  }[];
  estimatedBenefit: {
    timeSaved: number;
    costReduction: number;
    efficiencyGain: number;
  };
}

export interface ConflictValidationResult {
  hasConflicts: boolean;
  conflicts: ConflictDetails[];
  canProceed: boolean;
  warnings: string[];
}

export const useConflictDetection = (schedule: ScheduleEntry[], cleaners: Cleaner[]) => {
  console.log('useConflictDetection hook initialized');

  // Optimized conflict detection with comprehensive analysis
  const conflicts = useMemo((): ConflictDetails[] => {
    try {
      if (!Array.isArray(schedule) || schedule.length === 0) {
        return [];
      }

      const detectedConflicts: ConflictDetails[] = [];
      
      // 1. Cleaner double booking conflicts
      const cleanerConflicts = detectCleanerDoubleBooking(schedule, cleaners);
      detectedConflicts.push(...cleanerConflicts);
      
      // 2. Time overlap conflicts (same cleaner, overlapping times)
      const timeConflicts = detectTimeOverlapConflicts(schedule);
      detectedConflicts.push(...timeConflicts);
      
      // 3. Workload imbalance conflicts
      const workloadConflicts = detectWorkloadImbalance(schedule, cleaners);
      detectedConflicts.push(...workloadConflicts);
      
      // 4. Location efficiency conflicts
      const locationConflicts = detectLocationEfficiencyIssues(schedule);
      detectedConflicts.push(...locationConflicts);

      console.log('Detected conflicts:', detectedConflicts.length);
      return detectedConflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }, [schedule, cleaners]);

  // Real-time conflict validation for new entries
  const validateScheduleChange = useCallback((
    newEntry: Partial<ScheduleEntry>,
    existingEntryId?: string
  ): ConflictValidationResult => {
    try {
      if (!newEntry.cleanerName || !newEntry.day || !newEntry.buildingName) {
        return {
          hasConflicts: false,
          conflicts: [],
          canProceed: true,
          warnings: []
        };
      }

      const tempSchedule = existingEntryId
        ? schedule.map(entry => entry.id === existingEntryId ? { ...entry, ...newEntry } : entry)
        : [...schedule, { ...newEntry, id: 'temp-validation' } as ScheduleEntry];

      const validationConflicts = detectCleanerDoubleBooking(tempSchedule, cleaners);
      const timeConflicts = detectTimeOverlapConflicts(tempSchedule);
      
      const allConflicts = [...validationConflicts, ...timeConflicts];
      const criticalConflicts = allConflicts.filter(c => c.severity === 'critical' || c.severity === 'high');
      
      const warnings: string[] = [];
      if (allConflicts.length > 0) {
        warnings.push(`This change will create ${allConflicts.length} scheduling conflict(s)`);
      }

      return {
        hasConflicts: allConflicts.length > 0,
        conflicts: allConflicts,
        canProceed: criticalConflicts.length === 0,
        warnings
      };
    } catch (error) {
      console.error('Error validating schedule change:', error);
      return {
        hasConflicts: false,
        conflicts: [],
        canProceed: true,
        warnings: ['Unable to validate changes']
      };
    }
  }, [schedule, cleaners]);

  // Get conflicts for a specific entry
  const getEntryConflicts = useCallback((entryId: string): ConflictDetails[] => {
    try {
      return conflicts.filter(conflict => 
        conflict.affectedEntries.some(entry => entry.id === entryId)
      );
    } catch (error) {
      console.error('Error getting entry conflicts:', error);
      return [];
    }
  }, [conflicts]);

  // Get conflicts for a specific cleaner
  const getCleanerConflicts = useCallback((cleanerName: string): ConflictDetails[] => {
    try {
      return conflicts.filter(conflict =>
        conflict.affectedEntries.some(entry => {
          // Check both single cleaner and multiple cleaners
          if (entry.cleanerNames && entry.cleanerNames.length > 0) {
            return entry.cleanerNames.includes(cleanerName);
          }
          return entry.cleanerName === cleanerName;
        })
      );
    } catch (error) {
      console.error('Error getting cleaner conflicts:', error);
      return [];
    }
  }, [conflicts]);

  // Helper function to get all cleaners from an entry
  const getEntryCleaners = useCallback((entry: ScheduleEntry): string[] => {
    try {
      if (entry.cleanerNames && entry.cleanerNames.length > 0) {
        return entry.cleanerNames;
      }
      return entry.cleanerName ? [entry.cleanerName] : [];
    } catch (error) {
      console.error('Error getting entry cleaners:', error);
      return [];
    }
  }, []);

  // Get conflicts by severity
  const getConflictsBySeverity = useCallback((severity: ConflictDetails['severity']): ConflictDetails[] => {
    try {
      return conflicts.filter(conflict => conflict.severity === severity);
    } catch (error) {
      console.error('Error getting conflicts by severity:', error);
      return [];
    }
  }, [conflicts]);

  // Helper functions for conflict detection
  function detectCleanerDoubleBooking(schedule: ScheduleEntry[], cleaners: Cleaner[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const cleanerDayMap = new Map<string, ScheduleEntry[]>();

    // Group entries by cleaner and day (handle multiple cleaners per entry)
    for (const entry of schedule) {
      if (!entry || entry.status === 'cancelled') continue;
      
      const entryCleaners = getEntryCleaners(entry);
      for (const cleanerName of entryCleaners) {
        const key = `${cleanerName}|${entry.day}`;
        if (!cleanerDayMap.has(key)) {
          cleanerDayMap.set(key, []);
        }
        cleanerDayMap.get(key)!.push(entry);
      }
    }

    // Check for conflicts
    for (const [key, entries] of cleanerDayMap) {
      if (entries.length > 1) {
        const [cleanerName, day] = key.split('|');
        const cleaner = cleaners.find(c => c.name === cleanerName);
        
        // Generate resolution suggestions
        const resolutions = generateCleanerConflictResolutions(entries, cleaners);
        
        conflicts.push({
          id: `cleaner-conflict-${key}`,
          type: 'cleaner_double_booking',
          severity: entries.length > 2 ? 'critical' : 'high',
          title: 'Cleaner Double Booking',
          description: `${cleanerName} is scheduled for ${entries.length} jobs on ${day}`,
          affectedEntries: entries,
          suggestedResolutions: resolutions,
          estimatedImpact: {
            timeWasted: entries.length * 30, // 30 min per conflict
            costIncrease: entries.length * 50, // $50 per conflict
            efficiencyLoss: entries.length * 15 // 15% efficiency loss
          }
        });
      }
    }

    return conflicts;
  }

  function detectTimeOverlapConflicts(schedule: ScheduleEntry[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const cleanerDayEntries = new Map<string, ScheduleEntry[]>();

    // Group by cleaner and day (handle multiple cleaners per entry)
    for (const entry of schedule) {
      if (!entry || entry.status === 'cancelled' || !entry.startTime) continue;
      
      const entryCleaners = getEntryCleaners(entry);
      for (const cleanerName of entryCleaners) {
        const key = `${cleanerName}|${entry.day}`;
        if (!cleanerDayEntries.has(key)) {
          cleanerDayEntries.set(key, []);
        }
        cleanerDayEntries.get(key)!.push(entry);
      }
    }

    // Check for time overlaps
    for (const [key, entries] of cleanerDayEntries) {
      if (entries.length < 2) continue;

      const sortedEntries = entries.sort((a, b) => 
        (a.startTime || '').localeCompare(b.startTime || '')
      );

      for (let i = 0; i < sortedEntries.length - 1; i++) {
        const current = sortedEntries[i];
        const next = sortedEntries[i + 1];

        if (current.startTime && next.startTime && current.hours) {
          const currentEnd = addHoursToTime(current.startTime, current.hours);
          if (currentEnd > next.startTime) {
            const [cleanerName, day] = key.split('|');
            
            conflicts.push({
              id: `time-conflict-${current.id}-${next.id}`,
              type: 'time_conflict',
              severity: 'high',
              title: 'Time Overlap Conflict',
              description: `${cleanerName} has overlapping shifts on ${day}`,
              affectedEntries: [current, next],
              suggestedResolutions: generateTimeConflictResolutions([current, next]),
              estimatedImpact: {
                timeWasted: 60,
                costIncrease: 100,
                efficiencyLoss: 25
              }
            });
          }
        }
      }
    }

    return conflicts;
  }

  function detectWorkloadImbalance(schedule: ScheduleEntry[], cleaners: Cleaner[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const cleanerWorkload = new Map<string, { hours: number; entries: ScheduleEntry[] }>();

    // Initialize cleaner workloads
    for (const cleaner of cleaners) {
      if (cleaner.isActive) {
        cleanerWorkload.set(cleaner.name, { hours: 0, entries: [] });
      }
    }

    // Calculate workloads (handle multiple cleaners per entry)
    for (const entry of schedule) {
      if (!entry || entry.status === 'cancelled') continue;
      
      const entryCleaners = getEntryCleaners(entry);
      const hoursPerCleaner = entryCleaners.length > 0 ? (entry.hours || 0) / entryCleaners.length : 0;
      
      for (const cleanerName of entryCleaners) {
        const workload = cleanerWorkload.get(cleanerName);
        if (workload) {
          workload.hours += hoursPerCleaner;
          workload.entries.push(entry);
        }
      }
    }

    const workloads = Array.from(cleanerWorkload.entries());
    const totalHours = workloads.reduce((sum, [_, data]) => sum + data.hours, 0);
    const avgHours = totalHours / workloads.length;
    const threshold = avgHours * 0.3; // 30% deviation threshold

    // Find imbalanced workloads
    const overloaded = workloads.filter(([_, data]) => data.hours > avgHours + threshold);
    const underloaded = workloads.filter(([_, data]) => data.hours < avgHours - threshold);

    if (overloaded.length > 0 && underloaded.length > 0) {
      conflicts.push({
        id: 'workload-imbalance',
        type: 'workload_imbalance',
        severity: 'medium',
        title: 'Workload Imbalance',
        description: `${overloaded.length} cleaners are overloaded while ${underloaded.length} are underutilized`,
        affectedEntries: [
          ...overloaded.flatMap(([_, data]) => data.entries),
          ...underloaded.flatMap(([_, data]) => data.entries)
        ],
        suggestedResolutions: generateWorkloadResolutions(overloaded, underloaded),
        estimatedImpact: {
          timeWasted: 0,
          costIncrease: overloaded.length * 25,
          efficiencyLoss: 10
        }
      });
    }

    return conflicts;
  }

  function detectLocationEfficiencyIssues(schedule: ScheduleEntry[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const cleanerDayEntries = new Map<string, ScheduleEntry[]>();

    // Group by cleaner and day (handle multiple cleaners per entry)
    for (const entry of schedule) {
      if (!entry || entry.status === 'cancelled') continue;
      
      const entryCleaners = getEntryCleaners(entry);
      for (const cleanerName of entryCleaners) {
        const key = `${cleanerName}|${entry.day}`;
        if (!cleanerDayEntries.has(key)) {
          cleanerDayEntries.set(key, []);
        }
        cleanerDayEntries.get(key)!.push(entry);
      }
    }

    // Check for inefficient routing
    for (const [key, entries] of cleanerDayEntries) {
      if (entries.length < 2) continue;

      const clientGroups = new Map<string, ScheduleEntry[]>();
      for (const entry of entries) {
        if (!clientGroups.has(entry.clientName)) {
          clientGroups.set(entry.clientName, []);
        }
        clientGroups.get(entry.clientName)!.push(entry);
      }

      // If cleaner has multiple clients but they're not grouped by time
      if (clientGroups.size > 1) {
        const [cleanerName, day] = key.split('|');
        
        conflicts.push({
          id: `location-efficiency-${key}`,
          type: 'location_overlap',
          severity: 'low',
          title: 'Inefficient Routing',
          description: `${cleanerName} travels between ${clientGroups.size} different clients on ${day}`,
          affectedEntries: entries,
          suggestedResolutions: generateLocationResolutions(entries, clientGroups),
          estimatedImpact: {
            timeWasted: (clientGroups.size - 1) * 20,
            costIncrease: (clientGroups.size - 1) * 15,
            efficiencyLoss: 5
          }
        });
      }
    }

    return conflicts;
  }

  // Resolution generators
  function generateCleanerConflictResolutions(entries: ScheduleEntry[], cleaners: Cleaner[]): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    
    // Find available cleaners for each conflicting entry
    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const availableCleaners = findAvailableCleaners(entry, cleaners, schedule);
      
      for (const cleaner of availableCleaners.slice(0, 2)) { // Limit to top 2 options
        resolutions.push({
          id: `reassign-${entry.id}-${cleaner.name}`,
          type: 'reassign_cleaner',
          title: `Reassign to ${cleaner.name}`,
          description: `Move ${entry.buildingName} shift to ${cleaner.name}`,
          changes: [{
            entryId: entry.id,
            newCleaner: cleaner.name
          }],
          estimatedBenefit: {
            timeSaved: 30,
            costReduction: 50,
            efficiencyGain: 20
          }
        });
      }
    }

    return resolutions;
  }

  function generateTimeConflictResolutions(entries: ScheduleEntry[]): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    
    // Suggest rescheduling the second entry
    if (entries.length >= 2) {
      const secondEntry = entries[1];
      
      resolutions.push({
        id: `reschedule-${secondEntry.id}`,
        type: 'reschedule_time',
        title: 'Reschedule Time',
        description: `Move ${secondEntry.buildingName} to a different time slot`,
        changes: [{
          entryId: secondEntry.id,
          newTime: suggestAlternativeTime(secondEntry, entries[0])
        }],
        estimatedBenefit: {
          timeSaved: 60,
          costReduction: 100,
          efficiencyGain: 25
        }
      });
    }

    return resolutions;
  }

  function generateWorkloadResolutions(
    overloaded: [string, { hours: number; entries: ScheduleEntry[] }][],
    underloaded: [string, { hours: number; entries: ScheduleEntry[] }][]
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    
    for (const [overloadedCleaner, overloadedData] of overloaded) {
      for (const [underloadedCleaner, underloadedData] of underloaded) {
        if (overloadedData.entries.length > 0) {
          const entryToMove = overloadedData.entries[0];
          
          resolutions.push({
            id: `rebalance-${entryToMove.id}`,
            type: 'reassign_cleaner',
            title: `Rebalance Workload`,
            description: `Move ${entryToMove.buildingName} from ${overloadedCleaner} to ${underloadedCleaner}`,
            changes: [{
              entryId: entryToMove.id,
              newCleaner: underloadedCleaner
            }],
            estimatedBenefit: {
              timeSaved: 0,
              costReduction: 25,
              efficiencyGain: 15
            }
          });
        }
      }
    }

    return resolutions;
  }

  function generateLocationResolutions(
    entries: ScheduleEntry[],
    clientGroups: Map<string, ScheduleEntry[]>
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    
    // Suggest grouping by client
    for (const [clientName, clientEntries] of clientGroups) {
      if (clientEntries.length > 1) {
        resolutions.push({
          id: `group-${clientName}`,
          type: 'reschedule_time',
          title: `Group ${clientName} Jobs`,
          description: `Schedule all ${clientName} jobs consecutively`,
          changes: clientEntries.map((entry, index) => ({
            entryId: entry.id,
            newTime: `${8 + index * 2}:00` // Suggest consecutive 2-hour slots
          })),
          estimatedBenefit: {
            timeSaved: (clientEntries.length - 1) * 20,
            costReduction: (clientEntries.length - 1) * 15,
            efficiencyGain: 10
          }
        });
      }
    }

    return resolutions;
  }

  // Helper functions
  function findAvailableCleaners(entry: ScheduleEntry, cleaners: Cleaner[], schedule: ScheduleEntry[]): Cleaner[] {
    const busyCleaners = new Set<string>();
    
    // Collect all busy cleaners for the same day (handle multiple cleaners per entry)
    schedule
      .filter(s => s.day === entry.day && s.id !== entry.id && s.status !== 'cancelled')
      .forEach(s => {
        const entryCleaners = getEntryCleaners(s);
        entryCleaners.forEach(cleanerName => busyCleaners.add(cleanerName));
      });

    return cleaners.filter(cleaner => 
      cleaner.isActive && !busyCleaners.has(cleaner.name)
    );
  }

  function addHoursToTime(time: string, hours: number): string {
    try {
      const [hourStr, minuteStr] = time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      const totalMinutes = hour * 60 + minute + hours * 60;
      const newHour = Math.floor(totalMinutes / 60) % 24;
      const newMinute = totalMinutes % 60;
      
      return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error adding hours to time:', error);
      return time;
    }
  }

  function suggestAlternativeTime(entry: ScheduleEntry, conflictingEntry: ScheduleEntry): string {
    if (!conflictingEntry.startTime || !conflictingEntry.hours) {
      return '14:00'; // Default afternoon time
    }
    
    const conflictEnd = addHoursToTime(conflictingEntry.startTime, conflictingEntry.hours);
    return conflictEnd;
  }

  // Summary statistics
  const conflictSummary = useMemo(() => {
    const summary = {
      total: conflicts.length,
      critical: conflicts.filter(c => c.severity === 'critical').length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length,
      totalTimeWasted: conflicts.reduce((sum, c) => sum + c.estimatedImpact.timeWasted, 0),
      totalCostIncrease: conflicts.reduce((sum, c) => sum + c.estimatedImpact.costIncrease, 0),
      averageEfficiencyLoss: conflicts.length > 0 
        ? conflicts.reduce((sum, c) => sum + c.estimatedImpact.efficiencyLoss, 0) / conflicts.length 
        : 0
    };
    
    console.log('Conflict summary:', summary);
    return summary;
  }, [conflicts]);

  return {
    conflicts,
    conflictSummary,
    validateScheduleChange,
    getEntryConflicts,
    getCleanerConflicts,
    getConflictsBySeverity,
    getEntryCleaners,
    hasConflicts: conflicts.length > 0,
    hasCriticalConflicts: conflicts.some(c => c.severity === 'critical'),
    hasHighPriorityConflicts: conflicts.some(c => c.severity === 'critical' || c.severity === 'high')
  };
};
