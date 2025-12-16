
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { router } from 'expo-router';
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
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import InvoiceStatementView from '../../components/invoice/InvoiceStatementView';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_address?: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.background,
    fontWeight: typography.weights.semibold as any,
  },
  statementCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statementInfo: {
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
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  balanceDue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.error,
    marginTop: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default function InvoiceStatementsScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'outstanding'>('all');
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    if (!config.useSupabase) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading invoices for statements...');

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('❌ Error loading invoices:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} invoices`);
      setInvoices(data || []);
    } catch (error) {
      console.error('❌ Failed to load invoices:', error);
      showToast('Failed to load invoices', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [config.useSupabase, showToast]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const getCustomerInvoices = (customerName: string) => {
    return invoices.filter(inv => inv.customer_name === customerName);
  };

  const calculateAgingBuckets = (customerInvoices: Invoice[]) => {
    const today = new Date();
    let current = 0;
    let days30 = 0;
    let days60 = 0;
    let days90 = 0;
    let over90 = 0;

    customerInvoices.forEach(inv => {
      if (inv.balance_due <= 0) return;

      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        current += inv.balance_due;
      } else if (daysOverdue <= 30) {
        days30 += inv.balance_due;
      } else if (daysOverdue <= 60) {
        days60 += inv.balance_due;
      } else if (daysOverdue <= 90) {
        days90 += inv.balance_due;
      } else {
        over90 += inv.balance_due;
      }
    });

    return { current, days30, days60, days90, over90 };
  };

  const getUniqueCustomers = () => {
    const customers = new Map<string, Invoice[]>();
    invoices.forEach(inv => {
      if (!customers.has(inv.customer_name)) {
        customers.set(inv.customer_name, []);
      }
      customers.get(inv.customer_name)!.push(inv);
    });
    return customers;
  };

  const filteredCustomers = Array.from(getUniqueCustomers().entries()).filter(([customerName, customerInvoices]) => {
    const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const totalBalance = customerInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);
    
    if (filterStatus === 'overdue') {
      const hasOverdue = customerInvoices.some(inv => inv.status === 'overdue');
      return matchesSearch && hasOverdue;
    } else if (filterStatus === 'outstanding') {
      return matchesSearch && totalBalance > 0;
    }
    return matchesSearch;
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <CompanyLogo />
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={{ fontSize: typography.sizes.xl, fontWeight: typography.weights.bold as any, marginBottom: spacing.md }}>
          Customer Statements
        </Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'outstanding' && styles.filterChipActive]}
            onPress={() => setFilterStatus('outstanding')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'outstanding' && styles.filterChipTextActive]}>
              Outstanding
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'overdue' && styles.filterChipActive]}
            onPress={() => setFilterStatus('overdue')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'overdue' && styles.filterChipTextActive]}>
              Overdue
            </Text>
          </TouchableOpacity>
        </View>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No customers found' : 'No statements available'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map(([customerName, customerInvoices]) => {
            const totalBalance = customerInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);
            const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

            return (
              <AnimatedCard key={customerName} style={styles.statementCard}>
                <Text style={styles.customerName}>{customerName}</Text>

                <View style={styles.statementInfo}>
                  <Text style={styles.infoLabel}>Total Invoiced</Text>
                  <Text style={styles.infoValue}>${totalInvoiced.toFixed(2)}</Text>
                </View>

                <View style={styles.statementInfo}>
                  <Text style={styles.infoLabel}>Invoices</Text>
                  <Text style={styles.infoValue}>{customerInvoices.length}</Text>
                </View>

                {totalBalance > 0 && (
                  <Text style={styles.balanceDue}>
                    Balance Due: ${totalBalance.toFixed(2)}
                  </Text>
                )}

                <View style={styles.actionButtons}>
                  <Button
                    title="View Statement"
                    onPress={() => {
                      setSelectedCustomer(customerName);
                      setShowStatementModal(true);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>

      {/* Statement Modal */}
      <Modal visible={showStatementModal} animationType="slide">
        {selectedCustomer && (
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowStatementModal(false)}>
                <Icon name="arrow-back" size={24} color={colors.background} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Statement</Text>
              <View style={{ width: 24 }} />
            </View>

            {(() => {
              const customerInvoices = getCustomerInvoices(selectedCustomer);
              const aging = calculateAgingBuckets(customerInvoices);
              const totalBalance = customerInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);

              return (
                <InvoiceStatementView
                  customerName={selectedCustomer}
                  customerAddress={customerInvoices[0]?.customer_address || 'Address not provided'}
                  statementDate={new Date().toISOString()}
                  invoices={customerInvoices.map(inv => ({
                    invoice_number: inv.invoice_number,
                    invoice_date: inv.invoice_date,
                    customer_name: inv.customer_name,
                    original_amount: inv.total_amount,
                    amount_paid: inv.amount_paid,
                    balance_due: inv.balance_due,
                    days_overdue: 0,
                  }))}
                  totalCurrent={aging.current}
                  total30Days={aging.days30}
                  total60Days={aging.days60}
                  total90Days={aging.days90}
                  totalOver90Days={aging.over90}
                  totalBalance={totalBalance}
                />
              );
            })()}
          </View>
        )}
      </Modal>

      <Toast />
    </View>
  );
}
