
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useDatabase } from '../../hooks/useDatabase';
import { useToast } from '../../hooks/useToast';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import TimeOffRequestModal, { type TimeOffRequestData } from '../../components/TimeOffRequestModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import { supabase } from '../integrations/supabase/client';
import uuid from 'react-native-uuid';

interface TimeOffRequest {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  request_type: 'single_shift' | 'date_range' | 'recurring_instances';
  shift_id?: string;
  shift_date?: string;
  start_date?: string;
  end_date?: string;
  recurring_shift_id?: string;
  requested_dates?: string[];
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  reviewed_by?: string;
  reviewed_at?: string;
  decline_reason?: string;
  created_at: string;
  updated_at: string;
}

interface RecurringShiftInfo {
  id: string;
  building_name: string;
  client_name: string;
  days_of_week?: number[];
  pattern_type: string;
  start_time?: string;
  hours: number;
}

export default function CleanerTimeOffScreen() {
  const { themeColor } = useTheme();
  const { executeQuery } = useDatabase();
  const { toast, showToast, hideToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [recurringShifts, setRecurringShifts] = useState<RecurringShiftInfo[]>([]);
  const [cleanerId, setCleanerId] = useState<string>('');
  const [cleanerName, setCleanerName] = useState<string>('');

  const loadCleanerInfo = useCallback(async () => {
    try {
      // Get session from auth system
      const { getSession } = await import('../utils/auth');
      const session = await getSession();

      if (session && session.id && session.name) {
        setCleanerId(session.id);
        setCleanerName(session.name);
      } else {
        // If no session found, redirect to sign-in
        Alert.alert(
          'Session Expired',
          'Please sign in again to continue.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error loading cleaner info:', error);
      showToast('Failed to load cleaner information', 'error');
    }
  }, [showToast]);

  const loadTimeOffRequests = useCallback(async () => {
    if (!cleanerId) {
      console.log('No cleaner ID, skipping time off requests load');
      return;
    }

    try {
      console.log('Loading time off requests for cleaner:', cleanerId);
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('cleaner_id', cleanerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading time off requests:', error);
        throw error;
      }

      console.log('Loaded time off requests:', data);
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading time off requests:', error);
      showToast('Failed to load time off requests', 'error');
    }
  }, [cleanerId, showToast]);

  const loadRecurringShifts = useCallback(async () => {
    if (!cleanerName) {
      console.log('No cleaner name, skipping recurring shifts load');
      return;
    }

    try {
      console.log('Loading recurring shifts for cleaner:', cleanerName);
      const { data, error } = await supabase
        .from('recurring_shifts')
        .select('*')
        .contains('cleaner_names', [cleanerName])
        .eq('is_active', true);

      if (error) {
        console.error('Error loading recurring shifts:', error);
        throw error;
      }

      console.log('Loaded recurring shifts:', data);
      setRecurringShifts(data || []);
    } catch (error) {
      console.error('Error loading recurring shifts:', error);
    }
  }, [cleanerName]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadCleanerInfo();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadCleanerInfo]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    await Promise.all([
      loadTimeOffRequests(),
      loadRecurringShifts()
    ]);
    setIsRefreshing(false);
  }, [loadData, loadTimeOffRequests, loadRecurringShifts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (cleanerId) {
      loadTimeOffRequests();
    }
  }, [cleanerId, loadTimeOffRequests]);

  useEffect(() => {
    if (cleanerName) {
      loadRecurringShifts();
    }
  }, [cleanerName, loadRecurringShifts]);

  const handleSubmitRequest = async (requestData: TimeOffRequestData) => {
    try {
      console.log('=== Starting time off request submission ===');
      console.log('Cleaner ID:', cleanerId);
      console.log('Cleaner Name:', cleanerName);
      console.log('Request Data:', requestData);

      if (!cleanerId || !cleanerName) {
        console.error('Missing cleaner ID or name');
        throw new Error('Cleaner information not loaded. Please try again.');
      }

      const requestId = uuid.v4() as string;
      console.log('Generated request ID:', requestId);

      const newRequest = {
        id: requestId,
        cleaner_id: cleanerId,
        cleaner_name: cleanerName,
        request_type: requestData.requestType,
        shift_id: requestData.shiftId || null,
        shift_date: requestData.shiftDate || null,
        start_date: requestData.startDate || null,
        end_date: requestData.endDate || null,
        recurring_shift_id: requestData.recurringShiftId || null,
        requested_dates: requestData.requestedDates || null,
        reason: requestData.reason,
        notes: requestData.notes || null,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Prepared request object:', newRequest);

      console.log('Inserting into Supabase...');
      const { data, error } = await supabase
        .from('time_off_requests')
        .insert([newRequest])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Insert successful! Response:', data);
      showToast('Time off request submitted successfully', 'success');
      
      // Reload the requests list
      await loadTimeOffRequests();
      console.log('=== Time off request submission complete ===');
    } catch (error) {
      console.error('=== Error submitting time off request ===');
      console.error('Error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this time off request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Cancelling request:', requestId);
              const { error } = await supabase
                .from('time_off_requests')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', requestId);

              if (error) {
                console.error('Error cancelling request:', error);
                throw error;
              }

              console.log('Request cancelled successfully');
              showToast('Request cancelled', 'success');
              await loadTimeOffRequests();
            } catch (error) {
              console.error('Error cancelling request:', error);
              showToast('Failed to cancel request', 'error');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'declined':
        return colors.danger;
      case 'cancelled':
        return colors.textTertiary;
      default:
        return colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'approved':
        return 'checkmark-circle';
      case 'declined':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'help-circle';
    }
  };

  const formatRequestDates = (request: TimeOffRequest) => {
    if (request.request_type === 'date_range' && request.start_date && request.end_date) {
      const start = new Date(request.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = new Date(request.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else if (request.request_type === 'recurring_instances' && request.requested_dates) {
      const count = request.requested_dates.length;
      return `${count} specific date${count !== 1 ? 's' : ''}`;
    }
    return 'N/A';
  };

  const renderRequest = (request: TimeOffRequest) => {
    const statusColor = getStatusColor(request.status);
    const statusIcon = getStatusIcon(request.status);

    return (
      <View key={request.id} style={[styles.requestCard, { borderLeftColor: statusColor }]}>
        <View style={styles.requestHeader}>
          <View style={styles.requestStatus}>
            <Icon name={statusIcon} size={20} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>
          {request.status === 'pending' && (
            <TouchableOpacity
              onPress={() => handleCancelRequest(request.id)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.requestBody}>
          <View style={styles.requestRow}>
            <Icon name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.requestLabel}>Dates:</Text>
            <Text style={styles.requestValue}>{formatRequestDates(request)}</Text>
          </View>

          <View style={styles.requestRow}>
            <Icon name="document-text" size={16} color={colors.textSecondary} />
            <Text style={styles.requestLabel}>Reason:</Text>
            <Text style={styles.requestValue}>{request.reason}</Text>
          </View>

          {request.notes && (
            <View style={styles.requestRow}>
              <Icon name="chatbox" size={16} color={colors.textSecondary} />
              <Text style={styles.requestLabel}>Notes:</Text>
              <Text style={styles.requestValue}>{request.notes}</Text>
            </View>
          )}

          {request.status === 'declined' && request.decline_reason && (
            <View style={[styles.requestRow, styles.declineReasonRow]}>
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.requestLabel, { color: colors.danger }]}>Decline Reason:</Text>
              <Text style={[styles.requestValue, { color: colors.danger }]}>
                {request.decline_reason}
              </Text>
            </View>
          )}

          {request.requested_dates && request.requested_dates.length > 0 && (
            <View style={styles.datesContainer}>
              <Text style={styles.datesTitle}>Requested Dates:</Text>
              <View style={styles.datesList}>
                {request.requested_dates.map((date, index) => (
                  <View key={index} style={[styles.dateChip, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.dateChipText, { color: statusColor }]}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.requestFooter}>
          <Text style={styles.requestDate}>
            Submitted {new Date(request.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          {request.reviewed_at && (
            <Text style={styles.requestDate}>
              Reviewed {new Date(request.reviewed_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Time Off Requests</Text>
          </View>
          <CompanyLogo size={40} />
        </View>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Time Off Requests</Text>
        </View>
        <CompanyLogo size={40} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={themeColor} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyStateTitle}>No Time Off Requests</Text>
            <Text style={styles.emptyStateText}>
              You haven&apos;t submitted any time off requests yet.
            </Text>
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: themeColor }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyStateButtonText}>Request Time Off</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map(renderRequest)}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColor }]}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <TimeOffRequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitRequest}
        cleanerId={cleanerId}
        cleanerName={cleanerName}
        recurringShifts={recurringShifts}
        themeColor={themeColor}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl * 2,
  },
  emptyStateTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyStateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  requestsList: {
    padding: spacing.lg,
  },
  requestCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.danger + '20',
  },
  cancelButtonText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '600',
  },
  requestBody: {
    gap: spacing.sm,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  requestLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 60,
  },
  requestValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  declineReasonRow: {
    backgroundColor: colors.danger + '10',
    padding: spacing.sm,
    borderRadius: 6,
    marginTop: spacing.sm,
  },
  datesContainer: {
    marginTop: spacing.md,
  },
  datesTitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  datesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dateChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  dateChipText: {
    ...typography.small,
    fontWeight: '600',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  requestDate: {
    ...typography.small,
    color: colors.textTertiary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
