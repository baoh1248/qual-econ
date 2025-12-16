
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../integrations/supabase/client';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import InvoiceItemSelector from '../../components/invoice/InvoiceItemSelector';
import InvoiceSummaryCard from '../../components/invoice/InvoiceSummaryCard';

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  cost: number;
}

interface LineItem {
  id: string;
  item_id?: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  invoiceNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invoiceNumberLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  invoiceNumberInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  lineItemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lineItemNameInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: spacing.xs,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineItemNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default function InvoiceCreateScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [isLoading, setIsLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Customer Information
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // Invoice Details
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Totals
  const [taxRate, setTaxRate] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');

  // Item Selector
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Generate invoice number
      const { data: invoiceNumData, error: invoiceNumError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceNumError) {
        console.error('Error generating invoice number:', invoiceNumError);
      } else {
        setInvoiceNumber(invoiceNumData);
      }

      // Load inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, name, current_stock, unit, cost')
        .order('name', { ascending: true });

      if (itemsError) {
        console.error('Error loading inventory items:', itemsError);
      } else {
        setInventoryItems(itemsData || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: uuid.v4() as string,
      itemName: `Item ${lineItems.length + 1}`,
      description: '',
      quantity: 1,
      unit: 'units',
      unit_price: 0,
      line_total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate line total (no discount anymore)
        const quantity = parseFloat(updated.quantity.toString()) || 0;
        const unitPrice = parseFloat(updated.unit_price.toString()) || 0;
        
        updated.line_total = quantity * unitPrice;
        
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const selectInventoryItem = (lineItemId: string, inventoryItem: InventoryItem) => {
    updateLineItem(lineItemId, 'item_id', inventoryItem.id);
    updateLineItem(lineItemId, 'itemName', inventoryItem.name);
    updateLineItem(lineItemId, 'description', inventoryItem.name);
    updateLineItem(lineItemId, 'unit', inventoryItem.unit);
    updateLineItem(lineItemId, 'unit_price', inventoryItem.cost);
  };

  const handleSelectItem = (item: InventoryItem) => {
    if (selectedLineItemId) {
      selectInventoryItem(selectedLineItemId, item);
      setSelectedLineItemId(null);
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    const taxAmount = subtotal * (parseFloat(taxRate) / 100);
    const discount = parseFloat(discountAmount) || 0;
    const total = subtotal + taxAmount - discount;
    
    return {
      subtotal,
      taxAmount,
      discount,
      total,
    };
  };

  const handleSaveInvoice = async (status: 'draft' | 'sent') => {
    if (!customerName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }

    if (!invoiceNumber.trim()) {
      showToast('Please enter invoice number', 'error');
      return;
    }

    if (lineItems.length === 0) {
      showToast('Please add at least one line item', 'error');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Creating invoice...');

      const totals = calculateTotals();
      const invoiceId = uuid.v4() as string;

      // Create invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          invoice_number: invoiceNumber.trim(),
          customer_name: customerName.trim(),
          customer_address: customerAddress.trim() || null,
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
          billing_address: billingAddress.trim() || null,
          shipping_address: shippingAddress.trim() || null,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          payment_terms: paymentTerms,
          subtotal: totals.subtotal,
          tax_rate: parseFloat(taxRate),
          tax_amount: totals.taxAmount,
          discount_amount: totals.discount,
          total_amount: totals.total,
          amount_paid: 0,
          balance_due: totals.total,
          status: status,
          notes: notes.trim() || null,
          internal_notes: internalNotes.trim() || null,
          created_by: 'Supervisor',
        });

      if (invoiceError) {
        console.error('❌ Error creating invoice:', invoiceError);
        throw invoiceError;
      }

      // Create line items (no discount_percent anymore)
      const lineItemsData = lineItems.map((item, index) => ({
        id: uuid.v4() as string,
        invoice_id: invoiceId,
        line_number: index + 1,
        item_id: item.item_id || null,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_percent: 0,
        discount_amount: 0,
        line_total: item.line_total,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);

      if (lineItemsError) {
        console.error('❌ Error creating line items:', lineItemsError);
        throw lineItemsError;
      }

      // Update inventory if items were selected
      for (const item of lineItems) {
        if (item.item_id) {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.item_id);
          if (inventoryItem) {
            const newStock = inventoryItem.current_stock - item.quantity;
            
            await supabase
              .from('inventory_items')
              .update({ 
                current_stock: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.item_id);

            // Log transaction
            await supabase
              .from('inventory_transactions')
              .insert({
                id: uuid.v4() as string,
                item_id: item.item_id,
                item_name: item.description,
                transaction_type: 'out',
                quantity: item.quantity,
                previous_stock: inventoryItem.current_stock,
                new_stock: newStock,
                reason: `Invoice ${invoiceNumber}`,
                performed_by: 'Supervisor',
              });
          }
        }
      }

      console.log('✅ Invoice created successfully');
      showToast(`Invoice ${status === 'draft' ? 'saved as draft' : 'created'}`, 'success');
      router.back();
    } catch (error) {
      console.error('❌ Failed to create invoice:', error);
      showToast('Failed to create invoice', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Number - Now Editable */}
        <View style={styles.section}>
          <View style={styles.invoiceNumberContainer}>
            <Text style={styles.invoiceNumberLabel}>Invoice #</Text>
            <TextInput
              style={styles.invoiceNumberInput}
              placeholder="Enter invoice number"
              placeholderTextColor={colors.textSecondary}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
            />
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              placeholderTextColor={colors.textSecondary}
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="customer@example.com"
              placeholderTextColor={colors.textSecondary}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street address"
              placeholderTextColor={colors.textSecondary}
              value={customerAddress}
              onChangeText={setCustomerAddress}
              multiline
            />
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Invoice Date</Text>
              <TextInput
                style={styles.input}
                value={invoiceDate}
                onChangeText={setInvoiceDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Payment Terms</Text>
            <TextInput
              style={styles.input}
              value={paymentTerms}
              onChangeText={setPaymentTerms}
              placeholder="Net 30"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity onPress={addLineItem}>
              <Icon name="add-circle" size={32} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {lineItems.map((item, index) => (
            <View key={item.id} style={styles.lineItemCard}>
              <View style={styles.lineItemHeader}>
                <TextInput
                  style={styles.lineItemNameInput}
                  placeholder={`Item ${index + 1}`}
                  placeholderTextColor={colors.textSecondary}
                  value={item.itemName}
                  onChangeText={(text) => updateLineItem(item.id, 'itemName', text)}
                />
                <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                  <Icon name="trash" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Text style={styles.label}>Description</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLineItemId(item.id);
                      setShowItemSelector(true);
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: typography.sizes.sm }}>
                      Select from inventory
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Item description"
                  placeholderTextColor={colors.textSecondary}
                  value={item.description}
                  onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    value={item.quantity.toString()}
                    onChangeText={(text) => updateLineItem(item.id, 'quantity', parseFloat(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="units"
                    placeholderTextColor={colors.textSecondary}
                    value={item.unit}
                    onChangeText={(text) => updateLineItem(item.id, 'unit', text)}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={item.unit_price.toString()}
                    onChangeText={(text) => updateLineItem(item.id, 'unit_price', parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Line Total</Text>
                  <Text style={[styles.input, { color: colors.primary, fontWeight: 'bold' }]}>
                    ${item.line_total.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tax Rate %</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Discount Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={discountAmount}
                onChangeText={setDiscountAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Notes for customer"
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Internal Notes</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Internal notes (not visible to customer)"
              placeholderTextColor={colors.textSecondary}
              value={internalNotes}
              onChangeText={setInternalNotes}
              multiline
            />
          </View>
        </View>

        {/* Summary */}
        <InvoiceSummaryCard
          subtotal={totals.subtotal}
          taxRate={parseFloat(taxRate)}
          taxAmount={totals.taxAmount}
          discountAmount={totals.discount}
          total={totals.total}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Save as Draft"
            onPress={() => handleSaveInvoice('draft')}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            title="Create Invoice"
            onPress={() => handleSaveInvoice('sent')}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      <InvoiceItemSelector
        visible={showItemSelector}
        onSelect={handleSelectItem}
        onClose={() => {
          setShowItemSelector(false);
          setSelectedLineItemId(null);
        }}
      />

      <Toast />
    </View>
  );
}
