
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../integrations/supabase/client';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import InvoicePrintView from '../../components/invoice/InvoicePrintView';

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

interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  recorded_by?: string;
  created_at?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  invoiceHeader: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  invoiceNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  statusBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold as any,
  },
  lineItemsTable: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  tableHeaderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  summaryValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
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
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config } = useDatabase();

  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadInvoiceData = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading invoice data...');

      // Load invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError) {
        console.error('❌ Error loading invoice:', invoiceError);
        throw invoiceError;
      }

      setInvoice(invoiceData);

      // Load line items
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', id)
        .order('line_number', { ascending: true });

      if (lineItemsError) {
        console.error('❌ Error loading line items:', lineItemsError);
        throw lineItemsError;
      }

      setLineItems(lineItemsData || []);

      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error('❌ Error loading payments:', paymentsError);
        throw paymentsError;
      }

      setPayments(paymentsData || []);

      console.log('✅ Invoice data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load invoice data:', error);
      showToast('Failed to load invoice', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return colors.textSecondary;
      case 'sent':
        return colors.primary;
      case 'paid':
        return colors.success;
      case 'overdue':
        return colors.error;
      case 'cancelled':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (amount > invoice.balance_due) {
      showToast('Payment amount cannot exceed balance due', 'error');
      return;
    }

    try {
      console.log('🔄 Recording payment...');

      const { error } = await supabase
        .from('invoice_payments')
        .insert({
          id: uuid.v4() as string,
          invoice_id: invoice.id,
          payment_date: paymentDate,
          amount: amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          notes: paymentNotes.trim() || null,
          recorded_by: 'Supervisor',
        });

      if (error) {
        console.error('❌ Error recording payment:', error);
        throw error;
      }

      console.log('✅ Payment recorded successfully');
      showToast('Payment recorded successfully', 'success');
      
      setShowPaymentModal(false);
      setPaymentAmount('');
      setReferenceNumber('');
      setPaymentNotes('');
      
      await loadInvoiceData();
    } catch (error) {
      console.error('❌ Failed to record payment:', error);
      showToast('Failed to record payment', 'error');
    }
  };

  const handleShareInvoice = async () => {
    if (!invoice) return;

    try {
      const message = `Invoice ${invoice.invoice_number}\n\nCustomer: ${invoice.customer_name}\nTotal: $${invoice.total_amount.toFixed(2)}\nBalance Due: $${invoice.balance_due.toFixed(2)}\n\nThank you for your business!`;

      await Share.share({
        message: message,
        title: `Invoice ${invoice.invoice_number}`,
      });
    } catch (error) {
      console.error('Error sharing invoice:', error);
    }
  };

  const handleUpdateStatus = async (newStatus: Invoice['status']) => {
    if (!invoice) return;

    try {
      console.log('🔄 Updating invoice status...');

      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) {
        console.error('❌ Error updating status:', error);
        throw error;
      }

      console.log('✅ Status updated successfully');
      showToast('Status updated successfully', 'success');
      await loadInvoiceData();
    } catch (error) {
      console.error('❌ Failed to update status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} color={colors.background} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
    );
  }

  if (showPrintView) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowPrintView(false)}>
            <Icon name="arrow-back" size={24} color={colors.background} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Preview</Text>
          <TouchableOpacity onPress={handleShareInvoice}>
            <Icon name="share-social" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>
        <InvoicePrintView
          invoice={invoice}
          lineItems={lineItems}
          companyName="Your Company Name"
          companyAddress="123 Business Street, City, State 12345"
          companyPhone="(555) 123-4567"
          companyEmail="info@company.com"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <CompanyLogo />
        <TouchableOpacity onPress={handleShareInvoice}>
          <Icon name="share-social" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Header */}
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceNumber}>Invoice {invoice.invoice_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(invoice.status) }]}>
              {invoice.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <AnimatedCard style={{ padding: spacing.md }}>
            <Text style={[typography.body, { fontWeight: 'bold', marginBottom: spacing.sm }]}>
              {invoice.customer_name}
            </Text>
            {invoice.customer_address && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {invoice.customer_address}
              </Text>
            )}
            {invoice.customer_phone && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {invoice.customer_phone}
              </Text>
            )}
            {invoice.customer_email && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {invoice.customer_email}
              </Text>
            )}
          </AnimatedCard>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <AnimatedCard style={{ padding: spacing.md }}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invoice Date:</Text>
              <Text style={styles.infoValue}>
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </Text>
            </View>
            {invoice.due_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Due Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Terms:</Text>
              <Text style={styles.infoValue}>{invoice.payment_terms}</Text>
            </View>
          </AnimatedCard>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <View style={styles.lineItemsTable}>
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
                  ${item.unit_price.toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  ${item.line_total.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${invoice.subtotal.toFixed(2)}</Text>
          </View>
          
          {invoice.tax_rate > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({invoice.tax_rate}%)</Text>
              <Text style={styles.summaryValue}>${invoice.tax_amount.toFixed(2)}</Text>
            </View>
          )}
          
          {invoice.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                -${invoice.discount_amount.toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${invoice.total_amount.toFixed(2)}</Text>
          </View>

          {invoice.amount_paid > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Paid</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                ${invoice.amount_paid.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Balance Due</Text>
            <Text style={[styles.totalValue, { color: invoice.balance_due > 0 ? colors.error : colors.success }]}>
              ${invoice.balance_due.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payments */}
        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Amount:</Text>
                  <Text style={[styles.infoValue, { color: colors.success }]}>
                    ${payment.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Method:</Text>
                  <Text style={styles.infoValue}>{payment.payment_method}</Text>
                </View>
                {payment.reference_number && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reference:</Text>
                    <Text style={styles.infoValue}>{payment.reference_number}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <AnimatedCard style={{ padding: spacing.md }}>
              <Text style={[typography.body, { color: colors.text }]}>{invoice.notes}</Text>
            </AnimatedCard>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Print"
            onPress={() => setShowPrintView(true)}
            variant="secondary"
            style={{ flex: 1 }}
          />
          {invoice.balance_due > 0 && invoice.status !== 'cancelled' && (
            <Button
              title="Record Payment"
              onPress={() => setShowPaymentModal(true)}
              style={{ flex: 1 }}
            />
          )}
          {invoice.status === 'draft' && (
            <Button
              title="Mark as Sent"
              onPress={() => handleUpdateStatus('sent')}
              variant="secondary"
              style={{ flex: 1 }}
            />
          )}
        </View>

        {/* Send to Shift Button */}
        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Send Invoice to Shift Location"
            onPress={() => router.push(`/supervisor/invoice-send-to-shift?invoiceId=${invoice.id}`)}
            variant="primary"
            icon="send"
          />
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Balance Due: ${invoice.balance_due.toFixed(2)}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Date</Text>
              <TextInput
                style={styles.input}
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {['cash', 'check', 'credit_card', 'bank_transfer'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      {
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: 20,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                      paymentMethod === method && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        { fontSize: typography.sizes.sm, color: colors.text },
                        paymentMethod === method && {
                          color: colors.background,
                          fontWeight: typography.weights.semibold as any,
                        },
                      ]}
                    >
                      {method.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reference Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Check #, Transaction ID, etc."
                placeholderTextColor={colors.textSecondary}
                value={referenceNumber}
                onChangeText={setReferenceNumber}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Payment notes"
                placeholderTextColor={colors.textSecondary}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowPaymentModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Record Payment"
                onPress={handleRecordPayment}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}
