
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Platform, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import AnimatedCard from '../../components/AnimatedCard';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Cleaner } from '../../hooks/useClientData';
import { useDatabase } from '../../hooks/useDatabase';
import Button from '../../components/Button';
import { supabase } from '../integrations/supabase/client';

interface CleanerHours {
  cleanerId: string;
  cleanerName: string;
  totalHours: number;
  completedHours: number;
  scheduledHours: number;
  overtimeHours: number;
  regularHours: number;
  // Payment breakdown
  hourlyJobs: ScheduleEntry[];
  flatRateJobs: ScheduleEntry[];
  totalHourlyPay: number;
  totalFlatRatePay: number;
  totalPay: number;
  averageHourlyRate: number;
  dailyBreakdown: {
    [date: string]: {
      hours: number;
      status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
      entries: ScheduleEntry[];
      pay: number;
    };
  };
  weeklyTotal: number;
  biWeeklyTotal: number;
}

interface PayrollFilters {
  searchQuery: string;
  dateRange: 'week' | 'biweekly';
  statusFilter: 'all' | 'completed' | 'scheduled' | 'in-progress';
  paymentTypeFilter: 'all' | 'hourly' | 'flat_rate';
  sortBy: 'name' | 'hours' | 'overtime' | 'pay';
  sortOrder: 'asc' | 'desc';
}

interface PayrollRecord {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  week_id: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  regular_pay: number;
  overtime_pay: number;
  flat_rate_pay: number;
  total_pay: number;
  status: 'draft' | 'approved' | 'paid';
  created_at?: string;
  updated_at?: string;
}

interface ClockRecord {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  schedule_entry_id?: string;
  building_name: string;
  client_name: string;
  clock_in_time?: string;
  clock_out_time?: string;
  total_minutes?: number;
  status: 'clocked_in' | 'clocked_out' | 'auto_clocked_out';
}

interface JobsiteBreakdown {
  key: string;
  clientName: string;
  buildingName: string;
  totalHours: number;
  totalPay: number;
  cleanerCount: number;
  cleaners: string[];
}

interface AnomalyFlag {
  cleanerId: string;
  cleanerName: string;
  type: 'high_pay' | 'duplicate_hours' | 'no_clock_record';
  message: string;
  severity: 'warning' | 'error';
}

const styles = StyleSheet.create({
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  datePickerContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  datePickerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.background,
  },
  hoursCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  hoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cleanerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  totalHours: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalPay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: spacing.xs,
  },
  hoursBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  hoursItem: {
    alignItems: 'center',
    flex: 1,
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  hoursLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentBreakdown: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  paymentBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  paymentTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  paymentTypeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  overtimeIndicator: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  overtimeText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  dailyBreakdown: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  dayHours: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
  dayPay: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
    minWidth: 80,
    textAlign: 'right',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryPayValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  exportButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  generatePayrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  generatePayrollButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  // Source toggle
  sourceToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sourceToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sourceToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sourceToggleBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  sourceToggleBtnTextActive: { color: colors.background },
  // View tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.background, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabBtnTextActive: { color: colors.primary },
  // Anomaly banner
  anomalyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  anomalyText: { fontSize: 12, flex: 1, fontWeight: '500' },
  // Approval row
  approvalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  approvalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  approvalBtnText: { fontSize: 12, fontWeight: '700' },
  approvalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  approvalStatusText: { fontSize: 11, fontWeight: '700' },
  // Jobsite card
  jobsiteCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  jobsiteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  jobsiteName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  jobsiteClient: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  jobsiteStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  jobsiteStatItem: { alignItems: 'center' },
  jobsiteStatValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  jobsiteStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  // Clock source badge on card
  clockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  clockBadgeText: { fontSize: 11, fontWeight: '600' },
});

export default function PayrollScreen() {
  console.log('PayrollScreen rendered');
  
  const { toast, showToast, hideToast } = useToast();
  const { getWeekIdFromDate, getWeekSchedule } = useScheduleStorage();
  const { cleaners } = useClientData();
  const { executeQuery } = useDatabase();
  
  const [filters, setFilters] = useState<PayrollFilters>({
    searchQuery: '',
    dateRange: 'week',
    statusFilter: 'all',
    paymentTypeFilter: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<Set<string>>(new Set());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);

  // New state for improvements
  const [hoursSource, setHoursSource] = useState<'scheduled' | 'actual'>('scheduled');
  const [activeView, setActiveView] = useState<'cleaner' | 'jobsite'>('cleaner');
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([]);
  const [isLoadingClock, setIsLoadingClock] = useState(false);
  const [previousRecords, setPreviousRecords] = useState<PayrollRecord[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<Record<string, 'draft' | 'approved' | 'paid'>>({});

  // Helper function to create date from string without timezone issues
  const createDateFromString = useCallback((dateString: string): Date => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    } catch (error) {
      console.error('Error creating date from string:', error);
      return new Date();
    }
  }, []);

  // Helper function to format date string consistently
  const formatDateString = useCallback((date: Date): string => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Helper function to get start of week consistently
  const getStartOfWeek = useCallback((date: Date): Date => {
    try {
      const startOfWeek = new Date(date);
      const dayOfWeek = startOfWeek.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek;
    } catch (error) {
      console.error('Error getting start of week:', error);
      return new Date();
    }
  }, []);

  // Load clock records from DB for current pay period
  useEffect(() => {
    const loadClockRecords = async () => {
      setIsLoadingClock(true);
      try {
        const startStr = formatDateString(selectedWeekStart);
        const daysInPeriod = filters.dateRange === 'week' ? 6 : 13;
        const endDate = new Date(selectedWeekStart);
        endDate.setDate(endDate.getDate() + daysInPeriod);
        const endStr = formatDateString(endDate);

        const { data, error } = await supabase
          .from('clock_records')
          .select('*')
          .gte('clock_in_time', `${startStr}T00:00:00`)
          .lte('clock_in_time', `${endStr}T23:59:59`);

        if (!error && data) {
          setClockRecords(data as ClockRecord[]);
        }
      } catch (e) {
        console.error('Failed to load clock records:', e);
      } finally {
        setIsLoadingClock(false);
      }
    };
    loadClockRecords();
  }, [selectedWeekStart, filters.dateRange, formatDateString]);

  // Load previous 4 weeks of payroll records for anomaly detection
  useEffect(() => {
    const loadPreviousRecords = async () => {
      try {
        const weekIds: string[] = [];
        for (let i = 1; i <= 4; i++) {
          const d = new Date(selectedWeekStart);
          d.setDate(d.getDate() - i * 7);
          weekIds.push(formatDateString(d));
        }
        const { data, error } = await supabase
          .from('payroll_records')
          .select('*')
          .in('week_id', weekIds);
        if (!error && data) setPreviousRecords(data as PayrollRecord[]);
      } catch (e) {
        console.error('Failed to load previous records:', e);
      }
    };
    loadPreviousRecords();
  }, [selectedWeekStart, formatDateString]);

  // Load approval statuses from existing payroll records for current period
  useEffect(() => {
    const loadApprovalStatus = async () => {
      try {
        const weekId = formatDateString(selectedWeekStart);
        const { data, error } = await supabase
          .from('payroll_records')
          .select('cleaner_id, status')
          .eq('week_id', weekId);
        if (!error && data) {
          const map: Record<string, 'draft' | 'approved' | 'paid'> = {};
          data.forEach((r: any) => { map[r.cleaner_id] = r.status; });
          setApprovalStatus(map);
        }
      } catch (e) {
        console.error('Failed to load approval status:', e);
      }
    };
    loadApprovalStatus();
  }, [selectedWeekStart, formatDateString, payrollRecords]);

  // Enhanced cleaner hours calculation with payment information
  const cleanerHoursData = useMemo(() => {
    console.log('=== CALCULATING CLEANER HOURS DATA ===');
    console.log('Selected week start:', selectedWeekStart);
    console.log('Date range:', filters.dateRange);
    
    // Determine the exact date range from the custom start date
    const startDate = selectedWeekStart;
    const daysInPeriod = filters.dateRange === 'week' ? 6 : 13;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysInPeriod);

    const startDateStr = formatDateString(startDate);
    const endDateStr = formatDateString(endDate);

    // Collect all week IDs that overlap with the selected date range
    const weekIds: string[] = [];
    const checkDate = new Date(startDate);
    while (checkDate <= endDate) {
      const weekId = getWeekIdFromDate(checkDate);
      if (!weekIds.includes(weekId)) {
        weekIds.push(weekId);
      }
      checkDate.setDate(checkDate.getDate() + 7);
    }

    console.log('Processing weeks:', weekIds);

    const cleanerHoursMap = new Map<string, CleanerHours>();
    
    // Initialize cleaner data
    cleaners.forEach(cleaner => {
      cleanerHoursMap.set(cleaner.id, {
        cleanerId: cleaner.id,
        cleanerName: cleaner.name,
        totalHours: 0,
        completedHours: 0,
        scheduledHours: 0,
        overtimeHours: 0,
        regularHours: 0,
        hourlyJobs: [],
        flatRateJobs: [],
        totalHourlyPay: 0,
        totalFlatRatePay: 0,
        totalPay: 0,
        averageHourlyRate: 0,
        dailyBreakdown: {},
        weeklyTotal: 0,
        biWeeklyTotal: 0,
      });
    });
    
    // Collect all entries for the overlapping weeks, then filter to exact date range
    const rawEntries: ScheduleEntry[] = [];
    weekIds.forEach(weekId => {
      const weekSchedule = getWeekSchedule(weekId);
      rawEntries.push(...weekSchedule);
    });

    const allEntries = rawEntries.filter(entry => {
      if (!entry.date) return false;
      return entry.date >= startDateStr && entry.date <= endDateStr;
    });

    console.log('Total entries for period:', allEntries.length);

    // Group entries by week for proper overtime calculation
    const entriesByWeek = new Map<string, ScheduleEntry[]>();
    allEntries.forEach(entry => {
      const weekId = entry.weekId || entry.date;
      if (!entriesByWeek.has(weekId)) {
        entriesByWeek.set(weekId, []);
      }
      entriesByWeek.get(weekId)!.push(entry);
    });
    
    console.log('Entries grouped by week:', entriesByWeek.size);
    
    // Process each week separately for accurate overtime calculation
    for (const [weekId, weekEntries] of entriesByWeek) {
      console.log(`\n📅 Processing week ${weekId} with ${weekEntries.length} entries`);
      
      // Group entries by cleaner for this week
      const cleanerWeekHours = new Map<string, { hours: number; entries: ScheduleEntry[] }>();
      
      weekEntries.forEach(entry => {
        const entryCleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
          ? entry.cleanerNames 
          : (entry.cleanerName ? [entry.cleanerName] : []);
        
        entryCleaners.forEach(cleanerName => {
          const cleaner = cleaners.find(c => c.name === cleanerName || c.id === cleanerName);
          const cleanerId = cleaner?.id || cleanerName;
          
          if (!cleanerWeekHours.has(cleanerId)) {
            cleanerWeekHours.set(cleanerId, { hours: 0, entries: [] });
          }
          
          let hours = entry.hours || 0;
          // #1 — Use actual clocked hours when toggle is set
          if (hoursSource === 'actual') {
            const clockMatch = clockRecords.find(
              cr => cr.schedule_entry_id === entry.id ||
                (cr.cleaner_id === cleanerId && cr.clock_in_time?.startsWith(entry.date || ''))
            );
            if (clockMatch?.total_minutes) {
              hours = clockMatch.total_minutes / 60;
            } else {
              hours = 0; // no clock record = no pay
            }
          }
          const splitHours = entryCleaners.length > 1 ? hours / entryCleaners.length : hours;

          const data = cleanerWeekHours.get(cleanerId)!;
          data.hours += splitHours;
          data.entries.push(entry);
        });
      });
      
      // Calculate overtime per cleaner per week
      for (const [cleanerId, { hours: weekHours, entries: cleanerEntries }] of cleanerWeekHours) {
        let cleanerData = cleanerHoursMap.get(cleanerId);
        
        if (!cleanerData) {
          const cleanerName = cleaners.find(c => c.id === cleanerId)?.name || cleanerId;
          cleanerData = {
            cleanerId: cleanerId,
            cleanerName: cleanerName,
            totalHours: 0,
            completedHours: 0,
            scheduledHours: 0,
            overtimeHours: 0,
            regularHours: 0,
            hourlyJobs: [],
            flatRateJobs: [],
            totalHourlyPay: 0,
            totalFlatRatePay: 0,
            totalPay: 0,
            averageHourlyRate: 0,
            dailyBreakdown: {},
            weeklyTotal: 0,
            biWeeklyTotal: 0,
          };
          cleanerHoursMap.set(cleanerId, cleanerData);
        }
        
        console.log(`  👤 ${cleanerData.cleanerName}: ${weekHours}h this week`);
        
        // Calculate regular vs overtime for this week
        const weekRegularHours = Math.min(weekHours, 40);
        const weekOvertimeHours = Math.max(0, weekHours - 40);
        
        cleanerData.totalHours += weekHours;
        cleanerData.regularHours += weekRegularHours;
        cleanerData.overtimeHours += weekOvertimeHours;
        
        console.log(`    Regular: ${weekRegularHours}h, Overtime: ${weekOvertimeHours}h`);
        
        // Process each entry for this cleaner in this week
        let weekRegularPay = 0;
        let weekOvertimePay = 0;
        
        for (const entry of cleanerEntries) {
          const entryCleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
            ? entry.cleanerNames 
            : (entry.cleanerName ? [entry.cleanerName] : []);
          
          let hours = entry.hours || 0;
          if (hoursSource === 'actual') {
            const clockMatch = clockRecords.find(
              cr => cr.schedule_entry_id === entry.id ||
                (cr.cleaner_id === cleanerId && cr.clock_in_time?.startsWith(entry.date || ''))
            );
            hours = clockMatch?.total_minutes ? clockMatch.total_minutes / 60 : 0;
          }
          const splitHours = entryCleaners.length > 1 ? hours / entryCleaners.length : hours;
          const paymentType = entry.paymentType || 'hourly';
          const entryDate = entry.date || weekId;
          
          if (entry.status === 'completed') {
            cleanerData.completedHours += splitHours;
          } else if (entry.status === 'scheduled') {
            cleanerData.scheduledHours += splitHours;
          }
          
          let entryPay = 0;
          
          if (paymentType === 'flat_rate') {
            const flatRateAmount = entry.flatRateAmount || 0;
            entryPay = entryCleaners.length > 1 ? flatRateAmount / entryCleaners.length : flatRateAmount;
            cleanerData.totalFlatRatePay += entryPay;
            cleanerData.flatRateJobs.push(entry);
            
            console.log(`    💰 Flat rate: $${entryPay.toFixed(2)}`);
          } else {
            const hourlyRate = entry.hourlyRate || cleaners.find(c => c.id === cleanerId)?.default_hourly_rate || 15;
            
            // Allocate hours to regular or overtime
            const hoursToRegular = Math.min(splitHours, Math.max(0, 40 - (cleanerData.regularHours - weekRegularHours)));
            const hoursToOvertime = splitHours - hoursToRegular;
            
            const regularPay = hoursToRegular * hourlyRate;
            const overtimePay = hoursToOvertime * hourlyRate * 1.5;
            entryPay = regularPay + overtimePay;
            
            weekRegularPay += regularPay;
            weekOvertimePay += overtimePay;
            cleanerData.totalHourlyPay += entryPay;
            cleanerData.hourlyJobs.push(entry);
            
            console.log(`    ⏰ Hourly: ${hoursToRegular}h @ $${hourlyRate}/h + ${hoursToOvertime}h OT = $${entryPay.toFixed(2)}`);
          }
          
          // Daily breakdown
          if (!cleanerData.dailyBreakdown[entryDate]) {
            cleanerData.dailyBreakdown[entryDate] = {
              hours: 0,
              status: entry.status,
              entries: [],
              pay: 0,
            };
          }
          
          cleanerData.dailyBreakdown[entryDate].hours += splitHours;
          cleanerData.dailyBreakdown[entryDate].entries.push(entry);
          cleanerData.dailyBreakdown[entryDate].pay += entryPay;
        }
        
        cleanerData.totalPay = cleanerData.totalHourlyPay + cleanerData.totalFlatRatePay;
        
        // Calculate average hourly rate
        if (cleanerData.totalHours > 0) {
          cleanerData.averageHourlyRate = cleanerData.totalPay / cleanerData.totalHours;
        }
        
        // Update weekly/biweekly totals
        if (filters.dateRange === 'week') {
          cleanerData.weeklyTotal = cleanerData.totalHours;
        } else {
          cleanerData.biWeeklyTotal = cleanerData.totalHours;
        }
      }
    }
    
    const result = Array.from(cleanerHoursMap.values()).filter(cleaner => cleaner.totalHours > 0);
    console.log(`✅ Calculated data for ${result.length} cleaners`);
    console.log('=== CALCULATION COMPLETE ===\n');
    
    return result;
  }, [selectedWeekStart, filters.dateRange, cleaners, getWeekSchedule, getWeekIdFromDate, hoursSource, clockRecords]);

  // Enhanced filter and sort with payment type filter
  const filteredAndSortedHours = useMemo(() => {
    let filtered = cleanerHoursData;
    
    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(cleaner =>
        cleaner.cleanerName.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(cleaner => {
        const hasStatus = Object.values(cleaner.dailyBreakdown).some(day =>
          day.entries.some(entry => entry.status === filters.statusFilter)
        );
        return hasStatus;
      });
    }
    
    // Apply payment type filter
    if (filters.paymentTypeFilter !== 'all') {
      filtered = filtered.filter(cleaner => {
        if (filters.paymentTypeFilter === 'hourly') {
          return cleaner.hourlyJobs.length > 0;
        } else if (filters.paymentTypeFilter === 'flat_rate') {
          return cleaner.flatRateJobs.length > 0;
        }
        return true;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.cleanerName.localeCompare(b.cleanerName);
          break;
        case 'hours':
          comparison = a.totalHours - b.totalHours;
          break;
        case 'overtime':
          comparison = a.overtimeHours - b.overtimeHours;
          break;
        case 'pay':
          comparison = a.totalPay - b.totalPay;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [cleanerHoursData, filters]);

  // Enhanced summary statistics with payment information
  const summaryStats = useMemo(() => {
    const totalCleaners = filteredAndSortedHours.length;
    const totalHours = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.totalHours, 0);
    const totalCompletedHours = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.completedHours, 0);
    const totalOvertimeHours = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.overtimeHours, 0);
    const totalPay = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.totalPay, 0);
    const totalHourlyPay = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.totalHourlyPay, 0);
    const totalFlatRatePay = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.totalFlatRatePay, 0);
    const totalHourlyJobs = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.hourlyJobs.length, 0);
    const totalFlatRateJobs = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.flatRateJobs.length, 0);
    const averageHours = totalCleaners > 0 ? totalHours / totalCleaners : 0;
    const averagePay = totalCleaners > 0 ? totalPay / totalCleaners : 0;
    
    return {
      totalCleaners,
      totalHours,
      totalCompletedHours,
      totalOvertimeHours,
      totalPay,
      totalHourlyPay,
      totalFlatRatePay,
      totalHourlyJobs,
      totalFlatRateJobs,
      averageHours,
      averagePay,
    };
  }, [filteredAndSortedHours]);

  // #3 — Per-jobsite payroll breakdown
  const jobsiteBreakdown = useMemo((): JobsiteBreakdown[] => {
    const map = new Map<string, JobsiteBreakdown>();
    for (const cleaner of cleanerHoursData) {
      const allEntries = [
        ...cleaner.hourlyJobs,
        ...cleaner.flatRateJobs,
      ];
      for (const entry of allEntries) {
        const key = `${entry.clientName}||${entry.buildingName}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            clientName: entry.clientName || 'Unknown Client',
            buildingName: entry.buildingName || 'Unknown Building',
            totalHours: 0,
            totalPay: 0,
            cleanerCount: 0,
            cleaners: [],
          });
        }
        const site = map.get(key)!;
        const entryCleaners = entry.cleanerNames?.length ? entry.cleanerNames : [entry.cleanerName || ''];
        const splitHours = (entry.hours || 0) / (entryCleaners.length || 1);
        let entryPay = 0;
        if (entry.paymentType === 'flat_rate') {
          entryPay = (entry.flatRateAmount || 0) / (entryCleaners.length || 1);
        } else {
          const rate = entry.hourlyRate || 15;
          entryPay = splitHours * rate;
        }
        site.totalHours += splitHours;
        site.totalPay += entryPay;
        if (!site.cleaners.includes(cleaner.cleanerName)) {
          site.cleaners.push(cleaner.cleanerName);
          site.cleanerCount++;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalPay - a.totalPay);
  }, [cleanerHoursData]);

  // #2 & #5 — Anomaly flags: duplicate hours + pay deviation vs previous periods
  const anomalyFlags = useMemo((): Record<string, AnomalyFlag[]> => {
    const result: Record<string, AnomalyFlag[]> = {};

    // Build average pay per cleaner from previous records
    const prevAvg: Record<string, number> = {};
    const prevCount: Record<string, number> = {};
    for (const rec of previousRecords) {
      if (!prevAvg[rec.cleaner_id]) { prevAvg[rec.cleaner_id] = 0; prevCount[rec.cleaner_id] = 0; }
      prevAvg[rec.cleaner_id] += rec.total_pay;
      prevCount[rec.cleaner_id]++;
    }
    for (const id of Object.keys(prevAvg)) {
      prevAvg[id] = prevAvg[id] / prevCount[id];
    }

    for (const cleaner of cleanerHoursData) {
      const flags: AnomalyFlag[] = [];

      // #5 High pay anomaly vs historical average
      if (prevAvg[cleaner.cleanerId] && prevAvg[cleaner.cleanerId] > 0) {
        const deviation = (cleaner.totalPay - prevAvg[cleaner.cleanerId]) / prevAvg[cleaner.cleanerId];
        if (deviation > 0.20) {
          flags.push({
            cleanerId: cleaner.cleanerId,
            cleanerName: cleaner.cleanerName,
            type: 'high_pay',
            message: `Pay is ${(deviation * 100).toFixed(0)}% above their 4-period average ($${prevAvg[cleaner.cleanerId].toFixed(2)})`,
            severity: deviation > 0.50 ? 'error' : 'warning',
          });
        }
      }

      // #2 Duplicate hours: same hours on multiple days (copy-paste pattern)
      const dailyHours = Object.values(cleaner.dailyBreakdown).map(d => d.hours).filter(h => h > 0);
      const seen = new Set<number>();
      const dupes = dailyHours.filter(h => { if (seen.has(h)) return true; seen.add(h); return false; });
      if (dupes.length >= 2) {
        flags.push({
          cleanerId: cleaner.cleanerId,
          cleanerName: cleaner.cleanerName,
          type: 'duplicate_hours',
          message: `Same hours (${dupes[0].toFixed(1)}h) appear on ${dupes.length + 1} days — possible copy-paste`,
          severity: 'warning',
        });
      }

      // #2 No clock record when using scheduled hours
      if (hoursSource === 'scheduled') {
        const allEntries = [...cleaner.hourlyJobs, ...cleaner.flatRateJobs];
        const missingClocks = allEntries.filter(e =>
          e.status === 'completed' &&
          !clockRecords.find(cr => cr.schedule_entry_id === e.id || (cr.cleaner_id === cleaner.cleanerId && cr.clock_in_time?.startsWith(e.date || '')))
        );
        if (missingClocks.length > 0) {
          flags.push({
            cleanerId: cleaner.cleanerId,
            cleanerName: cleaner.cleanerName,
            type: 'no_clock_record',
            message: `${missingClocks.length} completed shift${missingClocks.length > 1 ? 's' : ''} missing clock-in record`,
            severity: 'warning',
          });
        }
      }

      if (flags.length > 0) result[cleaner.cleanerId] = flags;
    }
    return result;
  }, [cleanerHoursData, previousRecords, clockRecords, hoursSource]);

  // #6 — Approval handler
  const handleApproval = useCallback(async (cleanerId: string, cleanerName: string, newStatus: 'approved' | 'paid') => {
    try {
      const weekId = formatDateString(selectedWeekStart);
      const { error } = await supabase
        .from('payroll_records')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('cleaner_id', cleanerId)
        .eq('week_id', weekId);
      if (error) throw error;
      setApprovalStatus(prev => ({ ...prev, [cleanerId]: newStatus }));
      showToast(`${cleanerName} marked as ${newStatus}`, 'success');
    } catch (e) {
      showToast('Failed to update approval status', 'error');
    }
  }, [selectedWeekStart, formatDateString, showToast]);

  // Generate payroll records
  const generatePayrollRecords = useCallback(async () => {
    try {
      setIsGeneratingPayroll(true);
      console.log('Generating payroll records...');
      
      const currentWeekId = formatDateString(selectedWeekStart);
      const records: Omit<PayrollRecord, 'id'>[] = [];
      
      for (const cleanerData of cleanerHoursData) {
        const record: Omit<PayrollRecord, 'id'> = {
          cleaner_id: cleanerData.cleanerId,
          cleaner_name: cleanerData.cleanerName,
          week_id: currentWeekId,
          total_hours: cleanerData.totalHours,
          regular_hours: cleanerData.regularHours,
          overtime_hours: cleanerData.overtimeHours,
          hourly_rate: cleanerData.averageHourlyRate,
          regular_pay: cleanerData.totalHourlyPay - (cleanerData.overtimeHours * cleanerData.averageHourlyRate * 0.5),
          overtime_pay: cleanerData.overtimeHours * cleanerData.averageHourlyRate * 1.5,
          flat_rate_pay: cleanerData.totalFlatRatePay,
          total_pay: cleanerData.totalPay,
          status: 'draft',
        };
        
        records.push(record);
      }
      
      // Remove any existing draft records for this week before inserting
      const { error: deleteError } = await supabase
        .from('payroll_records')
        .delete()
        .eq('week_id', currentWeekId)
        .eq('status', 'draft');
      if (deleteError) console.warn('Could not clear previous drafts:', deleteError);

      // Save to database
      for (const record of records) {
        const recordWithId = {
          ...record,
          id: `payroll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await executeQuery('insert', 'payroll_records', recordWithId);
      }
      
      showToast('Payroll records generated successfully', 'success');
      
      // Load the generated records
      const savedRecords = await executeQuery<PayrollRecord>('select', 'payroll_records', null, {
        week_id: currentWeekId
      });
      setPayrollRecords(savedRecords);
      
    } catch (error) {
      console.error('Error generating payroll records:', error);
      showToast('Failed to generate payroll records', 'error');
    } finally {
      setIsGeneratingPayroll(false);
    }
  }, [cleanerHoursData, selectedWeekStart, formatDateString, executeQuery, showToast]);

  const updateFilter = useCallback((key: keyof PayrollFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleDailyBreakdown = useCallback((cleanerId: string) => {
    setShowDailyBreakdown(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cleanerId)) {
        newSet.delete(cleanerId);
      } else {
        newSet.add(cleanerId);
      }
      return newSet;
    });
  }, []);

  const changeWeek = useCallback((direction: 'prev' | 'next') => {
    setSelectedWeekStart(prev => {
      const newDate = new Date(prev);
      const daysToAdd = direction === 'next' ? 7 : -7;
      newDate.setDate(newDate.getDate() + daysToAdd);
      return newDate;
    });
  }, []);

  // #4 — Real CSV export (QBO-compatible format)
  const exportPayrollData = useCallback(() => {
    const periodLabel = formatDateRange();
    const rows: string[][] = [
      ['Employee Name', 'Pay Period', 'Hours Source', 'Total Hours', 'Regular Hours', 'Overtime Hours',
       'Avg Hourly Rate', 'Regular Pay', 'Overtime Pay', 'Flat Rate Pay', 'Total Pay', 'Approval Status'],
    ];
    for (const cleaner of filteredAndSortedHours) {
      const regularPay = cleaner.regularHours * cleaner.averageHourlyRate;
      const overtimePay = cleaner.overtimeHours * cleaner.averageHourlyRate * 1.5;
      rows.push([
        cleaner.cleanerName,
        periodLabel,
        hoursSource === 'actual' ? 'Clock-In' : 'Scheduled',
        cleaner.totalHours.toFixed(2),
        cleaner.regularHours.toFixed(2),
        cleaner.overtimeHours.toFixed(2),
        cleaner.averageHourlyRate.toFixed(2),
        regularPay.toFixed(2),
        overtimePay.toFixed(2),
        cleaner.totalFlatRatePay.toFixed(2),
        cleaner.totalPay.toFixed(2),
        approvalStatus[cleaner.cleanerId] || 'draft',
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${periodLabel.replace(/\s/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV downloaded', 'success');
    } else {
      showToast('CSV export is available on web', 'info');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAndSortedHours, hoursSource, approvalStatus, showToast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'in-progress': return colors.warning;
      case 'scheduled': return colors.primary;
      case 'cancelled': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  const handleCalendarDayPress = (day: any) => {
    const [year, month, dayNum] = day.dateString.split('-').map(Number);
    setSelectedWeekStart(new Date(year, month - 1, dayNum));
    setShowDatePicker(false);
  };

  const formatDateRange = () => {
    const startDate = selectedWeekStart;
    const startDateString = formatDateString(startDate);
    const daysInPeriod = filters.dateRange === 'week' ? 6 : 13;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysInPeriod);
    const endDateString = formatDateString(endDate);

    const startFormatted = createDateFromString(startDateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endFormatted = createDateFromString(endDateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <View style={commonStyles.container}>
      <Toast {...toast} onHide={hideToast} />
      
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Payroll Management</Text>
        </View>
        <TouchableOpacity onPress={exportPayrollData}>
          <Icon name="download" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Date Range Navigation */}
        <AnimatedCard index={0}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <TouchableOpacity onPress={() => changeWeek('prev')}>
              <Icon name="chevron-back" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>

            <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setShowDatePicker(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="calendar" size={16} style={{ color: colors.primary }} />
                <Text style={[typography.h3, { color: colors.text }]}>
                  {formatDateRange()}
                </Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {filters.dateRange === 'week' ? 'Weekly' : 'Bi-weekly'} Payroll · Tap to change start date
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => changeWeek('next')}>
              <Icon name="chevron-forward" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>
          </View>

        </AnimatedCard>

        <Modal
          visible={showDatePicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Icon name="close" size={24} style={{ color: colors.text }} />
                </TouchableOpacity>
              </View>
              <Calendar
                current={formatDateString(selectedWeekStart)}
                onDayPress={handleCalendarDayPress}
                markedDates={{
                  [formatDateString(selectedWeekStart)]: {
                    selected: true,
                    selectedColor: colors.primary,
                  },
                }}
                theme={{
                  backgroundColor: colors.background,
                  calendarBackground: colors.background,
                  textSectionTitleColor: colors.text,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: colors.background,
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.textSecondary,
                  monthTextColor: colors.text,
                  arrowColor: colors.primary,
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Generate Payroll Button */}
        <AnimatedCard index={1}>
          <TouchableOpacity
            style={styles.generatePayrollButton}
            onPress={generatePayrollRecords}
            disabled={isGeneratingPayroll}
          >
            <Icon name="calculator" size={20} style={{ color: colors.background }} />
            <Text style={styles.generatePayrollButtonText}>
              {isGeneratingPayroll ? 'Generating...' : 'Generate Payroll Records'}
            </Text>
          </TouchableOpacity>

          {/* #1 — Hours source toggle */}
          <View style={styles.sourceToggleRow}>
            <TouchableOpacity
              style={[styles.sourceToggleBtn, hoursSource === 'scheduled' && styles.sourceToggleBtnActive]}
              onPress={() => setHoursSource('scheduled')}
            >
              <Icon name="calendar" size={14} style={{ color: hoursSource === 'scheduled' ? colors.background : colors.text }} />
              <Text style={[styles.sourceToggleBtnText, hoursSource === 'scheduled' && styles.sourceToggleBtnTextActive]}>
                Scheduled Hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sourceToggleBtn, hoursSource === 'actual' && styles.sourceToggleBtnActive]}
              onPress={() => setHoursSource('actual')}
            >
              <Icon name="time" size={14} style={{ color: hoursSource === 'actual' ? colors.background : colors.text }} />
              <Text style={[styles.sourceToggleBtnText, hoursSource === 'actual' && styles.sourceToggleBtnTextActive]}>
                {isLoadingClock ? 'Loading…' : `Actual (${clockRecords.length} records)`}
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Search and Filters */}
        <AnimatedCard index={2}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} style={{ color: colors.textSecondary }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cleaner names..."
              placeholderTextColor={colors.textSecondary}
              value={filters.searchQuery}
              onChangeText={(text) => updateFilter('searchQuery', text)}
            />
            {filters.searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => updateFilter('searchQuery', '')}>
                <Icon name="close" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filters.dateRange === 'week' && styles.filterButtonActive,
              ]}
              onPress={() => updateFilter('dateRange', 'week')}
            >
              <Text style={[
                styles.filterButtonText,
                filters.dateRange === 'week' && styles.filterButtonTextActive,
              ]}>
                Week
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filters.dateRange === 'biweekly' && styles.filterButtonActive,
              ]}
              onPress={() => updateFilter('dateRange', 'biweekly')}
            >
              <Text style={[
                styles.filterButtonText,
                filters.dateRange === 'biweekly' && styles.filterButtonTextActive,
              ]}>
                Bi-weekly
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {['all', 'completed', 'scheduled', 'in-progress'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filters.statusFilter === status && styles.filterButtonActive,
                ]}
                onPress={() => updateFilter('statusFilter', status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.statusFilter === status && styles.filterButtonTextActive,
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Type Filter */}
          <View style={styles.filterRow}>
            {['all', 'hourly', 'flat_rate'].map((paymentType) => (
              <TouchableOpacity
                key={paymentType}
                style={[
                  styles.filterButton,
                  filters.paymentTypeFilter === paymentType && styles.filterButtonActive,
                ]}
                onPress={() => updateFilter('paymentTypeFilter', paymentType)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.paymentTypeFilter === paymentType && styles.filterButtonTextActive,
                ]}>
                  {paymentType === 'flat_rate' ? 'Flat Rate' : paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterRow}>
            <Text style={[typography.body, { color: colors.text }]}>Sort by:</Text>
            {['name', 'hours', 'overtime', 'pay'].map((sortBy) => (
              <TouchableOpacity
                key={sortBy}
                style={[
                  styles.filterButton,
                  filters.sortBy === sortBy && styles.filterButtonActive,
                ]}
                onPress={() => {
                  if (filters.sortBy === sortBy) {
                    updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    updateFilter('sortBy', sortBy);
                    updateFilter('sortOrder', 'asc');
                  }
                }}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.sortBy === sortBy && styles.filterButtonTextActive,
                ]}>
                  {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                  {filters.sortBy === sortBy && (
                    <Icon 
                      name={filters.sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                      size={12} 
                      style={{ marginLeft: 4 }} 
                    />
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedCard>

        {/* Enhanced Summary Statistics */}
        <AnimatedCard index={3}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payroll Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Cleaners</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalCleaners}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalHours.toFixed(1)}h</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Overtime Hours</Text>
              <Text style={[styles.summaryValue, { color: summaryStats.totalOvertimeHours > 0 ? colors.warning : colors.text }]}>
                {summaryStats.totalOvertimeHours.toFixed(1)}h
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Payroll</Text>
              <Text style={styles.summaryPayValue}>${summaryStats.totalPay.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hourly Pay</Text>
              <Text style={styles.summaryValue}>${summaryStats.totalHourlyPay.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Flat Rate Pay</Text>
              <Text style={styles.summaryValue}>${summaryStats.totalFlatRatePay.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Pay/Cleaner</Text>
              <Text style={styles.summaryValue}>${summaryStats.averagePay.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hourly Jobs</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalHourlyJobs}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Flat Rate Jobs</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalFlatRateJobs}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* #3 — View tabs */}
        <AnimatedCard index={3}>
          <View style={styles.tabRow}>
            {(['cleaner', 'jobsite'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeView === tab && styles.tabBtnActive]}
                onPress={() => setActiveView(tab)}
              >
                <Text style={[styles.tabBtnText, activeView === tab && styles.tabBtnTextActive]}>
                  {tab === 'cleaner' ? `By Cleaner (${filteredAndSortedHours.length})` : `By Jobsite (${jobsiteBreakdown.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedCard>

        {/* #2/#5 — Anomaly alerts summary */}
        {Object.keys(anomalyFlags).length > 0 && (
          <AnimatedCard index={4}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Icon name="warning" size={18} style={{ color: colors.warning }} />
              <Text style={[typography.body, { fontWeight: '700', color: colors.text }]}>
                {Object.keys(anomalyFlags).length} Payroll Alert{Object.keys(anomalyFlags).length > 1 ? 's' : ''} — Review Before Approving
              </Text>
            </View>
            {Object.values(anomalyFlags).flat().map((flag, i) => (
              <View
                key={i}
                style={[styles.anomalyBanner, {
                  backgroundColor: flag.severity === 'error' ? colors.danger + '15' : colors.warning + '15',
                }]}
              >
                <Icon
                  name={flag.severity === 'error' ? 'alert-circle' : 'warning'}
                  size={14}
                  style={{ color: flag.severity === 'error' ? colors.danger : colors.warning }}
                />
                <Text style={[styles.anomalyText, { color: flag.severity === 'error' ? colors.danger : colors.warning }]}>
                  <Text style={{ fontWeight: '700' }}>{flag.cleanerName}: </Text>
                  {flag.message}
                </Text>
              </View>
            ))}
          </AnimatedCard>
        )}

        {/* #3 — Jobsite view */}
        {activeView === 'jobsite' && (
          jobsiteBreakdown.length === 0 ? (
            <AnimatedCard index={5}>
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <Icon name="business" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
                <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>No Jobsite Data</Text>
              </View>
            </AnimatedCard>
          ) : (
            jobsiteBreakdown.map((site, index) => (
              <AnimatedCard key={site.key} index={index + 5}>
                <View style={styles.jobsiteCard}>
                  <View style={styles.jobsiteHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobsiteName}>{site.buildingName}</Text>
                      <Text style={styles.jobsiteClient}>{site.clientName}</Text>
                    </View>
                    <Text style={[styles.jobsiteStatValue, { color: colors.success, fontSize: 18 }]}>
                      ${site.totalPay.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.jobsiteStats}>
                    <View style={styles.jobsiteStatItem}>
                      <Text style={styles.jobsiteStatValue}>{site.totalHours.toFixed(1)}h</Text>
                      <Text style={styles.jobsiteStatLabel}>Hours</Text>
                    </View>
                    <View style={styles.jobsiteStatItem}>
                      <Text style={styles.jobsiteStatValue}>{site.cleanerCount}</Text>
                      <Text style={styles.jobsiteStatLabel}>Cleaners</Text>
                    </View>
                    <View style={[styles.jobsiteStatItem, { flex: 1 }]}>
                      <Text style={[styles.jobsiteStatLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                        {site.cleaners.join(', ')}
                      </Text>
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            ))
          )
        )}

        {/* Enhanced Cleaner Hours List with Payment Information */}
        {activeView === 'cleaner' && filteredAndSortedHours.length === 0 ? (
          <AnimatedCard index={4}>
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <Icon name="time" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
              <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
                No Hours Found
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No cleaner hours found for the selected period and filters.
              </Text>
            </View>
          </AnimatedCard>
        ) : (
          activeView === 'cleaner' && filteredAndSortedHours.map((cleaner, index) => {
            const flags = anomalyFlags[cleaner.cleanerId] || [];
            const status = approvalStatus[cleaner.cleanerId] || 'draft';
            const statusColor = status === 'paid' ? colors.success : status === 'approved' ? colors.primary : colors.textSecondary;
            return (
            <AnimatedCard key={cleaner.cleanerId} index={index + 4}>
              <View style={[styles.hoursCard, flags.some(f => f.severity === 'error') && { borderLeftColor: colors.danger }]}>

                {/* #2/#5 Per-card anomaly flags */}
                {flags.map((flag, fi) => (
                  <View key={fi} style={[styles.anomalyBanner, {
                    backgroundColor: flag.severity === 'error' ? colors.danger + '15' : colors.warning + '15',
                    marginBottom: spacing.xs,
                  }]}>
                    <Icon name={flag.severity === 'error' ? 'alert-circle' : 'warning'} size={13}
                      style={{ color: flag.severity === 'error' ? colors.danger : colors.warning }} />
                    <Text style={[styles.anomalyText, { color: flag.severity === 'error' ? colors.danger : colors.warning }]}>
                      {flag.message}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.hoursHeader}
                  onPress={() => toggleDailyBreakdown(cleaner.cleanerId)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cleanerName}>{cleaner.cleanerName}</Text>
                    <Text style={styles.totalPay}>${cleaner.totalPay.toFixed(2)}</Text>
                    {/* #1 clock source badge */}
                    <View style={[styles.clockBadge, { backgroundColor: hoursSource === 'actual' ? colors.success + '20' : colors.primary + '15' }]}>
                      <Icon name={hoursSource === 'actual' ? 'time' : 'calendar'} size={11}
                        style={{ color: hoursSource === 'actual' ? colors.success : colors.primary }} />
                      <Text style={[styles.clockBadgeText, { color: hoursSource === 'actual' ? colors.success : colors.primary }]}>
                        {hoursSource === 'actual' ? 'Actual Clock-In' : 'Scheduled'}
                      </Text>
                    </View>
                    {/* #6 approval status badge */}
                    <View style={[styles.approvalStatusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Icon name={status === 'paid' ? 'checkmark-circle' : status === 'approved' ? 'checkmark' : 'ellipsis-horizontal'} size={11} style={{ color: statusColor }} />
                      <Text style={[styles.approvalStatusText, { color: statusColor }]}>
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalHours}>{cleaner.totalHours.toFixed(1)}h</Text>
                    {cleaner.overtimeHours > 0 && (
                      <View style={styles.overtimeIndicator}>
                        <Text style={styles.overtimeText}>+{cleaner.overtimeHours.toFixed(1)}h OT</Text>
                      </View>
                    )}
                    <View style={styles.paymentTypeIndicator}>
                      <Icon name={cleaner.flatRateJobs.length > 0 ? 'cash' : 'time'} size={12} style={{ color: colors.primary }} />
                      <Text style={styles.paymentTypeText}>
                        {cleaner.flatRateJobs.length > 0 && cleaner.hourlyJobs.length > 0
                          ? 'Mixed' : cleaner.flatRateJobs.length > 0 ? 'Flat Rate' : 'Hourly'}
                      </Text>
                    </View>
                  </View>
                  <Icon name={showDailyBreakdown.has(cleaner.cleanerId) ? 'chevron-up' : 'chevron-down'}
                    size={20} style={{ color: colors.textSecondary, marginLeft: spacing.sm }} />
                </TouchableOpacity>

                <View style={styles.hoursBreakdown}>
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.success }]}>{cleaner.completedHours.toFixed(1)}h</Text>
                    <Text style={styles.hoursLabel}>Completed</Text>
                  </View>
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.primary }]}>{cleaner.regularHours.toFixed(1)}h</Text>
                    <Text style={styles.hoursLabel}>Regular</Text>
                  </View>
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.warning }]}>{cleaner.overtimeHours.toFixed(1)}h</Text>
                    <Text style={styles.hoursLabel}>Overtime</Text>
                  </View>
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.success }]}>${cleaner.averageHourlyRate.toFixed(2)}</Text>
                    <Text style={styles.hoursLabel}>Avg Rate</Text>
                  </View>
                </View>

                {/* Payment Breakdown */}
                <View style={styles.paymentBreakdown}>
                  <Text style={styles.paymentBreakdownTitle}>Payment Breakdown</Text>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Hourly Jobs ({cleaner.hourlyJobs.length})</Text>
                    <Text style={styles.paymentValue}>${cleaner.totalHourlyPay.toFixed(2)}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Flat Rate Jobs ({cleaner.flatRateJobs.length})</Text>
                    <Text style={styles.paymentValue}>${cleaner.totalFlatRatePay.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.paymentRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs }]}>
                    <Text style={[styles.paymentLabel, { fontWeight: '600', color: colors.text }]}>Total Pay</Text>
                    <Text style={[styles.paymentValue, { fontWeight: '600', color: colors.success }]}>
                      ${cleaner.totalPay.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Daily Breakdown */}
                {showDailyBreakdown.has(cleaner.cleanerId) && (
                  <View style={styles.dailyBreakdown}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                      Daily Breakdown
                    </Text>
                    
                    {Object.entries(cleaner.dailyBreakdown)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, dayData]) => (
                        <View key={date} style={styles.dayRow}>
                          <Text style={styles.dayLabel}>
                            {createDateFromString(date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                          <Text style={styles.dayHours}>{dayData.hours.toFixed(1)}h</Text>
                          <Text style={styles.dayPay}>${dayData.pay.toFixed(2)}</Text>
                          <View 
                            style={[
                              styles.statusIndicator, 
                              { backgroundColor: getStatusColor(dayData.status) }
                            ]} 
                          />
                        </View>
                      ))}
                  </View>
                )}

                {/* #6 — Approval workflow buttons */}
                <View style={styles.approvalRow}>
                  {status !== 'approved' && status !== 'paid' && (
                    <TouchableOpacity
                      style={[styles.approvalBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                      onPress={() => handleApproval(cleaner.cleanerId, cleaner.cleanerName, 'approved')}
                    >
                      <Icon name="checkmark" size={14} style={{ color: colors.primary }} />
                      <Text style={[styles.approvalBtnText, { color: colors.primary }]}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {status === 'approved' && (
                    <TouchableOpacity
                      style={[styles.approvalBtn, { borderColor: colors.success, backgroundColor: colors.success + '10' }]}
                      onPress={() => handleApproval(cleaner.cleanerId, cleaner.cleanerName, 'paid')}
                    >
                      <Icon name="cash" size={14} style={{ color: colors.success }} />
                      <Text style={[styles.approvalBtnText, { color: colors.success }]}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                  {status === 'paid' && (
                    <View style={[styles.approvalBtn, { borderColor: colors.success, backgroundColor: colors.success + '10', flex: 1 }]}>
                      <Icon name="checkmark-circle" size={14} style={{ color: colors.success }} />
                      <Text style={[styles.approvalBtnText, { color: colors.success }]}>Paid ✓</Text>
                    </View>
                  )}
                </View>
              </View>
            </AnimatedCard>
            );
          })
        )}

        {/* Export Button */}
        {filteredAndSortedHours.length > 0 && (
          <AnimatedCard index={filteredAndSortedHours.length + 4}>
            <TouchableOpacity style={styles.exportButton} onPress={exportPayrollData}>
              <Icon name="download" size={20} style={{ color: colors.background }} />
              <Text style={styles.exportButtonText}>Export CSV for QuickBooks</Text>
            </TouchableOpacity>
          </AnimatedCard>
        )}
      </ScrollView>
    </View>
  );
}
