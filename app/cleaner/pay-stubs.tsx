
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import AnimatedCard from '../../components/AnimatedCard';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { supabase } from '../integrations/supabase/client';

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
  created_at: string;
  updated_at: string;
}

export default function PayStubsScreen() {
  const { themeColor } = useTheme();
  const { toast, showToast } = useToast();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const loadCleanerAndRecords = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: cleaner } = await supabase
        .from('cleaners')
        .select('id')
        .eq('email', session.user.email)
        .eq('is_active', true)
        .single();

      if (!cleaner) return;
      setCleanerId(cleaner.id);

      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('week_id', { ascending: false })
        .limit(20);

      if (error) {
        if (error.code === '42P01') {
          setRecords([]);
          return;
        }
        throw error;
      }
      setRecords(data || []);
    } catch (err) {
      console.error('Failed to load pay stubs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCleanerAndRecords();
    }, [loadCleanerAndRecords])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCleanerAndRecords();
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toFixed(2);
  };

  const formatWeekLabel = (weekId: string) => {
    try {
      const date = new Date(weekId + 'T12:00:00');
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 6);
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${date.toLocaleDateString('en-US', opts)} - ${endDate.toLocaleDateString('en-US', opts)}`;
    } catch {
      return weekId;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { bg: colors.success + '15', text: colors.success, label: 'Paid' };
      case 'approved': return { bg: '#0066FF15', text: '#0066FF', label: 'Approved' };
      default: return { bg: colors.warning + '15', text: colors.warning, label: 'Draft' };
    }
  };

  const totalEarnings = records
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + r.total_pay, 0);

  const pendingPay = records
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.total_pay, 0);

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
            Pay Stubs
          </Text>
        </View>
        <CompanyLogo size={40} />
      </View>

      <ScrollView
        style={commonStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
      >
        {/* Summary Cards */}
        <AnimatedCard delay={0}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
              <Text style={styles.summaryLabel}>Total Earned</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(totalEarnings)}</Text>
              <Text style={styles.summarySubtext}>Paid to date</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#0066FF' }]}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, { color: '#0066FF' }]}>{formatCurrency(pendingPay)}</Text>
              <Text style={styles.summarySubtext}>Awaiting payment</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Pay History */}
        <View style={styles.sectionHeader}>
          <Icon name="receipt-outline" size={22} color={themeColor} />
          <Text style={styles.sectionTitle}>Payment History</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        ) : records.length === 0 ? (
          <AnimatedCard delay={100}>
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Pay Records Yet</Text>
              <Text style={styles.emptyText}>
                Your pay stubs will appear here once payroll has been processed.
              </Text>
            </View>
          </AnimatedCard>
        ) : (
          records.map((record, index) => {
            const status = getStatusStyle(record.status);
            const isExpanded = expandedRecord === record.id;
            return (
              <AnimatedCard key={record.id} delay={100 + index * 50}>
                <TouchableOpacity
                  style={styles.recordCard}
                  onPress={() => setExpandedRecord(isExpanded ? null : record.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recordHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordWeek}>{formatWeekLabel(record.week_id)}</Text>
                      <Text style={styles.recordHours}>{record.total_hours.toFixed(1)} hours worked</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.recordPay}>{formatCurrency(record.total_pay)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                      style={{ marginLeft: spacing.sm }}
                    />
                  </View>

                  {isExpanded && (
                    <View style={styles.recordDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Regular Hours</Text>
                        <Text style={styles.detailValue}>{record.regular_hours.toFixed(1)} hrs</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Regular Pay</Text>
                        <Text style={styles.detailValue}>{formatCurrency(record.regular_pay)}</Text>
                      </View>
                      {record.overtime_hours > 0 && (
                        <>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Overtime Hours</Text>
                            <Text style={[styles.detailValue, { color: colors.warning }]}>{record.overtime_hours.toFixed(1)} hrs</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Overtime Pay (1.5x)</Text>
                            <Text style={[styles.detailValue, { color: colors.warning }]}>{formatCurrency(record.overtime_pay)}</Text>
                          </View>
                        </>
                      )}
                      {record.flat_rate_pay > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Flat Rate Jobs</Text>
                          <Text style={styles.detailValue}>{formatCurrency(record.flat_rate_pay)}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Hourly Rate</Text>
                        <Text style={styles.detailValue}>{formatCurrency(record.hourly_rate)}/hr</Text>
                      </View>
                      <View style={[styles.detailRow, styles.detailTotal]}>
                        <Text style={styles.detailTotalLabel}>Total</Text>
                        <Text style={styles.detailTotalValue}>{formatCurrency(record.total_pay)}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </AnimatedCard>
            );
          })
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  summarySubtext: {
    ...typography.small,
    color: colors.textTertiary,
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
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recordCard: {
    gap: spacing.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordWeek: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  recordHours: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  recordPay: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  recordDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  detailTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailTotalLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
  },
  detailTotalValue: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
});
