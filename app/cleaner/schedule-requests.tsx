
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import AnimatedCard from '../../components/AnimatedCard';
import Button from '../../components/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
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
}

interface UpcomingShift {
  id: string;
  client_name: string;
  building_name: string;
  date: string;
  start_time: string;
  hours: number;
}

interface Coworker {
  id: string;
  name: string;
}

const REQUEST_TYPES = [
  { value: 'shift_swap', label: 'Shift Swap', icon: 'swap-horizontal', description: 'Swap a shift with a coworker' },
  { value: 'schedule_change', label: 'Schedule Change', icon: 'create-outline', description: 'Request a change to your schedule' },
  { value: 'extra_shift', label: 'Extra Shift', icon: 'add-circle-outline', description: 'Request additional work hours' },
] as const;

export default function ScheduleRequestsScreen() {
  const { themeColor } = useTheme();
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [cleanerId, setCleanerId] = useState('');
  const [cleanerName, setCleanerName] = useState('');
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [requestType, setRequestType] = useState<'shift_swap' | 'schedule_change' | 'extra_shift'>('schedule_change');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [swapWith, setSwapWith] = useState<string>('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: cleaner } = await supabase
        .from('cleaners')
        .select('id, name')
        .eq('email', session.user.email)
        .eq('is_active', true)
        .single();

      if (!cleaner) return;
      setCleanerId(cleaner.id);
      setCleanerName(cleaner.name);

      // Load existing requests
      const { data: reqs } = await supabase
        .from('schedule_requests')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setRequests(reqs || []);

      // Load upcoming shifts for this cleaner
      const today = new Date().toISOString().split('T')[0];
      const { data: shifts } = await supabase
        .from('schedule_entries')
        .select('id, client_name, building_name, date, start_time, hours')
        .or(`cleaner_name.ilike.%${cleaner.name}%,cleaner_names.cs.{${cleaner.name}}`)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(14);

      setUpcomingShifts(shifts || []);

      // Load coworkers
      const { data: workers } = await supabase
        .from('cleaners')
        .select('id, name')
        .eq('is_active', true)
        .neq('id', cleaner.id)
        .order('name');

      setCoworkers(workers || []);
    } catch (err) {
      console.error('Failed to load schedule requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const resetForm = () => {
    setRequestType('schedule_change');
    setSelectedShift('');
    setSwapWith('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast('Please add a description', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const shift = upcomingShifts.find(s => s.id === selectedShift);

      const { error } = await supabase
        .from('schedule_requests')
        .insert({
          cleaner_id: cleanerId,
          cleaner_name: cleanerName,
          request_type: requestType,
          description: description.trim(),
          target_date: shift?.date || null,
          swap_with_cleaner: swapWith || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      showToast('Request submitted successfully', 'success');
      setShowNewRequest(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Failed to submit request:', err);
      showToast(err?.message?.includes('schedule_requests') ? 'Schedule requests feature is being set up' : 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('schedule_requests').delete().eq('id', requestId);
            showToast('Request cancelled', 'success');
            loadData();
          } catch (err) {
            showToast('Failed to cancel request', 'error');
          }
        },
      },
    ]);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { bg: colors.success + '15', text: colors.success, icon: 'checkmark-circle' };
      case 'declined': return { bg: colors.danger + '15', text: colors.danger, icon: 'close-circle' };
      default: return { bg: colors.warning + '15', text: colors.warning, icon: 'time' };
    }
  };

  const getTypeIcon = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type)?.icon || 'help-circle';
  };

  return (
    <View style={commonStyles.container}>
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
        </View>
        <CompanyLogo size={40} />
      </View>

      <ScrollView
        style={commonStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={themeColor} />}
      >
        {/* Info Card */}
        <AnimatedCard delay={0}>
          <View style={styles.infoCard}>
            <Icon name="information-circle" size={20} color={themeColor} />
            <Text style={styles.infoText}>
              Submit requests for shift swaps, schedule changes, or extra shifts. Your supervisor will review and respond.
            </Text>
          </View>
        </AnimatedCard>

        {/* Request History */}
        <View style={styles.sectionHeader}>
          <Icon name="document-text-outline" size={22} color={themeColor} />
          <Text style={styles.sectionTitle}>My Requests</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        ) : requests.length === 0 ? (
          <AnimatedCard delay={100}>
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Requests Yet</Text>
              <Text style={styles.emptyText}>
                Tap the + button to submit a schedule request.
              </Text>
            </View>
          </AnimatedCard>
        ) : (
          requests.map((req, index) => {
            const status = getStatusStyle(req.status);
            return (
              <AnimatedCard key={req.id} delay={100 + index * 50}>
                <View style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={[styles.requestTypeIcon, { backgroundColor: themeColor + '15' }]}>
                      <Icon name={getTypeIcon(req.request_type)} size={20} color={themeColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestType}>
                        {REQUEST_TYPES.find(t => t.value === req.request_type)?.label || req.request_type}
                      </Text>
                      <Text style={styles.requestDate}>
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Icon name={status.icon} size={14} color={status.text} />
                      <Text style={[styles.statusText, { color: status.text }]}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestDescription}>{req.description}</Text>
                  {req.target_date && (
                    <View style={styles.requestDetail}>
                      <Icon name="calendar" size={14} color={colors.textTertiary} />
                      <Text style={styles.requestDetailText}>
                        For: {new Date(req.target_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  {req.swap_with_cleaner && (
                    <View style={styles.requestDetail}>
                      <Icon name="people" size={14} color={colors.textTertiary} />
                      <Text style={styles.requestDetailText}>Swap with: {req.swap_with_cleaner}</Text>
                    </View>
                  )}
                  {req.supervisor_notes && (
                    <View style={[styles.supervisorNote, { borderLeftColor: status.text }]}>
                      <Text style={styles.supervisorNoteLabel}>Supervisor:</Text>
                      <Text style={styles.supervisorNoteText}>{req.supervisor_notes}</Text>
                    </View>
                  )}
                  {req.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancel(req.id)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </AnimatedCard>
            );
          })
        )}

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColor }]}
        onPress={() => { resetForm(); setShowNewRequest(true); }}
      >
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New Request Modal */}
      <Modal visible={showNewRequest} animationType="slide" transparent={false} onRequestClose={() => setShowNewRequest(false)}>
        <View style={commonStyles.container}>
          <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => setShowNewRequest(false)}
                style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>
                New Request
              </Text>
            </View>
          </View>

          <ScrollView style={commonStyles.content}>
            {/* Request Type */}
            <Text style={styles.formLabel}>Request Type</Text>
            <View style={styles.typeOptions}>
              {REQUEST_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeOption, requestType === type.value && { borderColor: themeColor, backgroundColor: themeColor + '08' }]}
                  onPress={() => setRequestType(type.value as any)}
                >
                  <Icon name={type.icon} size={24} color={requestType === type.value ? themeColor : colors.textSecondary} />
                  <Text style={[styles.typeOptionLabel, requestType === type.value && { color: themeColor }]}>{type.label}</Text>
                  <Text style={styles.typeOptionDesc}>{type.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Shift Selection (for swaps) */}
            {(requestType === 'shift_swap' || requestType === 'schedule_change') && upcomingShifts.length > 0 && (
              <>
                <Text style={styles.formLabel}>Select Shift</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shiftScroll}>
                  {upcomingShifts.map(shift => (
                    <TouchableOpacity
                      key={shift.id}
                      style={[styles.shiftChip, selectedShift === shift.id && { borderColor: themeColor, backgroundColor: themeColor + '10' }]}
                      onPress={() => setSelectedShift(shift.id)}
                    >
                      <Text style={[styles.shiftChipDate, selectedShift === shift.id && { color: themeColor }]}>
                        {new Date(shift.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.shiftChipBuilding}>{shift.building_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Swap With (for shift swaps) */}
            {requestType === 'shift_swap' && (
              <>
                <Text style={styles.formLabel}>Swap With</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shiftScroll}>
                  {coworkers.map(cw => (
                    <TouchableOpacity
                      key={cw.id}
                      style={[styles.shiftChip, swapWith === cw.name && { borderColor: themeColor, backgroundColor: themeColor + '10' }]}
                      onPress={() => setSwapWith(cw.name)}
                    >
                      <Icon name="person" size={16} color={swapWith === cw.name ? themeColor : colors.textSecondary} />
                      <Text style={[styles.shiftChipDate, swapWith === cw.name && { color: themeColor }]}>{cw.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Description */}
            <Text style={styles.formLabel}>Details</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your request..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={{ marginTop: spacing.xl }}>
              <Button
                title={submitting ? 'Submitting...' : 'Submit Request'}
                onPress={handleSubmit}
                variant="primary"
                disabled={submitting || !description.trim()}
              />
            </View>

            <View style={{ height: spacing.xxxl }} />
          </ScrollView>
        </View>
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
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
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
    gap: spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestType: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  requestDate: {
    ...typography.small,
    color: colors.textTertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  requestDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: 52,
  },
  requestDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 52,
  },
  requestDetailText: {
    ...typography.small,
    color: colors.textTertiary,
  },
  supervisorNote: {
    marginLeft: 52,
    marginTop: spacing.xs,
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
  },
  supervisorNoteLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  supervisorNoteText: {
    ...typography.body,
    color: colors.text,
  },
  cancelBtn: {
    marginLeft: 52,
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  formLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  typeOptions: {
    gap: spacing.sm,
  },
  typeOption: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  typeOptionLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  typeOptionDesc: {
    ...typography.small,
    color: colors.textSecondary,
  },
  shiftScroll: {
    marginBottom: spacing.sm,
  },
  shiftChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginRight: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 100,
  },
  shiftChipDate: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  shiftChipBuilding: {
    ...typography.small,
    color: colors.textSecondary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 100,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
