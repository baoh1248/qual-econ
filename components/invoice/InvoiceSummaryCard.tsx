
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';

interface InvoiceSummaryCardProps {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  value: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  discountValue: {
    color: colors.success,
  },
  balanceDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    backgroundColor: colors.error + '10',
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  balanceDueLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  balanceDueValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.error,
  },
});

export default function InvoiceSummaryCard({
  subtotal,
  taxRate,
  taxAmount,
  discountAmount,
  total,
  amountPaid,
  balanceDue,
}: InvoiceSummaryCardProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>{formatCurrency(subtotal)}</Text>
      </View>

      {taxRate > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Tax ({taxRate}%)</Text>
          <Text style={styles.value}>{formatCurrency(taxAmount)}</Text>
        </View>
      )}

      {discountAmount > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Discount</Text>
          <Text style={[styles.value, styles.discountValue]}>
            -{formatCurrency(discountAmount)}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>

      {amountPaid !== undefined && amountPaid > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid</Text>
          <Text style={[styles.value, { color: colors.success }]}>
            {formatCurrency(amountPaid)}
          </Text>
        </View>
      )}

      {balanceDue !== undefined && balanceDue > 0 && (
        <View style={styles.balanceDueRow}>
          <Text style={styles.balanceDueLabel}>Balance Due</Text>
          <Text style={styles.balanceDueValue}>{formatCurrency(balanceDue)}</Text>
        </View>
      )}
    </View>
  );
}
