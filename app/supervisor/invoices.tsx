
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform, FlatList } from 'react-native';
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
import IconButton from '../../components/IconButton';
import uuid from 'react-native-uuid';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import InvoiceDashboard from '../../components/invoice/InvoiceDashboard';

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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  invoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  invoiceNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  customerName: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  invoiceInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: 'flex-end',
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

export default function InvoicesScreen() {
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config, syncStatus } = useDatabase();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

  const loadInvoices = useCallback(async () => {
    if (!config.useSupabase) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading invoices from Supabase...');

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

  const handleCreateInvoice = () => {
    router.push('/supervisor/invoice-create');
  };

  const handleViewStatements = () => {
    router.push('/supervisor/invoice-statements');
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/supervisor/invoice-detail?id=${invoiceId}`);
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting invoice:', invoiceId);

              const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', invoiceId);

              if (error) {
                console.error('❌ Error deleting invoice:', error);
                throw error;
              }

              console.log('✅ Invoice deleted successfully');
              showToast('Invoice deleted successfully', 'success');
              await loadInvoices();
            } catch (error) {
              console.error('❌ Failed to delete invoice:', error);
              showToast('Failed to delete invoice', 'error');
            }
          },
        },
      ]
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalInvoices: invoices.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    totalPaid: invoices.reduce((sum, inv) => sum + inv.amount_paid, 0),
    totalOutstanding: invoices.reduce((sum, inv) => sum + inv.balance_due, 0),
  };

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
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity onPress={() => router.push('/supervisor/invoice-assignments')}>
            <Icon name="send" size={24} color={colors.background} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleViewStatements}>
            <Icon name="document-text" size={24} color={colors.background} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateInvoice}>
            <Icon name="add-circle" size={32} color={colors.background} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoices..."
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
          style={[styles.filterChip, filterStatus === 'draft' && styles.filterChipActive]}
          onPress={() => setFilterStatus('draft')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'draft' && styles.filterChipTextActive]}>
            Draft
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'sent' && styles.filterChipActive]}
          onPress={() => setFilterStatus('sent')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'sent' && styles.filterChipTextActive]}>
            Sent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'paid' && styles.filterChipActive]}
          onPress={() => setFilterStatus('paid')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'paid' && styles.filterChipTextActive]}>
            Paid
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

      <View style={styles.statsContainer}>
        <InvoiceDashboard
          totalInvoices={stats.totalInvoices}
          totalRevenue={stats.totalRevenue}
          totalPaid={stats.totalPaid}
          totalOutstanding={stats.totalOutstanding}
          overdueAmount={invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.balance_due, 0)}
        />
      </View>

      <ScrollView style={styles.listContainer}>
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No invoices found' : 'No invoices yet'}
            </Text>
          </View>
        ) : (
          filteredInvoices.map((invoice) => (
            <AnimatedCard key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(invoice.status) }]}>
                    {invoice.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.customerName}>{invoice.customer_name}</Text>

              <View style={styles.invoiceInfo}>
                <View style={styles.infoItem}>
                  <Icon name="calendar" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Icon name="cash" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    ${invoice.total_amount.toFixed(2)}
                  </Text>
                </View>
                {invoice.balance_due > 0 && (
                  <View style={styles.infoItem}>
                    <Icon name="alert-circle" size={16} color={colors.warning} />
                    <Text style={[styles.infoText, { color: colors.warning }]}>
                      Due: ${invoice.balance_due.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.invoiceActions}>
                <Button
                  title="View"
                  onPress={() => handleViewInvoice(invoice.id)}
                  variant="secondary"
                  style={{ marginRight: spacing.sm }}
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                  variant="secondary"
                />
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}
