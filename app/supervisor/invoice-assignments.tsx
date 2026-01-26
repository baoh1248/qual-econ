
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
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

interface InvoiceAssignment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  shift_id?: string;
  shift_date?: string;
  building_name?: string;
  client_name?: string;
  location_address?: string;
  assigned_by?: string;
  assigned_at: string;
  notes?: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'cancelled';
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
  filterContainer: {
    flexDirection: 'row',
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
  assignmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignmentHeader: {
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
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
  assignmentInfo: {
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
  assignmentActions: {
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

export default function InvoiceAssignmentsScreen() {
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config } = useDatabase();

  const [assignments, setAssignments] = useState<InvoiceAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in-transit' | 'delivered'>('all');

  const loadAssignments = useCallback(async () => {
    if (!config.useSupabase) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading invoice assignments...');

      const { data, error } = await supabase
        .from('invoice_shift_assignments')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading assignments:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} assignments`);
      setAssignments(data || []);
    } catch (error) {
      console.error('❌ Failed to load assignments:', error);
      showToast('Failed to load assignments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [config.useSupabase, showToast]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'in-transit':
        return colors.primary;
      case 'delivered':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const handleUpdateStatus = async (assignmentId: string, invoiceId: string, newStatus: InvoiceAssignment['status']) => {
    try {
      console.log('🔄 Updating assignment status...');

      // Update assignment status
      const { error: assignmentError } = await supabase
        .from('invoice_shift_assignments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (assignmentError) {
        console.error('❌ Error updating assignment status:', assignmentError);
        throw assignmentError;
      }

      // If marking as delivered, also update the invoice status to 'sent'
      // This ensures the main invoice menu reflects the delivery
      if (newStatus === 'delivered') {
        console.log('🔄 Updating invoice status to sent...');
        
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);

        if (invoiceError) {
          console.error('❌ Error updating invoice status:', invoiceError);
          // Don't throw here - assignment was updated successfully
          showToast('Assignment updated but invoice status sync failed', 'warning');
        } else {
          console.log('✅ Invoice status updated to sent');
        }
      }

      console.log('✅ Status updated successfully');
      showToast('Status updated successfully', 'success');
      await loadAssignments();
    } catch (error) {
      console.error('❌ Failed to update status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const handleCancelAssignment = async (assignmentId: string, invoiceId: string, invoiceNumber: string) => {
    Alert.alert(
      'Cancel Assignment',
      `Are you sure you want to cancel the assignment for invoice ${invoiceNumber}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            await handleUpdateStatus(assignmentId, invoiceId, 'cancelled');
          },
        },
      ]
    );
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filterStatus === 'all') return true;
    return assignment.status === filterStatus;
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
        <Text style={styles.headerTitle}>Invoice Assignments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Filter */}
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
            style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'in-transit' && styles.filterChipActive]}
            onPress={() => setFilterStatus('in-transit')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'in-transit' && styles.filterChipTextActive]}>
              In Transit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'delivered' && styles.filterChipActive]}
            onPress={() => setFilterStatus('delivered')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'delivered' && styles.filterChipTextActive]}>
              Delivered
            </Text>
          </TouchableOpacity>
        </View>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {filterStatus === 'all' ? 'No invoice assignments yet' : `No ${filterStatus} assignments`}
            </Text>
          </View>
        ) : (
          filteredAssignments.map((assignment) => (
            <AnimatedCard key={assignment.id} style={styles.assignmentCard}>
              <View style={styles.assignmentHeader}>
                <Text style={styles.invoiceNumber}>Invoice {assignment.invoice_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(assignment.status) }]}>
                    {assignment.status.toUpperCase().replace('-', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.assignmentInfo}>
                {assignment.building_name && (
                  <View style={styles.infoItem}>
                    <Icon name="business" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{assignment.building_name}</Text>
                  </View>
                )}
                {assignment.client_name && (
                  <View style={styles.infoItem}>
                    <Icon name="person" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{assignment.client_name}</Text>
                  </View>
                )}
                {assignment.shift_date && (
                  <View style={styles.infoItem}>
                    <Icon name="calendar" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                      {new Date(assignment.shift_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {assignment.location_address && (
                  <View style={styles.infoItem}>
                    <Icon name="location" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{assignment.location_address}</Text>
                  </View>
                )}
              </View>

              {assignment.notes && (
                <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textSecondary }]}>
                  Notes: {assignment.notes}
                </Text>
              )}

              <View style={styles.assignmentActions}>
                {assignment.status === 'pending' && (
                  <>
                    <Button
                      title="In Transit"
                      onPress={() => handleUpdateStatus(assignment.id, assignment.invoice_id, 'in-transit')}
                      variant="secondary"
                      style={{ marginRight: spacing.sm }}
                    />
                    <Button
                      title="Cancel"
                      onPress={() => handleCancelAssignment(assignment.id, assignment.invoice_id, assignment.invoice_number)}
                      variant="secondary"
                    />
                  </>
                )}
                {assignment.status === 'in-transit' && (
                  <Button
                    title="Mark as Delivered"
                    onPress={() => handleUpdateStatus(assignment.id, assignment.invoice_id, 'delivered')}
                    variant="primary"
                  />
                )}
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
