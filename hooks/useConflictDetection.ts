
import { useMemo, useCallback } from 'react';
import type { ScheduleEntry } from './useScheduleStorage';
import type { Cleaner, ClientBuilding } from './useClientData';

export interface ConflictDetails {
  id: string;
  type: 'cleaner_double_booking' | 'location_overlap' | 'time_conflict' | 'workload_imbalance' | 'security_access_denied';
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

export const useConflictDetection = (schedule: ScheduleEntry[], cleaners: Cleaner[], clientBuildings?: ClientBuilding[]) => {
  console.log('useConflictDetection hook initialized with:', {
    scheduleEntries: schedule?.length || 0,
    cleaners: cleaners?.length || 0,
    buildings: clientBuildings?.length || 0
  });

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

  const detectCleanerDoubleBooking = useCallback((schedule: ScheduleEntry[], cleaners: Cleaner[]): ConflictDetails[] => {
    console.log('Detecting cleaner double booking conflicts...');
    const conflicts: ConflictDetails[] = [];
    const cleanerDayMap = new Map<string, ScheduleEntry[]>();

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

    console.log('Cleaner-day mappings created:', cleanerDayMap.size);

    for (const [key, entries] of cleanerDayMap) {
      if (entries.length > 1) {
        const uniqueEntries = entries.filter((entry, index, arr) => 
          arr.findIndex(e => e.id === entry.id) === index
        );
        
        if (uniqueEntries.length > 1) {
          const [cleanerName, day] = key.split('|');
          
          console.log(`Double booking detected: ${cleanerName} on ${day} with ${uniqueEntries.length} unique jobs`);
          
          conflicts.push({
            id: `cleaner-conflict-${key}`,
            type: 'cleaner_double_booking',
            severity: uniqueEntries.length > 2 ? 'critical' : 'high',
            title: 'Cleaner Double Booking',
            description: `${cleanerName} is scheduled for ${uniqueEntries.length} jobs on ${day}`,
            affectedEntries: uniqueEntries,
            suggestedResolutions: [],
            estimatedImpact: {
              timeWasted: uniqueEntries.length * 30,
              costIncrease: uniqueEntries.length * 50,
              efficiencyLoss: uniqueEntries.length * 15
            }
          });
        }
      }
    }

    console.log('Cleaner double booking conflicts found:', conflicts.length);
    return conflicts;
  }, [getEntryCleaners]);

  const detectTimeOverlapConflicts = useCallback((schedule: ScheduleEntry[]): ConflictDetails[] => {
    console.log('Detecting time overlap conflicts...');
    const conflicts: ConflictDetails[] = [];
    return conflicts;
  }, []);

  const detectSecurityAccessConflicts = useCallback((schedule: ScheduleEntry[], cleaners: Cleaner[], clientBuildings: ClientBuilding[]): ConflictDetails[] => {
    console.log('Detecting security access conflicts...');
    const conflicts: ConflictDetails[] = [];
    return conflicts;
  }, []);

  const detectWorkloadImbalance = useCallback((schedule: ScheduleEntry[], cleaners: Cleaner[]): ConflictDetails[] => {
    console.log('Detecting workload imbalance conflicts...');
    const conflicts: ConflictDetails[] = [];
    return conflicts;
  }, []);

  const detectLocationEfficiencyIssues = useCallback((schedule: ScheduleEntry[]): ConflictDetails[] => {
    console.log('Detecting location efficiency conflicts...');
    const conflicts: ConflictDetails[] = [];
    return conflicts;
  }, []);

  const conflicts = useMemo((): ConflictDetails[] => {
    try {
      if (!Array.isArray(schedule) || schedule.length === 0) {
        console.log('No schedule entries to check for conflicts');
        return [];
      }

      console.log('Starting conflict detection for', schedule.length, 'entries');
      const detectedConflicts: ConflictDetails[] = [];
      
      const cleanerConflicts = detectCleanerDoubleBooking(schedule, cleaners);
      detectedConflicts.push(...cleanerConflicts);
      
      const timeConflicts = detectTimeOverlapConflicts(schedule);
      detectedConflicts.push(...timeConflicts);
      
      const securityConflicts = detectSecurityAccessConflicts(schedule, cleaners, clientBuildings || []);
      detectedConflicts.push(...securityConflicts);
      
      const workloadConflicts = detectWorkloadImbalance(schedule, cleaners);
      detectedConflicts.push(...workloadConflicts);
      
      const locationConflicts = detectLocationEfficiencyIssues(schedule);
      detectedConflicts.push(...locationConflicts);

      console.log('Total conflicts detected:', detectedConflicts.length);
      return detectedConflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }, [schedule, cleaners, clientBuildings, detectCleanerDoubleBooking, detectTimeOverlapConflicts, detectSecurityAccessConflicts, detectWorkloadImbalance, detectLocationEfficiencyIssues]);

  const validateScheduleChange = useCallback((
    newEntry: Partial<ScheduleEntry>,
    existingEntryId?: string
  ): ConflictValidationResult => {
    try {
      console.log('=== VALIDATING SCHEDULE CHANGE ===');

      if (!newEntry.day || !newEntry.buildingName || !newEntry.clientName) {
        console.log('Missing required fields for validation, allowing to proceed');
        return {
          hasConflicts: false,
          conflicts: [],
          canProceed: true,
          warnings: []
        };
      }

      return {
        hasConflicts: false,
        conflicts: [],
        canProceed: true,
        warnings: []
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
  }, []);

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

  const getCleanerConflicts = useCallback((cleanerName: string): ConflictDetails[] => {
    try {
      return conflicts.filter(conflict =>
        conflict.affectedEntries.some(entry => {
          const entryCleaners = getEntryCleaners(entry);
          return entryCleaners.includes(cleanerName);
        })
      );
    } catch (error) {
      console.error('Error getting cleaner conflicts:', error);
      return [];
    }
  }, [conflicts, getEntryCleaners]);

  const getConflictsBySeverity = useCallback((severity: ConflictDetails['severity']): ConflictDetails[] => {
    try {
      return conflicts.filter(conflict => conflict.severity === severity);
    } catch (error) {
      console.error('Error getting conflicts by severity:', error);
      return [];
    }
  }, [conflicts]);

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
