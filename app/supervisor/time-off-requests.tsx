
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useDatabase } from '../../hooks/useDatabase';
import { useToast } from '../../hooks/useToast';
import { useScheduleStorage } from '../../hooks/useScheduleStorage';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
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

export default function SupervisorTimeOffRequestsScreen() {
  const { themeColor } = useTheme();
  const { executeQuery } = useDatabase();
  const { showToast } = useToast();
  const { getWeekSchedule, updateScheduleEntry, getWeekIdFromDate, clearCaches, loadData: reloadScheduleData } = useScheduleStorage();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const loadTimeOffRequests = useCallback(async () => {
    try {
      let query = supabase
        .from('time_off_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error loading time off requests:', error);
      showToast('Failed to load time off requests', 'error');
    }
  }, [filterStatus, showToast]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadTimeOffRequests();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadTimeOffRequests]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData, filterStatus]);

  /**
   * FIXED: Properly unassign shifts in date range with better error handling
   */
  const unassignShiftsInDateRange = useCallback(async (cleanerName: string, startDate: string, endDate: string) => {
    try {
      console.log('=== UNASSIGNING SHIFTS IN DATE RANGE ===');
      console.log('Cleaner:', cleanerName);
      console.log('Date range:', startDate, 'to', endDate);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      const weeks = new Set<string>();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        weeks.add(getWeekIdFromDate(new Date(d)));
      }

      console.log('Processing weeks:', Array.from(weeks));

      let totalUnassigned = 0;
      const updatePromises: Promise<void>[] = [];
      const shiftsToUpdate: Array<{ weekId: string; entryId: string; updates: any }> = [];

      for (const weekId of weeks) {
        const schedule = getWeekSchedule(weekId, true);
        console.log(`Week ${weekId}: ${schedule.length} entries`);
        
        for (const entry of schedule) {
          if (!entry || !entry.date) continue;
          
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          
          if (entryDate >= start && entryDate <= end) {
            const cleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
              ? entry.cleanerNames 
              : (entry.cleanerName ? [entry.cleanerName] : []);
            
            if (cleaners.includes(cleanerName)) {
              console.log(`Found shift to unassign: ${entry.id} on ${entry.date}`);
              
              const updatedCleaners = cleaners.filter(name => name !== cleanerName);
              
              if (updatedCleaners.length === 0) {
                const updates = {
                  cleanerName: 'UNASSIGNED',
                  cleanerNames: ['UNASSIGNED'],
                  cleanerIds: [],
                  status: 'scheduled' as const,
                  notes: `${entry.notes || ''}\n[Time off approved for ${cleanerName}]`.trim(),
                };
                
                shiftsToUpdate.push({ weekId, entryId: entry.id, updates });
                console.log(`✅ Queued shift ${entry.id} to be marked as UNASSIGNED`);
                totalUnassigned++;
              } else {
                const updates = {
                  cleanerName: updatedCleaners[0],
                  cleanerNames: updatedCleaners,
                  cleanerIds: entry.cleanerIds?.filter((_, index) => cleaners[index] !== cleanerName) || [],
                  notes: `${entry.notes || ''}\n[${cleanerName} removed - time off approved]`.trim(),
                };
                
                shiftsToUpdate.push({ weekId, entryId: entry.id, updates });
                console.log(`✅ Queued cleaner ${cleanerName} to be removed from shift ${entry.id}`);
                totalUnassigned++;
              }
            }
          }
        }
      }

      // Execute all updates
      for (const { weekId, entryId, updates } of shiftsToUpdate) {
        const updatePromise = updateScheduleEntry(weekId, entryId, updates);
        updatePromises.push(updatePromise);
      }

      await Promise.all(updatePromises);
      console.log(`✅ Total shifts unassigned: ${totalUnassigned}`);
      console.log('=== UNASSIGN SHIFTS IN DATE RANGE COMPLETED ===');
      
      return totalUnassigned;
    } catch (error) {
      console.error('❌ Error unassigning shifts in date range:', error);
      throw error;
    }
  }, [getWeekSchedule, getWeekIdFromDate, updateScheduleEntry]);

  /**
   * FIXED: Properly unassign shifts on specific dates
   */
  const unassignShiftsOnDates = useCallback(async (
    cleanerName: string,
    dates: string[],
    recurringShiftId?: string
  ) => {
    try {
      console.log('=== UNASSIGNING SHIFTS ON SPECIFIC DATES ===');
      console.log('Cleaner:', cleanerName);
      console.log('Dates:', dates);
      console.log('Recurring shift ID:', recurringShiftId);
      
      let totalUnassigned = 0;
      const updatePromises: Promise<void>[] = [];

      for (const date of dates) {
        const weekId = getWeekIdFromDate(new Date(date));
        const schedule = getWeekSchedule(weekId, true);
        
        console.log(`Processing date ${date} in week ${weekId}: ${schedule.length} entries`);
        
        for (const entry of schedule) {
          if (entry.date === date) {
            if (recurringShiftId && entry.recurringId !== recurringShiftId) {
              continue;
            }
            
            const cleaners = entry.cleanerNames || [entry.cleanerName];
            
            if (cleaners.includes(cleanerName)) {
              console.log(`Found shift to unassign: ${entry.id} on ${entry.date}`);
              
              const updatedCleaners = cleaners.filter(name => name !== cleanerName);
              
              if (updatedCleaners.length === 0) {
                const updates = {
                  cleanerName: 'UNASSIGNED',
                  cleanerNames: ['UNASSIGNED'],
                  cleanerIds: [],
                  status: 'scheduled' as const,
                  notes: `${entry.notes || ''}\n[Time off approved for ${cleanerName}]`.trim(),
                };
                
                const updatePromise = updateScheduleEntry(weekId, entry.id, updates);
                updatePromises.push(updatePromise);
                
                console.log(`✅ Queued shift ${entry.id} to be marked as UNASSIGNED`);
                totalUnassigned++;
              } else {
                const updates = {
                  cleanerName: updatedCleaners[0],
                  cleanerNames: updatedCleaners,
                  cleanerIds: entry.cleanerIds?.filter((_, index) => cleaners[index] !== cleanerName) || [],
                  notes: `${entry.notes || ''}\n[${cleanerName} removed - time off approved]`.trim(),
                };
                
                const updatePromise = updateScheduleEntry(weekId, entry.id, updates);
                updatePromises.push(updatePromise);
                
                console.log(`✅ Queued cleaner ${cleanerName} to be removed from shift ${entry.id}`);
                totalUnassigned++;
              }
            }
          }
        }
      }

      await Promise.all(updatePromises);
      console.log(`✅ Total shifts unassigned: ${totalUnassigned}`);
      console.log('=== UNASSIGN SHIFTS ON DATES COMPLETED ===');
      
      return totalUnassigned;
    } catch (error) {
      console.error('❌ Error unassigning shifts on dates:', error);
      throw error;
    }
  }, [getWeekSchedule, getWeekIdFromDate, updateScheduleEntry]);

  /**
   * FIXED: Create notifications for unassigned shifts
   */
  const createUnassignedShiftNotifications = useCallback(async (request: TimeOffRequest, unassignedCount: number) => {
    try {
      if (unassignedCount === 0) {
        console.log('No shifts were unassigned, skipping notification creation');
        return;
      }

      console.log('=== CREATING UNASSIGNED SHIFT NOTIFICATIONS ===');
      
      const notifications: any[] = [];
      
      if (request.request_type === 'date_range' && request.start_date && request.end_date) {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const weekId = getWeekIdFromDate(new Date(d));
          const schedule = getWeekSchedule(weekId, true);
          
          for (const entry of schedule) {
            if (entry.date === dateStr && 
                (entry.cleanerName === 'UNASSIGNED' || entry.cleanerNames?.includes('UNASSIGNED'))) {
              notifications.push({
                id: uuid.v4() as string,
                notification_type: 'unassigned_shift',
                shift_id: entry.id,
                shift_date: entry.date,
                building_name: entry.buildingName,
                client_name: entry.clientName,
                time_off_request_id: request.id,
                message: `Shift at ${entry.clientName} - ${entry.buildingName} on ${new Date(entry.date).toLocaleDateString()} is now unassigned due to approved time off for ${request.cleaner_name}`,
                is_read: false,
                is_dismissed: false,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      } else if (request.request_type === 'recurring_instances' && request.requested_dates) {
        for (const date of request.requested_dates) {
          const weekId = getWeekIdFromDate(new Date(date));
          const schedule = getWeekSchedule(weekId, true);
          
          for (const entry of schedule) {
            if (entry.date === date && 
                (entry.cleanerName === 'UNASSIGNED' || entry.cleanerNames?.includes('UNASSIGNED'))) {
              notifications.push({
                id: uuid.v4() as string,
                notification_type: 'unassigned_shift',
                shift_id: entry.id,
                shift_date: entry.date,
                building_name: entry.buildingName,
                client_name: entry.clientName,
                time_off_request_id: request.id,
                message: `Shift at ${entry.clientName} - ${entry.buildingName} on ${new Date(entry.date).toLocaleDateString()} is now unassigned due to approved time off for ${request.cleaner_name}`,
                is_read: false,
                is_dismissed: false,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      } else if (request.request_type === 'single_shift' && request.shift_date) {
        const weekId = getWeekIdFromDate(new Date(request.shift_date));
        const schedule = getWeekSchedule(weekId, true);
        
        for (const entry of schedule) {
          if (entry.date === request.shift_date && 
              (entry.cleanerName === 'UNASSIGNED' || entry.cleanerNames?.includes('UNASSIGNED'))) {
            notifications.push({
              id: uuid.v4() as string,
              notification_type: 'unassigned_shift',
              shift_id: entry.id,
              shift_date: entry.date,
              building_name: entry.buildingName,
              client_name: entry.clientName,
              time_off_request_id: request.id,
              message: `Shift at ${entry.clientName} - ${entry.buildingName} on ${new Date(entry.date).toLocaleDateString()} is now unassigned due to approved time off for ${request.cleaner_name}`,
              is_read: false,
              is_dismissed: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('shift_notifications')
          .insert(notifications);

        if (error) throw error;
        
        console.log(`✅ Created ${notifications.length} unassigned shift notifications`);
      } else {
        console.log('No unassigned shifts found to create notifications for');
      }
      
      console.log('=== NOTIFICATION CREATION COMPLETED ===');
    } catch (error) {
      console.error('❌ Error creating notifications:', error);
    }
  }, [getWeekSchedule, getWeekIdFromDate]);

  const handleApproveRequest = async (request: TimeOffRequest) => {
    console.log('🔘 handleApproveRequest called for:', request.cleaner_name);
    Alert.alert(
      'Approve Time Off Request',
      `Approve time off for ${request.cleaner_name}?\n\nThis will unassign their shifts during the requested time period.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              console.log('=== APPROVING TIME OFF REQUEST ===');
              console.log('Request:', request);

              const { error: updateError } = await supabase
                .from('time_off_requests')
                .update({
                  status: 'approved',
                  reviewed_by: 'Supervisor',
                  reviewed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', request.id);

              if (updateError) throw updateError;

              console.log('✅ Time off request status updated in database');

              let unassignedCount = 0;

              if (request.request_type === 'date_range' && request.start_date && request.end_date) {
                unassignedCount = await unassignShiftsInDateRange(
                  request.cleaner_name,
                  request.start_date,
                  request.end_date
                );
              } else if (request.request_type === 'recurring_instances' && request.requested_dates) {
                unassignedCount = await unassignShiftsOnDates(
                  request.cleaner_name,
                  request.requested_dates,
                  request.recurring_shift_id
                );
              } else if (request.request_type === 'single_shift' && request.shift_date) {
                unassignedCount = await unassignShiftsOnDates(
                  request.cleaner_name,
                  [request.shift_date],
                  undefined
                );
              }

              await createUnassignedShiftNotifications(request, unassignedCount);

              console.log('🔄 Clearing all schedule caches and reloading data...');
              clearCaches();
              await reloadScheduleData();

              showToast(`Time off approved - ${unassignedCount} shift${unassignedCount !== 1 ? 's' : ''} unassigned`, 'success');
              await loadTimeOffRequests();
              
              console.log('✅ TIME OFF REQUEST APPROVAL COMPLETED ===');
            } catch (error) {
              console.error('❌ Error approving request:', error);
              showToast('Failed to approve request', 'error');
            }
          },
        },
      ]
    );
  };

  const handleDeclineRequest = (request: TimeOffRequest) => {
    setSelectedRequest(request);
    setDeclineReason('');
    setDeclineModalVisible(true);
  };

  const submitDecline = async () => {
    if (!selectedRequest) return;

    if (!declineReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for declining');
      return;
    }

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({
          status: 'declined',
          reviewed_by: 'Supervisor',
          reviewed_at: new Date().toISOString(),
          decline_reason: declineReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      showToast('Time off request declined', 'success');
      setDeclineModalVisible(false);
      setSelectedRequest(null);
      setDeclineReason('');
      await loadTimeOffRequests();
    } catch (error) {
      console.error('Error declining request:', error);
      showToast('Failed to decline request', 'error');
    }
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
    } else if (request.request_type === 'single_shift' && request.shift_date) {
      return new Date(request.shift_date).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    return 'N/A';
  };

  const renderRequest = (request: TimeOffRequest) => {
    const statusColor = getStatusColor(request.status);
    const statusIcon = getStatusIcon(request.status);
    const isPending = request.status === 'pending';

    return (
      <View key={request.id} style={[styles.requestCard, { borderLeftColor: statusColor }]}>
        <View style={styles.requestHeader}>
          <View style={styles.requestStatus}>
            <Icon name={statusIcon} size={20} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.cleanerName}>{request.cleaner_name}</Text>
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

        {isPending && (
          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.declineButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                console.log('🔘 Decline button pressed');
                handleDeclineRequest(request);
              }}
            >
              <Icon name="close-circle" size={20} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>Decline</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.approveButton,
                { backgroundColor: themeColor, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                console.log('🔘 Approve button pressed for:', request.cleaner_name);
                handleApproveRequest(request);
              }}
            >
              <Icon name="checkmark-circle" size={20} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>Approve</Text>
            </Pressable>
          </View>
        )}

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

      <View style={styles.filterBar}>
        {(['all', 'pending', 'approved', 'declined'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && { backgroundColor: themeColor }
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.emptyStateTitle}>No Requests</Text>
            <Text style={styles.emptyStateText}>
              {filterStatus === 'pending' 
                ? 'No pending time off requests'
                : `No ${filterStatus} time off requests`}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map(renderRequest)}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={declineModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: colors.danger }]}>
              <Text style={styles.modalTitle}>Decline Request</Text>
              <TouchableOpacity onPress={() => setDeclineModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textInverse} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Please provide a reason for declining this request:
              </Text>
              <TextInput
                style={styles.textArea}
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="Enter decline reason..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setDeclineModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Decline Request"
                onPress={submitDecline}
                style={[styles.modalButton, { backgroundColor: colors.danger }]}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
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
  filterBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  filterButtonText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
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
  cleanerName: {
    ...typography.bodyMedium,
    color: colors.text,
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '600',
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  textArea: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
