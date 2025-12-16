
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';

interface InvoiceDashboardProps {
  totalInvoices: number;
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  statSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  overdueCard: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error,
  },
  overdueValue: {
    color: colors.error,
  },
  successCard: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success,
  },
  successValue: {
    color: colors.success,
  },
});

export default function InvoiceDashboard({
  totalInvoices,
  totalRevenue,
  totalPaid,
  totalOutstanding,
  overdueAmount,
}: InvoiceDashboardProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(0)}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invoice Summary</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Invoices</Text>
          <Text style={styles.statValue}>{totalInvoices}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
        </View>

        <View style={[styles.statCard, styles.successCard]}>
          <Text style={styles.statLabel}>Amount Paid</Text>
          <Text style={[styles.statValue, styles.successValue]}>
            {formatCurrency(totalPaid)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Outstanding</Text>
          <Text style={styles.statValue}>{formatCurrency(totalOutstanding)}</Text>
        </View>

        {overdueAmount > 0 && (
          <View style={[styles.statCard, styles.overdueCard]}>
            <Text style={styles.statLabel}>Overdue Amount</Text>
            <Text style={[styles.statValue, styles.overdueValue]}>
              {formatCurrency(overdueAmount)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
