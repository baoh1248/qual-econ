
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
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

const styles = StyleSheet.create({
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
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<Set<string>>(new Set());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);

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

  // Enhanced cleaner hours calculation with payment information
  const cleanerHoursData = useMemo(() => {
    console.log('Calculating cleaner hours data with payment information');
    
    const currentWeekId = getWeekIdFromDate(selectedWeekStart);
    const weekIds = [currentWeekId];
    
    // Add second week for biweekly view
    if (filters.dateRange === 'biweekly') {
      const nextWeek = new Date(selectedWeekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekIds.push(getWeekIdFromDate(nextWeek));
    }
    
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
    
    // Process schedule entries for each week
    weekIds.forEach(weekId => {
      const weekSchedule = getWeekSchedule(weekId);
      
      weekSchedule.forEach(entry => {
        // Handle multiple cleaners in an entry
        const entryCleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
          ? entry.cleanerNames 
          : (entry.cleanerName ? [entry.cleanerName] : []);
        
        entryCleaners.forEach(cleanerName => {
          // Find cleaner by name or ID
          const cleaner = cleaners.find(c => c.name === cleanerName || c.id === cleanerName);
          const cleanerId = cleaner?.id || cleanerName;
          
          let cleanerData = cleanerHoursMap.get(cleanerId);
          
          if (!cleanerData) {
            // Create entry for cleaner not in the cleaners list
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
          
          const hours = entry.hours || 0;
          const entryDate = entry.date || weekId;
          const paymentType = entry.paymentType || 'hourly';
          
          // Split hours among multiple cleaners if needed
          const splitHours = entryCleaners.length > 1 ? hours / entryCleaners.length : hours;
          
          // Update totals
          cleanerData.totalHours += splitHours;
          
          if (entry.status === 'completed') {
            cleanerData.completedHours += splitHours;
          } else if (entry.status === 'scheduled') {
            cleanerData.scheduledHours += splitHours;
          }
          
          // Calculate regular vs overtime hours (over 40 hours per week)
          const previousRegularHours = cleanerData.regularHours;
          const newTotalHours = cleanerData.totalHours;
          
          if (newTotalHours <= 40) {
            cleanerData.regularHours = newTotalHours;
            cleanerData.overtimeHours = 0;
          } else {
            cleanerData.regularHours = 40;
            cleanerData.overtimeHours = newTotalHours - 40;
          }
          
          // Calculate payment based on type
          let entryPay = 0;
          if (paymentType === 'flat_rate') {
            // FIXED: Flat rate is NOT multiplied by hours
            const flatRateAmount = entry.flatRateAmount || 0;
            // Split flat rate among multiple cleaners if needed
            entryPay = entryCleaners.length > 1 ? flatRateAmount / entryCleaners.length : flatRateAmount;
            cleanerData.totalFlatRatePay += entryPay;
            cleanerData.flatRateJobs.push(entry);
            
            console.log('Flat rate payment calculated:', {
              entryId: entry.id,
              cleanerName,
              flatRateAmount,
              numberOfCleaners: entryCleaners.length,
              entryPay,
              hours: splitHours
            });
          } else {
            // Hourly rate calculation
            const hourlyRate = entry.hourlyRate || cleaner?.default_hourly_rate || 15;
            const regularHoursForThisEntry = Math.min(splitHours, Math.max(0, 40 - previousRegularHours));
            const overtimeHoursForThisEntry = Math.max(0, splitHours - regularHoursForThisEntry);
            
            entryPay = (regularHoursForThisEntry * hourlyRate) + (overtimeHoursForThisEntry * hourlyRate * 1.5);
            cleanerData.totalHourlyPay += entryPay;
            cleanerData.hourlyJobs.push(entry);
            
            console.log('Hourly payment calculated:', {
              entryId: entry.id,
              cleanerName,
              hourlyRate,
              hours: splitHours,
              regularHours: regularHoursForThisEntry,
              overtimeHours: overtimeHoursForThisEntry,
              entryPay
            });
          }
          
          cleanerData.totalPay = cleanerData.totalHourlyPay + cleanerData.totalFlatRatePay;
          
          // Calculate average hourly rate
          if (cleanerData.totalHours > 0) {
            cleanerData.averageHourlyRate = cleanerData.totalPay / cleanerData.totalHours;
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
          
          // Update weekly/biweekly totals
          if (filters.dateRange === 'week') {
            cleanerData.weeklyTotal = cleanerData.totalHours;
          } else {
            cleanerData.biWeeklyTotal = cleanerData.totalHours;
          }
        });
      });
    });
    
    return Array.from(cleanerHoursMap.values()).filter(cleaner => cleaner.totalHours > 0);
  }, [selectedWeekStart, filters.dateRange, cleaners, getWeekSchedule, getWeekIdFromDate]);

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

  // Generate payroll records
  const generatePayrollRecords = useCallback(async () => {
    try {
      setIsGeneratingPayroll(true);
      console.log('Generating payroll records...');
      
      const currentWeekId = getWeekIdFromDate(selectedWeekStart);
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
  }, [cleanerHoursData, selectedWeekStart, getWeekIdFromDate, executeQuery, showToast]);

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

  const exportPayrollData = useCallback(() => {
    const exportData = filteredAndSortedHours.map(cleaner => ({
      name: cleaner.cleanerName,
      totalHours: cleaner.totalHours,
      regularHours: cleaner.regularHours,
      overtimeHours: cleaner.overtimeHours,
      totalPay: cleaner.totalPay,
      hourlyPay: cleaner.totalHourlyPay,
      flatRatePay: cleaner.totalFlatRatePay,
      averageRate: cleaner.averageHourlyRate,
      dateRange: filters.dateRange,
    }));
    
    console.log('Exporting payroll data:', exportData);
    showToast('Payroll data exported successfully', 'success');
  }, [filteredAndSortedHours, filters.dateRange, showToast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'in-progress': return colors.warning;
      case 'scheduled': return colors.primary;
      case 'cancelled': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  const formatDateRange = () => {
    const startDate = getStartOfWeek(selectedWeekStart);
    const startDateString = formatDateString(startDate);
    
    if (filters.dateRange === 'week') {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const endDateString = formatDateString(endDate);
      
      const startFormatted = createDateFromString(startDateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const endFormatted = createDateFromString(endDateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      return `${startFormatted} - ${endFormatted}`;
    } else {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      const endDateString = formatDateString(endDate);
      
      const startFormatted = createDateFromString(startDateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const endFormatted = createDateFromString(endDateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      return `${startFormatted} - ${endFormatted}`;
    }
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
            
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h3, { color: colors.text }]}>
                {formatDateRange()}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {filters.dateRange === 'week' ? 'Weekly' : 'Bi-weekly'} Payroll
              </Text>
            </View>
            
            <TouchableOpacity onPress={() => changeWeek('next')}>
              <Icon name="chevron-forward" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

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

        {/* Enhanced Cleaner Hours List with Payment Information */}
        {filteredAndSortedHours.length === 0 ? (
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
          filteredAndSortedHours.map((cleaner, index) => (
            <AnimatedCard key={cleaner.cleanerId} index={index + 4}>
              <View style={styles.hoursCard}>
                <TouchableOpacity
                  style={styles.hoursHeader}
                  onPress={() => toggleDailyBreakdown(cleaner.cleanerId)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cleanerName}>{cleaner.cleanerName}</Text>
                    <Text style={styles.totalPay}>${cleaner.totalPay.toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalHours}>{cleaner.totalHours.toFixed(1)}h</Text>
                    {cleaner.overtimeHours > 0 && (
                      <View style={styles.overtimeIndicator}>
                        <Text style={styles.overtimeText}>
                          +{cleaner.overtimeHours.toFixed(1)}h OT
                        </Text>
                      </View>
                    )}
                    <View style={styles.paymentTypeIndicator}>
                      <Icon 
                        name={cleaner.flatRateJobs.length > 0 ? 'cash' : 'time'} 
                        size={12} 
                        style={{ color: colors.primary }} 
                      />
                      <Text style={styles.paymentTypeText}>
                        {cleaner.flatRateJobs.length > 0 && cleaner.hourlyJobs.length > 0 
                          ? 'Mixed' 
                          : cleaner.flatRateJobs.length > 0 
                            ? 'Flat Rate' 
                            : 'Hourly'
                        }
                      </Text>
                    </View>
                  </View>
                  <Icon 
                    name={showDailyBreakdown.has(cleaner.cleanerId) ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    style={{ color: colors.textSecondary, marginLeft: spacing.sm }} 
                  />
                </TouchableOpacity>

                <View style={styles.hoursBreakdown}>
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.success }]}>
                      {cleaner.completedHours.toFixed(1)}h
                    </Text>
                    <Text style={styles.hoursLabel}>Completed</Text>
                  </View>
                  
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.primary }]}>
                      {cleaner.regularHours.toFixed(1)}h
                    </Text>
                    <Text style={styles.hoursLabel}>Regular</Text>
                  </View>
                  
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.warning }]}>
                      {cleaner.overtimeHours.toFixed(1)}h
                    </Text>
                    <Text style={styles.hoursLabel}>Overtime</Text>
                  </View>
                  
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.success }]}>
                      ${cleaner.averageHourlyRate.toFixed(2)}
                    </Text>
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
              </View>
            </AnimatedCard>
          ))
        )}

        {/* Export Button */}
        {filteredAndSortedHours.length > 0 && (
          <AnimatedCard index={filteredAndSortedHours.length + 4}>
            <TouchableOpacity style={styles.exportButton} onPress={exportPayrollData}>
              <Icon name="download" size={20} style={{ color: colors.background }} />
              <Text style={styles.exportButtonText}>Export Payroll Data</Text>
            </TouchableOpacity>
          </AnimatedCard>
        )}
      </ScrollView>
    </View>
  );
}
