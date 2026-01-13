import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../app/integrations/supabase/client';

export interface TimeOffRequest {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  request_type: 'single_shift' | 'date_range' | 'recurring_instances';
  shift_id?: string;
  shift_date?: string;
  start_date?: string;
  end_date?: string;
  recurring_shift_id?: string;
  requested_dates?: string[];
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  reviewed_by?: string;
  reviewed_at?: string;
  decline_reason?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch and manage time off requests
 */
export function useTimeOffRequests() {
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch approved time off requests for a specific date range
   */
  const fetchApprovedTimeOff = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('status', 'approved')
        .or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate}),and(start_date.lte.${startDate},end_date.gte.${endDate})`);

      if (error) throw error;

      setTimeOffRequests(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching approved time off:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if a cleaner has approved time off on a specific date
   */
  const isCleanerOnTimeOff = useCallback((cleanerName: string, date: string): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return timeOffRequests.some(request => {
      if (request.cleaner_name !== cleanerName) return false;

      // Check single shift
      if (request.request_type === 'single_shift' && request.shift_date) {
        const shiftDate = new Date(request.shift_date);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === checkDate.getTime();
      }

      // Check date range
      if (request.request_type === 'date_range' && request.start_date && request.end_date) {
        const startDate = new Date(request.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(request.end_date);
        endDate.setHours(23, 59, 59, 999);
        return checkDate >= startDate && checkDate <= endDate;
      }

      // Check recurring instances
      if (request.request_type === 'recurring_instances' && request.requested_dates) {
        return request.requested_dates.some(d => {
          const reqDate = new Date(d);
          reqDate.setHours(0, 0, 0, 0);
          return reqDate.getTime() === checkDate.getTime();
        });
      }

      return false;
    });
  }, [timeOffRequests]);

  /**
   * Get all approved time off requests for a specific date
   */
  const getTimeOffForDate = useCallback((date: string): TimeOffRequest[] => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return timeOffRequests.filter(request => {
      // Check single shift
      if (request.request_type === 'single_shift' && request.shift_date) {
        const shiftDate = new Date(request.shift_date);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === checkDate.getTime();
      }

      // Check date range
      if (request.request_type === 'date_range' && request.start_date && request.end_date) {
        const startDate = new Date(request.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(request.end_date);
        endDate.setHours(23, 59, 59, 999);
        return checkDate >= startDate && checkDate <= endDate;
      }

      // Check recurring instances
      if (request.request_type === 'recurring_instances' && request.requested_dates) {
        return request.requested_dates.some(d => {
          const reqDate = new Date(d);
          reqDate.setHours(0, 0, 0, 0);
          return reqDate.getTime() === checkDate.getTime();
        });
      }

      return false;
    });
  }, [timeOffRequests]);

  /**
   * Get time off request details for a cleaner on a specific date
   */
  const getCleanerTimeOffDetails = useCallback((cleanerName: string, date: string): TimeOffRequest | null => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const request = timeOffRequests.find(request => {
      if (request.cleaner_name !== cleanerName) return false;

      // Check single shift
      if (request.request_type === 'single_shift' && request.shift_date) {
        const shiftDate = new Date(request.shift_date);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === checkDate.getTime();
      }

      // Check date range
      if (request.request_type === 'date_range' && request.start_date && request.end_date) {
        const startDate = new Date(request.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(request.end_date);
        endDate.setHours(23, 59, 59, 999);
        return checkDate >= startDate && checkDate <= endDate;
      }

      // Check recurring instances
      if (request.request_type === 'recurring_instances' && request.requested_dates) {
        return request.requested_dates.some(d => {
          const reqDate = new Date(d);
          reqDate.setHours(0, 0, 0, 0);
          return reqDate.getTime() === checkDate.getTime();
        });
      }

      return false;
    });

    return request || null;
  }, [timeOffRequests]);

  return {
    timeOffRequests,
    isLoading,
    fetchApprovedTimeOff,
    isCleanerOnTimeOff,
    getTimeOffForDate,
    getCleanerTimeOffDetails,
  };
}
