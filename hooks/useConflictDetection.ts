
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

  // Optimized conflict detection with comprehensive analysis
  const conflicts = useMemo((): ConflictDetails[] => {
    try {
      if (!Array.isArray(schedule) || schedule.length === 0) {
        console.log('No schedule entries to check for conflicts');
        return [];
      }

      console.log('Starting conflict detection for', schedule.length, 'entries');
      const detectedConflicts: ConflictDetails[] = [];
      
      // 1. Cleaner double booking conflicts
      const cleanerConflicts = detectCleanerDoubleBooking(schedule, cleaners);
      detectedConflicts.push(...cleanerConflicts);
      console.log('Cleaner conflicts detected:', cleanerConflicts.length);
      
      // 2. Time overlap conflicts (same cleaner, overlapping times)
      const timeConflicts = detectTimeOverlapConflicts(schedule);
      detectedConflicts.push(...timeConflicts);
      console.log('Time conflicts detected:', timeConflicts.length);
      
      // 3. Security access conflicts
      const securityConflicts = detectSecurityAccessConflicts(schedule, cleaners, clientBuildings || []);
      detectedConflicts.push(...securityConflicts);
      console.log('Security conflicts detected:', securityConflicts.length);
      
      // 4. Workload imbalance conflicts
      const workloadConflicts = detectWorkloadImbalance(schedule, cleaners);
      detectedConflicts.push(...workloadConflicts);
      console.log('Workload conflicts detected:', workloadConflicts.length);
      
      // 5. Location efficiency conflicts
      const locationConflicts = detectLocationEfficiencyIssues(schedule);
      detectedConflicts.push(...locationConflicts);
      console.log('Location conflicts detected:', locationConflicts.length);

      console.log('Total conflicts detected:', detectedConflicts.length);
      console.log('Conflict details:', detectedConflicts.map(c => ({ 
        id: c.id, 
        type: c.type, 
        severity: c.severity, 
        description: c.description 
      })));
      return detectedConflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }, [schedule, cleaners, clientBuildings]);

  // Real-time conflict validation for new entries - FIXED VERSION
  const validateScheduleChange = useCallback((
    newEntry: Partial<ScheduleEntry>,
    existingEntryId?: string
  ): ConflictValidationResult => {
    try {
      console.log('=== VALIDATING SCHEDULE CHANGE ===');
      console.log('Validating schedule change:', {
        newEntry: {
          cleanerName: newEntry.cleanerName,
          cleanerNames: newEntry.cleanerNames,
          day: newEntry.day,
          buildingName: newEntry.buildingName,
          clientName: newEntry.clientName,
          hours: newEntry.hours
        },
        existingEntryId,
        isEdit: !!existingEntryId
      });

      if (!newEntry.day || !newEntry.buildingName || !newEntry.clientName) {
        console.log('Missing required fields for validation, allowing to proceed');
        return {
          hasConflicts: false,
          conflicts: [],
          canProceed: true,
          warnings: []
        };
      }

      // Create a temporary schedule for validation
      let tempSchedule: ScheduleEntry[];
      let entryToValidate: ScheduleEntry;
      
      if (existingEntryId) {
        // For edits, replace the existing entry with the updated one
        const originalEntry = schedule.find(entry => entry.id === existingEntryId);
        if (!originalEntry) {
          console.log('Original entry not found for validation, allowing to proceed');
          return {
            hasConflicts: false,
            conflicts: [],
            canProceed: true,
            warnings: []
          };
        }
        
        entryToValidate = { ...originalEntry, ...newEntry } as ScheduleEntry;
        tempSchedule = schedule.map(entry => 
          entry.id === existingEntryId ? entryToValidate : entry
        );
        console.log('Created temp schedule for edit validation with', tempSchedule.length, 'entries');
      } else {
        // For new entries, add to the schedule
        entryToValidate = { 
          ...newEntry, 
          id: 'temp-validation-' + Date.now(),
          status: 'scheduled' as const,
          weekId: 'temp'
        } as ScheduleEntry;
        tempSchedule = [...schedule, entryToValidate];
        console.log('Created temp schedule for new entry validation with', tempSchedule.length, 'entries');
      }

      // Only check for conflicts that would actually be problematic
      const validationConflicts: ConflictDetails[] = [];
      
      // 1. Check for cleaner double booking (only critical conflicts)
      const cleanerConflicts = detectCleanerDoubleBooking(tempSchedule, cleaners)
        .filter(conflict => {
          // For edits, only flag as conflict if it involves other entries
          if (existingEntryId) {
            const involvedEntries = conflict.affectedEntries.filter(entry => entry.id !== existingEntryId);
            return involvedEntries.length > 1; // Need at least 2 entries for a real conflict
          }
          return true;
        });
      validationConflicts.push(...cleanerConflicts);
      
      // 2. Check for time overlaps (only critical conflicts)
      const timeConflicts = detectTimeOverlapConflicts(tempSchedule)
        .filter(conflict => {
          // For edits, only flag as conflict if it involves other entries
          if (existingEntryId) {
            const involvedEntries = conflict.affectedEntries.filter(entry => entry.id !== existingEntryId);
            return involvedEntries.length > 0;
          }
          return true;
        });
      validationConflicts.push(...timeConflicts);
      
      // 3. Check for security access conflicts - IMPROVED LOGIC FOR EDITS
      if (existingEntryId) {
        // For edits, do a direct security check on the entry being validated
        console.log('Performing direct security validation for edit...');
        
        // Find the building data to get the actual security level
        const building = clientBuildings?.find(b => 
          b.clientName === entryToValidate.clientName && 
          b.buildingName === entryToValidate.buildingName
        );
        
        if (building && building.securityLevel) {
          const jobSecurityLevel = building.securityLevel;
          console.log(`Building ${building.buildingName} requires ${jobSecurityLevel.toUpperCase()} security clearance`);
          
          const entryCleaners = getEntryCleaners(entryToValidate);
          console.log(`Entry has ${entryCleaners.length} cleaner(s): ${entryCleaners.join(', ')}`);
          
          const unauthorizedCleaners: string[] = [];
          
          for (const cleanerName of entryCleaners) {
            const cleaner = cleaners.find(c => c.name === cleanerName);
            if (!cleaner) {
              console.log(`❌ Cleaner ${cleanerName} not found in cleaners database`);
              continue;
            }
            
            const cleanerSecurityLevel = cleaner.securityLevel || 'low';
            console.log(`🔍 Checking cleaner ${cleanerName}: has ${cleanerSecurityLevel.toUpperCase()} clearance`);
            
            const levels = { low: 1, medium: 2, high: 3 };
            const cleanerLevelNum = levels[cleanerSecurityLevel as keyof typeof levels] || 1;
            const jobLevelNum = levels[jobSecurityLevel as keyof typeof levels] || 1;
            const canAccess = cleanerLevelNum >= jobLevelNum;
            
            if (!canAccess) {
              console.log(`🚫 SECURITY VIOLATION: ${cleanerName} (${cleanerSecurityLevel}) cannot access ${building.buildingName} (requires ${jobSecurityLevel})`);
              unauthorizedCleaners.push(cleanerName);
            } else {
              console.log(`✅ SECURITY OK: ${cleanerName} (${cleanerSecurityLevel}) can access ${building.buildingName} (requires ${jobSecurityLevel})`);
            }
          }
          
          if (unauthorizedCleaners.length > 0) {
            console.log(`🚨 DIRECT SECURITY CONFLICT DETECTED: ${unauthorizedCleaners.length} unauthorized cleaner(s) for ${building.buildingName}`);
            
            // Find alternative cleaners with proper security clearance
            const authorizedCleaners = cleaners.filter(c => {
              if (!c.isActive) return false;
              const cleanerLevel = c.securityLevel || 'low';
              const levels = { low: 1, medium: 2, high: 3 };
              const cleanerLevelNum = levels[cleanerLevel as keyof typeof levels] || 1;
              const jobLevelNum = levels[jobSecurityLevel as keyof typeof levels] || 1;
              return cleanerLevelNum >= jobLevelNum && !entryCleaners.includes(c.name);
            });
            
            console.log(`💡 Found ${authorizedCleaners.length} alternative authorized cleaners`);
            
            const resolutions: ConflictResolution[] = authorizedCleaners.slice(0, 3).map(cleaner => ({
              id: `security-reassign-${entryToValidate.id}-${cleaner.id}`,
              type: 'reassign_cleaner',
              title: `Reassign to ${cleaner.name}`,
              description: `Replace unauthorized cleaner with ${cleaner.name} (${cleaner.securityLevel?.toUpperCase()} security)`,
              changes: [{
                entryId: entryToValidate.id,
                newCleaner: cleaner.name
              }],
              estimatedBenefit: {
                timeSaved: 0,
                costReduction: 0,
                efficiencyGain: 30
              }
            }));
            
            validationConflicts.push({
              id: `security-access-${entryToValidate.id}`,
              type: 'security_access_denied',
              severity: 'critical',
              title: 'Security Access Violation',
              description: `${unauthorizedCleaners.join(', ')} lack${unauthorizedCleaners.length === 1 ? 's' : ''} required security clearance for ${building.buildingName} (requires ${jobSecurityLevel.toUpperCase()})`,
              affectedEntries: [entryToValidate],
              suggestedResolutions: resolutions,
              estimatedImpact: {
                timeWasted: 60,
                costIncrease: 200,
                efficiencyLoss: 50
              }
            });
          } else {
            console.log(`✅ All cleaners authorized for ${building.buildingName}`);
          }
        } else {
          console.log(`⚠️  No building data or security level found for ${entryToValidate.clientName} - ${entryToValidate.buildingName}, skipping security check`);
        }
      } else {
        // For new entries, use the full security conflict detection
        const securityConflicts = detectSecurityAccessConflicts(tempSchedule, cleaners, clientBuildings || [])
          .filter(conflict => {
            return conflict.affectedEntries.some(entry => entry.id === entryToValidate.id);
          });
        validationConflicts.push(...securityConflicts);
      }
      
      // Filter out low-severity conflicts for validation
      const criticalConflicts = validationConflicts.filter(c => 
        c.severity === 'critical' || c.severity === 'high'
      );
      
      console.log('Validation results:', {
        totalConflicts: validationConflicts.length,
        criticalConflicts: criticalConflicts.length,
        canProceed: criticalConflicts.length === 0,
        conflictTypes: validationConflicts.map(c => c.type)
      });

      const warnings: string[] = [];
      const mediumLowConflicts = validationConflicts.filter(c => 
        c.severity === 'medium' || c.severity === 'low'
      );
      
      if (mediumLowConflicts.length > 0) {
        warnings.push(`This change will create ${mediumLowConflicts.length} minor scheduling issue(s)`);
      }

      console.log('=== VALIDATION COMPLETED ===');
      return {
        hasConflicts: validationConflicts.length > 0,
        conflicts: validationConflicts,
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
  }, [schedule, cleaners, clientBuildings, getEntryCleaners]);

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
          const entryCleaners = getEntryCleaners(entry);
          return entryCleaners.includes(cleanerName);
        })
      );
    } catch (error) {
      console.error('Error getting cleaner conflicts:', error);
      return [];
    }
  }, [conflicts, getEntryCleaners]);

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
    console.log('Detecting cleaner double booking conflicts...');
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

    console.log('Cleaner-day mappings created:', cleanerDayMap.size);

    // Check for conflicts - only flag if there are actually multiple DIFFERENT entries
    for (const [key, entries] of cleanerDayMap) {
      if (entries.length > 1) {
        // Filter out duplicate entries (same ID) that might occur during validation
        const uniqueEntries = entries.filter((entry, index, arr) => 
          arr.findIndex(e => e.id === entry.id) === index
        );
        
        if (uniqueEntries.length > 1) {
          const [cleanerName, day] = key.split('|');
          const cleaner = cleaners.find(c => c.name === cleanerName);
          
          console.log(`Double booking detected: ${cleanerName} on ${day} with ${uniqueEntries.length} unique jobs`);
          
          // Generate resolution suggestions
          const resolutions = generateCleanerConflictResolutions(uniqueEntries, cleaners);
          
          conflicts.push({
            id: `cleaner-conflict-${key}`,
            type: 'cleaner_double_booking',
            severity: uniqueEntries.length > 2 ? 'critical' : 'high',
            title: 'Cleaner Double Booking',
            description: `${cleanerName} is scheduled for ${uniqueEntries.length} jobs on ${day}`,
            affectedEntries: uniqueEntries,
            suggestedResolutions: resolutions,
            estimatedImpact: {
              timeWasted: uniqueEntries.length * 30, // 30 min per conflict
              costIncrease: uniqueEntries.length * 50, // $50 per conflict
              efficiencyLoss: uniqueEntries.length * 15 // 15% efficiency loss
            }
          });
        }
      }
    }

    console.log('Cleaner double booking conflicts found:', conflicts.length);
    return conflicts;
  }

  function detectTimeOverlapConflicts(schedule: ScheduleEntry[]): ConflictDetails[] {
    console.log('Detecting time overlap conflicts...');
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

      // Filter out duplicate entries (same ID) that might occur during validation
      const uniqueEntries = entries.filter((entry, index, arr) => 
        arr.findIndex(e => e.id === entry.id) === index
      );

      if (uniqueEntries.length < 2) continue;

      const sortedEntries = uniqueEntries.sort((a, b) => 
        (a.startTime || '').localeCompare(b.startTime || '')
      );

      for (let i = 0; i < sortedEntries.length - 1; i++) {
        const current = sortedEntries[i];
        const next = sortedEntries[i + 1];

        // Skip if comparing the same entry (shouldn't happen but safety check)
        if (current.id === next.id) continue;

        if (current.startTime && next.startTime && current.hours) {
          const currentEnd = addHoursToTime(current.startTime, current.hours);
          if (currentEnd > next.startTime) {
            const [cleanerName, day] = key.split('|');
            
            console.log(`Time overlap detected: ${cleanerName} on ${day} between entries ${current.id} and ${next.id}`);
            
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

    console.log('Time overlap conflicts found:', conflicts.length);
    return conflicts;
  }

  function detectSecurityAccessConflicts(schedule: ScheduleEntry[], cleaners: Cleaner[], clientBuildings: ClientBuilding[]): ConflictDetails[] {
    console.log('=== DETECTING SECURITY ACCESS CONFLICTS ===');
    const conflicts: ConflictDetails[] = [];
    
    // Helper function to check if cleaner can access job security level
    const canAccessJob = (cleanerLevel: string, jobLevel: string): boolean => {
      const levels = { low: 1, medium: 2, high: 3 };
      const cleanerLevelNum = levels[cleanerLevel as keyof typeof levels] || 1;
      const jobLevelNum = levels[jobLevel as keyof typeof levels] || 1;
      const canAccess = cleanerLevelNum >= jobLevelNum;
      console.log(`Security check: cleaner ${cleanerLevel} (${cleanerLevelNum}) vs job ${jobLevel} (${jobLevelNum}) = ${canAccess ? 'ALLOWED' : 'DENIED'}`);
      return canAccess;
    };

    console.log(`Checking security conflicts for ${schedule.length} schedule entries against ${clientBuildings.length} buildings`);
    
    for (const entry of schedule) {
      if (!entry || entry.status === 'cancelled') continue;
      
      console.log(`\n--- Checking entry: ${entry.clientName} - ${entry.buildingName} ---`);
      
      // Find the building data to get the actual security level
      const building = clientBuildings.find(b => 
        b.clientName === entry.clientName && 
        b.buildingName === entry.buildingName
      );
      
      if (!building) {
        console.log(`⚠️  No building data found for ${entry.clientName} - ${entry.buildingName}, skipping security check`);
        continue;
      }
      
      if (!building.securityLevel) {
        console.log(`⚠️  No security level defined for building ${building.buildingName}, skipping security check`);
        continue;
      }
      
      const jobSecurityLevel = building.securityLevel;
      console.log(`📋 Building ${building.buildingName} requires ${jobSecurityLevel.toUpperCase()} security clearance`);
      
      const entryCleaners = getEntryCleaners(entry);
      console.log(`👥 Entry has ${entryCleaners.length} cleaner(s): ${entryCleaners.join(', ')}`);
      
      const unauthorizedCleaners: string[] = [];
      
      for (const cleanerName of entryCleaners) {
        const cleaner = cleaners.find(c => c.name === cleanerName);
        if (!cleaner) {
          console.log(`❌ Cleaner ${cleanerName} not found in cleaners database`);
          continue;
        }
        
        const cleanerSecurityLevel = cleaner.securityLevel || 'low';
        console.log(`🔍 Checking cleaner ${cleanerName}: has ${cleanerSecurityLevel.toUpperCase()} clearance`);
        
        if (!canAccessJob(cleanerSecurityLevel, jobSecurityLevel)) {
          console.log(`🚫 SECURITY VIOLATION: ${cleanerName} (${cleanerSecurityLevel}) cannot access ${entry.buildingName} (requires ${jobSecurityLevel})`);
          unauthorizedCleaners.push(cleanerName);
        } else {
          console.log(`✅ SECURITY OK: ${cleanerName} (${cleanerSecurityLevel}) can access ${entry.buildingName} (requires ${jobSecurityLevel})`);
        }
      }
      
      if (unauthorizedCleaners.length > 0) {
        console.log(`🚨 CONFLICT DETECTED: ${unauthorizedCleaners.length} unauthorized cleaner(s) for ${entry.buildingName}`);
        
        // Find alternative cleaners with proper security clearance
        const authorizedCleaners = cleaners.filter(c => 
          c.isActive && 
          canAccessJob(c.securityLevel || 'low', jobSecurityLevel) &&
          !entryCleaners.includes(c.name)
        );
        
        console.log(`💡 Found ${authorizedCleaners.length} alternative authorized cleaners`);
        
        const resolutions: ConflictResolution[] = authorizedCleaners.slice(0, 3).map(cleaner => ({
          id: `security-reassign-${entry.id}-${cleaner.id}`,
          type: 'reassign_cleaner',
          title: `Reassign to ${cleaner.name}`,
          description: `Replace unauthorized cleaner with ${cleaner.name} (${cleaner.securityLevel?.toUpperCase()} security)`,
          changes: [{
            entryId: entry.id,
            newCleaner: cleaner.name
          }],
          estimatedBenefit: {
            timeSaved: 0,
            costReduction: 0,
            efficiencyGain: 30 // High efficiency gain from proper security compliance
          }
        }));
        
        conflicts.push({
          id: `security-access-${entry.id}`,
          type: 'security_access_denied',
          severity: 'critical',
          title: 'Security Access Violation',
          description: `${unauthorizedCleaners.join(', ')} lack${unauthorizedCleaners.length === 1 ? 's' : ''} required security clearance for ${entry.buildingName} (requires ${jobSecurityLevel.toUpperCase()})`,
          affectedEntries: [entry],
          suggestedResolutions: resolutions,
          estimatedImpact: {
            timeWasted: 60, // Time to resolve security issues
            costIncrease: 200, // Potential security breach costs
            efficiencyLoss: 50 // Major efficiency loss due to security violations
          }
        });
      } else {
        console.log(`✅ All cleaners authorized for ${entry.buildingName}`);
      }
    }
    
    console.log(`=== SECURITY CONFLICTS SUMMARY: ${conflicts.length} conflicts found ===`);
    return conflicts;
  }

  function detectWorkloadImbalance(schedule: ScheduleEntry[], cleaners: Cleaner[]): ConflictDetails[] {
    console.log('Detecting workload imbalance conflicts...');
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
      console.log(`Workload imbalance detected: ${overloaded.length} overloaded, ${underloaded.length} underloaded`);
      
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

    console.log('Workload imbalance conflicts found:', conflicts.length);
    return conflicts;
  }

  function detectLocationEfficiencyIssues(schedule: ScheduleEntry[]): ConflictDetails[] {
    console.log('Detecting location efficiency conflicts...');
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
        
        console.log(`Location efficiency issue: ${cleanerName} travels between ${clientGroups.size} clients on ${day}`);
        
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

    console.log('Location efficiency conflicts found:', conflicts.length);
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
