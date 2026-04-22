
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import AnimatedCard from '../../components/AnimatedCard';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { supabase } from '../integrations/supabase/client';

interface ClockRecord {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  total_minutes: number | null;
  status: string;
  building_name?: string;
  client_name?: string;
}

interface DaySummary {
  date: string;
  dayLabel: string;
  totalMinutes: number;
  records: ClockRecord[];
}

type ViewMode = 'week' | 'month';

export default function HoursScreen() {
  const { themeColor } = useTheme();
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [cleanerName, setCleanerName] = useState('');

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (viewMode === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay() + (weekOffset * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    } else {
      const start = new Date(now.getFullYear(), now.getMonth() + weekOffset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + weekOffset + 1, 0);
      return { start, end };
    }
  }, [viewMode, weekOffset]);

  const loadHours = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: cleaner } = await supabase
        .from('cleaners')
        .select('id, name')
        .eq('email', session.user.email)
        .eq('is_active', true)
        .single();

      if (!cleaner) return;
      setCleanerName(cleaner.name);

      const { start, end } = getDateRange();
      const startStr = start.toISOString();
      const endStr = new Date(end.getTime() + 86400000).toISOString();

      const { data, error } = await supabase
        .from('clock_records')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .gte('clock_in_time', startStr)
        .lt('clock_in_time', endStr)
        .order('clock_in_time', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          setDaySummaries([]);
          return;
        }
        throw error;
      }

      const byDate = new Map<string, ClockRecord[]>();
      (data || []).forEach(record => {
        const dateKey = new Date(record.clock_in_time).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
        if (!byDate.has(dateKey)) byDate.set(dateKey, []);
        byDate.get(dateKey)!.push(record);
      });

      const summaries: DaySummary[] = [];
      const current = new Date(start);
      while (current <= end) {
        const dateKey = current.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
        const dayRecords = byDate.get(dateKey) || [];
        const totalMinutes = dayRecords.reduce((sum, r) => sum + (r.total_minutes || 0), 0);
        summaries.push({
          date: dateKey,
          dayLabel: current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          totalMinutes,
          records: dayRecords,
        });
        current.setDate(current.getDate() + 1);
      }

      setDaySummaries(summaries);
    } catch (err) {
      console.error('Failed to load hours:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHours();
    }, [loadHours])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHours();
  };

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles',
    });
  };

  const totalMinutes = daySummaries.reduce((sum, d) => sum + d.totalMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const daysWorked = daySummaries.filter(d => d.totalMinutes > 0).length;
  const { start, end } = getDateRange();

  const rangeLabel = viewMode === 'week'
    ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>
            My Hours
          </Text>
        </View>
        <CompanyLogo size={40} />
      </View>

      <ScrollView
        style={commonStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
      >
        {/* View Mode Toggle */}
        <AnimatedCard delay={0}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'week' && { backgroundColor: themeColor }]}
              onPress={() => { setViewMode('week'); setWeekOffset(0); }}
            >
              <Text style={[styles.toggleText, viewMode === 'week' && { color: '#FFFFFF' }]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'month' && { backgroundColor: themeColor }]}
              onPress={() => { setViewMode('month'); setWeekOffset(0); }}
            >
              <Text style={[styles.toggleText, viewMode === 'month' && { color: '#FFFFFF' }]}>Monthly</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setWeekOffset(prev => prev - 1)} style={styles.navBtn}>
            <Icon name="chevron-left" size={24} color={themeColor} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{rangeLabel}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset(prev => prev < 0 ? prev + 1 : prev)}
            style={[styles.navBtn, weekOffset >= 0 && { opacity: 0.3 }]}
            disabled={weekOffset >= 0}
          >
            <Icon name="chevron-right" size={24} color={themeColor} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <AnimatedCard delay={100}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="time" size={24} color={themeColor} />
              <Text style={styles.summaryValue}>{totalHours}</Text>
              <Text style={styles.summaryLabel}>Total Hours</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.summaryItem}>
              <Icon name="calendar" size={24} color={themeColor} />
              <Text style={styles.summaryValue}>{daysWorked}</Text>
              <Text style={styles.summaryLabel}>Days Worked</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.summaryItem}>
              <Icon name="trending-up" size={24} color={themeColor} />
              <Text style={styles.summaryValue}>{daysWorked > 0 ? (totalMinutes / daysWorked / 60).toFixed(1) : '0'}</Text>
              <Text style={styles.summaryLabel}>Avg/Day</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Daily Breakdown */}
        <View style={styles.sectionHeader}>
          <Icon name="list" size={22} color={themeColor} />
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        ) : (
          daySummaries.map((day, index) => (
            <AnimatedCard key={day.date} delay={150 + index * 30}>
              <View style={styles.dayRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  {day.records.length > 0 ? (
                    day.records.map((rec, ri) => (
                      <View key={ri} style={styles.clockEntry}>
                        <Icon name="time-outline" size={14} color={colors.textTertiary} />
                        <Text style={styles.clockEntryText}>
                          {formatTime(rec.clock_in_time)}
                          {rec.clock_out_time ? ` - ${formatTime(rec.clock_out_time)}` : ' - active'}
                        </Text>
                        {rec.building_name && (
                          <Text style={styles.clockEntryLocation}>{rec.building_name}</Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noHoursText}>No hours recorded</Text>
                  )}
                </View>
                <View style={styles.dayHoursContainer}>
                  {day.totalMinutes > 0 ? (
                    <>
                      <Text style={[styles.dayHoursValue, { color: themeColor }]}>{formatMinutes(day.totalMinutes)}</Text>
                      <View style={[styles.hoursBar, { width: Math.min(80, (day.totalMinutes / 60) * 10), backgroundColor: themeColor + '30' }]}>
                        <View style={[styles.hoursBarFill, { width: '100%', backgroundColor: themeColor }]} />
                      </View>
                    </>
                  ) : (
                    <Text style={styles.dayHoursEmpty}>-</Text>
                  )}
                </View>
              </View>
            </AnimatedCard>
          ))
        )}

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  toggleText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  navBtn: {
    padding: spacing.sm,
  },
  navLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dayLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  clockEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  clockEntryText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  clockEntryLocation: {
    ...typography.small,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },
  noHoursText: {
    ...typography.small,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  dayHoursContainer: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  dayHoursValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  dayHoursEmpty: {
    ...typography.body,
    color: colors.textTertiary,
  },
  hoursBar: {
    height: 4,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  hoursBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
