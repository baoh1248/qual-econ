
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, RefreshControl, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../integrations/supabase/client';

interface ScheduleRequest {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  request_type: 'shift_swap' | 'schedule_change' | 'extra_shift';
  description: string;
  target_date?: string;
  swap_with_cleaner?: string;
  status: 'pending' | 'approved' | 'declined';
  supervisor_notes?: string;
  created_at: string;
  updated_at?: string;
}

const REQUEST_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  shift_swap: { label: 'Shift Swap', icon: 'swap-horizontal' },
  schedule_change: { label: 'Schedule Change', icon: 'create-outline' },
  extra_shift: { label: 'Extra Shift', icon: 'add-circle-outline' },
};

export default function ScheduleRequestsReviewScreen() {
  const { themeColor } = useTheme();
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ScheduleRequest | null>(null);
  const [supervisorNotes, setSupervisorNotes] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      let query = supabase
        .from('schedule_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          setRequests([]);
          return;
        }
        throw error;
      }
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading schedule requests:', err);
      showToast('Failed to load schedule requests', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, showToast]);

  useEffect(() => {
    setLoading(true);
    loadRequests();
  }, [loadRequests, filterStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleApprove = async (request: ScheduleRequest) => {
    const doApprove = async () => {
      try {
        const { error } = await supabase
          .from('schedule_requests')
          .update({
            status: 'approved',
            supervisor_notes: supervisorNotes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        if (error) throw error;

        showToast(`Schedule request approved for ${request.cleaner_name}`, 'success');
        setSupervisorNotes('');
        await loadRequests();
      } catch (err) {
        console.error('Error approving request:', err);
        showToast('Failed to approve request', 'error');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Approve ${REQUEST_TYPE_LABELS[request.request_type]?.label} request from ${request.cleaner_name}?`);
      if (confirmed) await doApprove();
    } else {
      Alert.alert(
        'Approve Request',
        `Approve ${REQUEST_TYPE_LABELS[request.request_type]?.label} request from ${request.cleaner_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: doApprove },
        ]
      );
    }
  };

  const handleDeclinePress = (request: ScheduleRequest) => {
    setSelectedRequest(request);
    setSupervisorNotes('');
    setDeclineModalVisible(true);
  };

  const submitDecline = async () => {
    if (!selectedRequest) return;
    if (!supervisorNotes.trim()) {
      Alert.alert('Required', 'Please provide a reason for declining.');
      return;
    }

    try {
      const { error } = await supabase
        .from('schedule_requests')
        .update({
          status: 'declined',
          supervisor_notes: supervisorNotes.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      showToast('Schedule request declined', 'success');
      setDeclineModalVisible(false);
      setSelectedRequest(null);
      setSupervisorNotes('');
      await loadRequests();
    } catch (err) {
      console.error('Error declining request:', err);
      showToast('Failed to decline request', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'approved': return colors.success;
      case 'declined': return colors.danger;
      default: return colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time';
      case 'approved': return 'checkmark-circle';
      case 'declined': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const FILTERS: Array<{ key: typeof filterStatus; label: string }> = [
    { key: 'pending', label: `Pending${filterStatus === 'all' ? ` (${pendingCount})` : ''}` },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
    { key: 'all', label: 'All' },
  ];

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>
            Schedule Requests
          </Text>
          {pendingCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <CompanyLogo size="small" />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filterStatus === f.key && { backgroundColor: themeColor, borderColor: themeColor }]}
            onPress={() => setFilterStatus(f.key)}
          >
            <Text style={[styles.filterTabText, filterStatus === f.key && { color: '#FFFFFF' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={commonStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={themeColor} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'pending' ? 'No Pending Requests' : 'No Requests Found'}
            </Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'pending'
                ? 'All schedule requests have been reviewed.'
                : `No ${filterStatus === 'all' ? '' : filterStatus + ' '}requests to show.`}
            </Text>
          </View>
        ) : (
          requests.map(request => {
            const statusColor = getStatusColor(request.status);
            const statusIcon = getStatusIcon(request.status);
            const typeInfo = REQUEST_TYPE_LABELS[request.request_type] || { label: request.request_type, icon: 'help-circle' };
            const isPending = request.status === 'pending';

            return (
              <View key={request.id} style={[styles.requestCard, { borderLeftColor: statusColor }]}>
                {/* Header row */}
                <View style={styles.requestHeader}>
                  <View style={styles.requestStatus}>
                    <Icon name={statusIcon} size={18} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: themeColor + '15' }]}>
                    <Icon name={typeInfo.icon} size={14} color={themeColor} />
                    <Text style={[styles.typeBadgeText, { color: themeColor }]}>{typeInfo.label}</Text>
                  </View>
                </View>

                {/* Cleaner name */}
                <Text style={styles.cleanerName}>{request.cleaner_name}</Text>

                {/* Details */}
                <View style={styles.requestBody}>
                  <View style={styles.requestRow}>
                    <Icon name="document-text" size={16} color={colors.textSecondary} />
                    <Text style={styles.requestValue}>{request.description}</Text>
                  </View>

                  {request.target_date && (
                    <View style={styles.requestRow}>
                      <Icon name="calendar" size={16} color={colors.textSecondary} />
                      <Text style={styles.requestLabel}>Date:</Text>
                      <Text style={styles.requestValue}>
                        {new Date(request.target_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  )}

                  {request.swap_with_cleaner && (
                    <View style={styles.requestRow}>
                      <Icon name="people" size={16} color={colors.textSecondary} />
                      <Text style={styles.requestLabel}>Swap with:</Text>
                      <Text style={styles.requestValue}>{request.swap_with_cleaner}</Text>
                    </View>
                  )}

                  <View style={styles.requestRow}>
                    <Icon name="time-outline" size={16} color={colors.textTertiary} />
                    <Text style={styles.requestTimestamp}>
                      Submitted {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>

                  {request.supervisor_notes && (
                    <View style={[styles.notesRow, { borderLeftColor: statusColor }]}>
                      <Text style={styles.notesLabel}>Supervisor Response:</Text>
                      <Text style={styles.notesText}>{request.supervisor_notes}</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                {isPending && (
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={({ pressed }) => [styles.actionButton, styles.declineButton, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => handleDeclinePress(request)}
                    >
                      <Icon name="close-circle" size={20} color={colors.textInverse} />
                      <Text style={styles.actionButtonText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionButton, styles.approveButton, { backgroundColor: themeColor, opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => handleApprove(request)}
                    >
                      <Icon name="checkmark-circle" size={20} color={colors.textInverse} />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>

      {/* Decline Modal */}
      <Modal visible={declineModalVisible} transparent animationType="fade" onRequestClose={() => setDeclineModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeclineModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Decline Request</Text>
            <Text style={styles.modalSubtitle}>
              Declining request from {selectedRequest?.cleaner_name}
            </Text>

            <Text style={styles.modalLabel}>Reason for declining *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Explain why this request is being declined..."
              placeholderTextColor={colors.textTertiary}
              value={supervisorNotes}
              onChangeText={setSupervisorNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setDeclineModalVisible(false); setSelectedRequest(null); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeclineBtn, !supervisorNotes.trim() && { opacity: 0.5 }]}
                onPress={submitDecline}
                disabled={!supervisorNotes.trim()}
              >
                <Text style={styles.modalDeclineText}>Decline Request</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxxl,
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
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  cleanerName: {
    ...typography.h4,
    color: colors.text,
  },
  requestBody: {
    gap: spacing.sm,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  requestLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  requestValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  requestTimestamp: {
    ...typography.small,
    color: colors.textTertiary,
  },
  notesRow: {
    marginTop: spacing.xs,
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
    gap: 2,
  },
  notesLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  notesText: {
    ...typography.body,
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  declineButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  // Decline Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    minHeight: 80,
    ...typography.body,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalDeclineBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.danger,
  },
  modalDeclineText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
