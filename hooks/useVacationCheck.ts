
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from './useDatabase';

interface CleanerVacation {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

interface VacationConflict {
  cleanerName: string;
  vacation: CleanerVacation;
  conflictType: 'exact' | 'overlapping';
}

export function useVacationCheck() {
  const { executeQuery, config } = useDatabase();
  const [vacations, setVacations] = useState<CleanerVacation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load all active vacations
  const loadVacations = useCallback(async () => {
    if (!config.useSupabase) {
      console.log('Supabase not configured, skipping vacation load');
      return;
    }

    setIsLoading(true);
    try {
      const result = await executeQuery(
        `SELECT * FROM cleaner_vacations 
         WHERE status = 'approved' 
         ORDER BY start_date ASC`
      );
      
      if (result.success && result.data) {
        setVacations(result.data);
        console.log('Loaded vacations:', result.data.length);
      }
    } catch (error) {
      console.error('Error loading vacations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [config.useSupabase, executeQuery]);

  // Check if a cleaner is on vacation for a specific date
  const isCleanerOnVacation = useCallback((cleanerName: string, date: Date): CleanerVacation | null => {
    const dateStr = date.toISOString().split('T')[0];
    
    const vacation = vacations.find(v => 
      v.cleaner_name === cleanerName &&
      v.status === 'approved' &&
      dateStr >= v.start_date &&
      dateStr <= v.end_date
    );

    return vacation || null;
  }, [vacations]);

  // Check for vacation conflicts when assigning a shift
  const checkVacationConflict = useCallback((
    cleanerNames: string[],
    weekId: string,
    day: string
  ): VacationConflict[] => {
    const conflicts: VacationConflict[] = [];
    
    // Parse week ID to get the date
    // Week ID format: YYYY-MM-DD (Monday of the week)
    const [year, month, dayOfMonth] = weekId.split('-').map(Number);
    const weekStart = new Date(year, month - 1, dayOfMonth);
    
    // Map day name to day offset
    const dayOffsets: { [key: string]: number } = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4,
      'saturday': 5,
      'sunday': 6
    };
    
    const dayOffset = dayOffsets[day.toLowerCase()] || 0;
    const shiftDate = new Date(weekStart);
    shiftDate.setDate(weekStart.getDate() + dayOffset);
    
    // Check each cleaner
    for (const cleanerName of cleanerNames) {
      const vacation = isCleanerOnVacation(cleanerName, shiftDate);
      if (vacation) {
        conflicts.push({
          cleanerName,
          vacation,
          conflictType: 'exact'
        });
      }
    }
    
    return conflicts;
  }, [isCleanerOnVacation]);

  // Get all vacations for a specific cleaner
  const getCleanerVacations = useCallback((cleanerName: string): CleanerVacation[] => {
    return vacations.filter(v => 
      v.cleaner_name === cleanerName &&
      v.status === 'approved'
    );
  }, [vacations]);

  // Get upcoming vacations (within next 30 days)
  const getUpcomingVacations = useCallback((): CleanerVacation[] => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = thirtyDaysFromNow.toISOString().split('T')[0];
    
    return vacations.filter(v => 
      v.status === 'approved' &&
      v.start_date >= todayStr &&
      v.start_date <= futureStr
    );
  }, [vacations]);

  // Get active vacations (currently ongoing)
  const getActiveVacations = useCallback((): CleanerVacation[] => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return vacations.filter(v => 
      v.status === 'approved' &&
      v.start_date <= todayStr &&
      v.end_date >= todayStr
    );
  }, [vacations]);

  // Load vacations on mount
  useEffect(() => {
    loadVacations();
  }, [loadVacations]);

  return {
    vacations,
    isLoading,
    loadVacations,
    isCleanerOnVacation,
    checkVacationConflict,
    getCleanerVacations,
    getUpcomingVacations,
    getActiveVacations
  };
}
