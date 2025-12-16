
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';

interface LineItem {
  id: string;
  invoice_id: string;
  line_number: number;
  item_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  line_total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  billing_address?: string;
  shipping_address?: string;
  invoice_date: string;
  due_date?: string;
  payment_terms: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  internal_notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface InvoicePrintViewProps {
  invoice: Invoice;
  lineItems: LineItem[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
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
  invoiceTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  invoiceNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  column: {
    flex: 1,
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
  summarySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 4,
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
  notesSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 18,
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

export default function InvoicePrintView({
  invoice,
  lineItems,
  companyName = 'Your Company',
  companyAddress = 'Address',
  companyPhone = 'Phone',
  companyEmail = 'Email',
}: InvoicePrintViewProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.companyInfo}>{companyAddress}</Text>
        <Text style={styles.companyInfo}>{companyPhone}</Text>
        <Text style={styles.companyInfo}>{companyEmail}</Text>
      </View>

      {/* Invoice Title and Number */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={styles.invoiceTitle}>INVOICE</Text>
        <Text style={styles.invoiceNumber}>Invoice #{invoice.invoice_number}</Text>
        <Text style={styles.companyInfo}>
          Date: {formatDate(invoice.invoice_date)}
        </Text>
        {invoice.due_date && (
          <Text style={styles.companyInfo}>
            Due Date: {formatDate(invoice.due_date)}
          </Text>
        )}
      </View>

      {/* Customer and Billing Info */}
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.customerInfo}>{invoice.customer_name}</Text>
          {invoice.billing_address && (
            <Text style={styles.customerInfo}>{invoice.billing_address}</Text>
          )}
          {invoice.customer_phone && (
            <Text style={styles.customerInfo}>{invoice.customer_phone}</Text>
          )}
          {invoice.customer_email && (
            <Text style={styles.customerInfo}>{invoice.customer_email}</Text>
          )}
        </View>

        {invoice.shipping_address && (
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text style={styles.customerInfo}>{invoice.shipping_address}</Text>
          </View>
        )}
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Price</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
        </View>

        {lineItems.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
              {item.quantity} {item.unit}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
              {formatCurrency(item.unit_price)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
              {formatCurrency(item.line_total)}
            </Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal)}</Text>
        </View>

        {invoice.tax_rate > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax ({invoice.tax_rate}%)</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.tax_amount)}</Text>
          </View>
        )}

        {invoice.discount_amount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              -{formatCurrency(invoice.discount_amount)}
            </Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount Due</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
        </View>

        {invoice.amount_paid > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(invoice.amount_paid)}
            </Text>
          </View>
        )}

        {invoice.balance_due > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance Due</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {formatCurrency(invoice.balance_due)}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {invoice.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{invoice.notes}</Text>
        </View>
      )}

      {/* Payment Terms */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Payment Terms</Text>
        <Text style={styles.notesText}>{invoice.payment_terms}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Thank you for your business!</Text>
      </View>
    </ScrollView>
  );
}
