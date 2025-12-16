
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';

interface StatementInvoice {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  original_amount: number;
  payment_date?: string;
  amount_paid: number;
  balance_due: number;
  days_overdue: number;
}

interface InvoiceStatementViewProps {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyFax?: string;
  customerName: string;
  customerAddress: string;
  statementDate: string;
  invoices: StatementInvoice[];
  totalCurrent: number;
  total30Days: number;
  total60Days: number;
  total90Days: number;
  totalOver90Days: number;
  totalBalance: number;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
  },
  companyName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  companyInfo: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statementTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  customerInfo: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  table: {
    marginBottom: spacing.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  tableHeaderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.background,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  agingSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  agingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  agingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  agingLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  agingValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 4,
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
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});

export default function InvoiceStatementView({
  companyName = 'QualEcon',
  companyAddress = '1015 Telegraph St Ste C, Reno, NV 89502',
  companyPhone = '775-358-3655',
  companyFax = 'Fax',
  customerName,
  customerAddress,
  statementDate,
  invoices,
  totalCurrent,
  total30Days,
  total60Days,
  total90Days,
  totalOver90Days,
  totalBalance,
}: InvoiceStatementViewProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.companyInfo}>{companyAddress}</Text>
        <Text style={styles.companyInfo}>Phone: {companyPhone}</Text>
        <Text style={styles.companyInfo}>Fax: {companyFax}</Text>
      </View>

      {/* Statement Title and Date */}
      <Text style={styles.statementTitle}>STATEMENT</Text>
      <Text style={styles.companyInfo}>
        Statement Date: {formatDate(statementDate)}
      </Text>

      {/* Customer Info */}
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.customerInfo}>{customerName}</Text>
          <Text style={styles.customerInfo}>{customerAddress}</Text>
        </View>
      </View>

      {/* Invoices Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Invoice #</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Customer</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Paid</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Balance</Text>
        </View>

        {invoices.map((invoice, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{invoice.invoice_number}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {formatDate(invoice.invoice_date)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{invoice.customer_name}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
              {formatCurrency(invoice.original_amount)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
              {formatCurrency(invoice.amount_paid)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
              {formatCurrency(invoice.balance_due)}
            </Text>
          </View>
        ))}
      </View>

      {/* Aging Summary */}
      <View style={styles.agingSection}>
        <Text style={styles.agingTitle}>Past Due Aging</Text>

        <View style={styles.agingRow}>
          <Text style={styles.agingLabel}>Current</Text>
          <Text style={styles.agingValue}>{formatCurrency(totalCurrent)}</Text>
        </View>

        <View style={styles.agingRow}>
          <Text style={styles.agingLabel}>1 - 30 Days</Text>
          <Text style={styles.agingValue}>{formatCurrency(total30Days)}</Text>
        </View>

        <View style={styles.agingRow}>
          <Text style={styles.agingLabel}>31 - 60 Days</Text>
          <Text style={styles.agingValue}>{formatCurrency(total60Days)}</Text>
        </View>

        <View style={styles.agingRow}>
          <Text style={styles.agingLabel}>61 - 90 Days</Text>
          <Text style={styles.agingValue}>{formatCurrency(total90Days)}</Text>
        </View>

        <View style={styles.agingRow}>
          <Text style={styles.agingLabel}>91 & Over</Text>
          <Text style={styles.agingValue}>{formatCurrency(totalOver90Days)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Balance Due</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalBalance)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Please pay by due date. Thank you for your business!
        </Text>
      </View>
    </ScrollView>
  );
}
