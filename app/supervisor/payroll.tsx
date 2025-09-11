
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import AnimatedCard from '../../components/AnimatedCard';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Cleaner } from '../../hooks/useClientData';
import Button from '../../components/Button';

interface CleanerHours {
  cleanerId: string;
  cleanerName: string;
  totalHours: number;
  completedHours: number;
  scheduledHours: number;
  overtimeHours: number;
  dailyBreakdown: {
    [date: string]: {
      hours: number;
      status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
      entries: ScheduleEntry[];
    };
  };
  weeklyTotal: number;
  biWeeklyTotal: number;
}

interface PayrollFilters {
  searchQuery: string;
  dateRange: 'week' | 'biweekly';
  statusFilter: 'all' | 'completed' | 'scheduled' | 'in-progress';
  sortBy: 'name' | 'hours' | 'overtime';
  sortOrder: 'asc' | 'desc';
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
});

export default function PayrollScreen() {
  console.log('PayrollScreen rendered');
  
  const { toast, showToast, hideToast } = useToast();
  const { weeklySchedules, getCurrentWeekId, getWeekIdFromDate, getWeekSchedule } = useScheduleStorage();
  const { cleaners } = useClientData();
  
  const [filters, setFilters] = useState<PayrollFilters>({
    searchQuery: '',
    dateRange: 'week',
    statusFilter: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<Set<string>>(new Set());

  // Helper function to create date from string without timezone issues (consistent with schedule)
  const createDateFromString = useCallback((dateString: string): Date => {
    try {
      // Parse the date string manually to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed in JavaScript Date
    } catch (error) {
      console.error('Error creating date from string:', error);
      return new Date();
    }
  }, []);

  // Helper function to format date string consistently (same as schedule)
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

  // Helper function to get start of week consistently (same as schedule)
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

  // Calculate cleaner hours based on schedule data
  const cleanerHoursData = useMemo(() => {
    console.log('Calculating cleaner hours data');
    
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
        dailyBreakdown: {},
        weeklyTotal: 0,
        biWeeklyTotal: 0,
      });
    });
    
    // Process schedule entries for each week
    weekIds.forEach(weekId => {
      const weekSchedule = getWeekSchedule(weekId);
      
      weekSchedule.forEach(entry => {
        const cleanerData = cleanerHoursMap.get(entry.cleanerName) || 
          cleanerHoursMap.get(cleaners.find(c => c.name === entry.cleanerName)?.id || '');
        
        if (!cleanerData) {
          // Create entry for cleaner not in the cleaners list
          const newCleanerData: CleanerHours = {
            cleanerId: entry.cleanerName,
            cleanerName: entry.cleanerName,
            totalHours: 0,
            completedHours: 0,
            scheduledHours: 0,
            overtimeHours: 0,
            dailyBreakdown: {},
            weeklyTotal: 0,
            biWeeklyTotal: 0,
          };
          cleanerHoursMap.set(entry.cleanerName, newCleanerData);
        }
        
        const cleaner = cleanerHoursMap.get(entry.cleanerName) || 
          cleanerHoursMap.get(cleaners.find(c => c.name === entry.cleanerName)?.id || '') ||
          cleanerHoursMap.get(entry.cleanerName);
        
        if (cleaner) {
          const hours = entry.hours || 0;
          const entryDate = entry.date || weekId;
          
          // Update totals
          cleaner.totalHours += hours;
          
          if (entry.status === 'completed') {
            cleaner.completedHours += hours;
          } else if (entry.status === 'scheduled') {
            cleaner.scheduledHours += hours;
          }
          
          // Calculate overtime (over 40 hours per week)
          if (cleaner.totalHours > 40) {
            cleaner.overtimeHours = cleaner.totalHours - 40;
          }
          
          // Daily breakdown
          if (!cleaner.dailyBreakdown[entryDate]) {
            cleaner.dailyBreakdown[entryDate] = {
              hours: 0,
              status: entry.status,
              entries: [],
            };
          }
          
          cleaner.dailyBreakdown[entryDate].hours += hours;
          cleaner.dailyBreakdown[entryDate].entries.push(entry);
          
          // Update weekly/biweekly totals
          if (filters.dateRange === 'week') {
            cleaner.weeklyTotal = cleaner.totalHours;
          } else {
            cleaner.biWeeklyTotal = cleaner.totalHours;
          }
        }
      });
    });
    
    return Array.from(cleanerHoursMap.values()).filter(cleaner => cleaner.totalHours > 0);
  }, [weeklySchedules, selectedWeekStart, filters.dateRange, cleaners, getWeekSchedule, getWeekIdFromDate]);

  // Filter and sort cleaner hours
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
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [cleanerHoursData, filters]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalCleaners = filteredAndSortedHours.length;
    const totalHours = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.totalHours, 0);
    const totalCompletedHours = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.completedHours, 0);
    const totalOvertimeHours = filteredAndSortedHours.reduce((sum, cleaner) => sum + cleaner.overtimeHours, 0);
    const averageHours = totalCleaners > 0 ? totalHours / totalCleaners : 0;
    
    return {
      totalCleaners,
      totalHours,
      totalCompletedHours,
      totalOvertimeHours,
      averageHours,
    };
  }, [filteredAndSortedHours]);

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
    // In a real app, this would export to CSV or PDF
    const exportData = filteredAndSortedHours.map(cleaner => ({
      name: cleaner.cleanerName,
      totalHours: cleaner.totalHours,
      completedHours: cleaner.completedHours,
      overtimeHours: cleaner.overtimeHours,
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
      
      // Use consistent date formatting
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
      
      // Use consistent date formatting
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
        <Text style={commonStyles.headerTitle}>Payroll Hours</Text>
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
                {filters.dateRange === 'week' ? 'Weekly' : 'Bi-weekly'} Report
              </Text>
            </View>
            
            <TouchableOpacity onPress={() => changeWeek('next')}>
              <Icon name="chevron-forward" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Search and Filters */}
        <AnimatedCard index={1}>
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

          <View style={styles.filterRow}>
            <Text style={[typography.body, { color: colors.text }]}>Sort by:</Text>
            {['name', 'hours', 'overtime'].map((sortBy) => (
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

        {/* Summary Statistics */}
        <AnimatedCard index={2}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Cleaners</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalCleaners}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalHours.toFixed(1)}h</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Completed Hours</Text>
              <Text style={styles.summaryValue}>{summaryStats.totalCompletedHours.toFixed(1)}h</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Overtime Hours</Text>
              <Text style={[styles.summaryValue, { color: summaryStats.totalOvertimeHours > 0 ? colors.warning : colors.text }]}>
                {summaryStats.totalOvertimeHours.toFixed(1)}h
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Hours/Cleaner</Text>
              <Text style={styles.summaryValue}>{summaryStats.averageHours.toFixed(1)}h</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Cleaner Hours List */}
        {filteredAndSortedHours.length === 0 ? (
          <AnimatedCard index={3}>
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
            <AnimatedCard key={cleaner.cleanerId} index={index + 3}>
              <View style={styles.hoursCard}>
                <TouchableOpacity
                  style={styles.hoursHeader}
                  onPress={() => toggleDailyBreakdown(cleaner.cleanerId)}
                >
                  <Text style={styles.cleanerName}>{cleaner.cleanerName}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalHours}>{cleaner.totalHours.toFixed(1)}h</Text>
                    {cleaner.overtimeHours > 0 && (
                      <View style={styles.overtimeIndicator}>
                        <Text style={styles.overtimeText}>
                          +{cleaner.overtimeHours.toFixed(1)}h OT
                        </Text>
                      </View>
                    )}
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
                      {cleaner.scheduledHours.toFixed(1)}h
                    </Text>
                    <Text style={styles.hoursLabel}>Scheduled</Text>
                  </View>
                  
                  <View style={styles.hoursItem}>
                    <Text style={[styles.hoursValue, { color: colors.warning }]}>
                      {cleaner.overtimeHours.toFixed(1)}h
                    </Text>
                    <Text style={styles.hoursLabel}>Overtime</Text>
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
          <AnimatedCard index={filteredAndSortedHours.length + 3}>
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
