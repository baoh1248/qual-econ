
import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import IconButton from '../IconButton';
import DateInput from '../DateInput';
import { supabase } from '../../app/integrations/supabase/client';
import type { Client, ClientBuilding, Cleaner } from '../../hooks/useClientData';
import { useTimeOffRequests } from '../../hooks/useTimeOffRequests';
import uuid from 'react-native-uuid';

interface BuildingGroup {
  id: string;
  client_name: string;
  group_name: string;
  description?: string;
  building_ids: string[];
  buildings: ClientBuilding[];
}

interface BuildingGroupScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  cleaners: Cleaner[];
  clients: Client[];
  onScheduleCreated: () => void;
  weekId: string;
  day: string;
  date: string;
}

const BuildingGroupScheduleModal = memo<BuildingGroupScheduleModalProps>(({ 
  visible, 
  onClose, 
  cleaners,
  clients,
  onScheduleCreated,
  weekId,
  day,
  date
}) => {
  console.log('BuildingGroupScheduleModal rendered with date:', date);

  const { fetchApprovedTimeOff, isCleanerOnTimeOff, getCleanerTimeOffDetails } = useTimeOffRequests();

  const [buildingGroups, setBuildingGroups] = useState<BuildingGroup[]>([]);
  const [buildings, setBuildings] = useState<ClientBuilding[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [hours, setHours] = useState('8');
  const [startTime, setStartTime] = useState('09:00');
  const [scheduleDate, setScheduleDate] = useState(() => {
    // Ensure date is in YYYY-MM-DD format
    try {
      if (date) {
        return date.split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date().toISOString().split('T')[0];
    }
  });
  const [paymentType, setPaymentType] = useState<'hourly' | 'flat_rate'>('hourly');
  const [flatRateAmount, setFlatRateAmount] = useState('100');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHoursDropdown, setShowHoursDropdown] = useState(false);

  // Generate hours options (0.5-12 in 30-minute increments)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => ((i + 1) * 0.5).toString());

  useEffect(() => {
    if (visible) {
      loadBuildingGroups();
      // Reset date when modal opens - ensure proper format
      const formattedDate = date ? date.split('T')[0] : new Date().toISOString().split('T')[0];
      setScheduleDate(formattedDate);
      console.log('Modal opened with formatted date:', formattedDate);
    } else {
      // Reset form
      setSelectedGroupId(null);
      setSelectedCleaners([]);
      setHours('8');
      setStartTime('09:00');
      const formattedDate = date ? date.split('T')[0] : new Date().toISOString().split('T')[0];
      setScheduleDate(formattedDate);
      setPaymentType('hourly');
      setFlatRateAmount('100');
      setNotes('');
    }
  }, [visible, date]);

  // Fetch approved time off requests when modal opens or date changes
  useEffect(() => {
    if (visible && scheduleDate) {
      // Fetch time off for a week range around the selected date
      const dateObj = new Date(scheduleDate);
      const startDate = new Date(dateObj);
      startDate.setDate(dateObj.getDate() - 7);
      const endDate = new Date(dateObj);
      endDate.setDate(dateObj.getDate() + 7);

      fetchApprovedTimeOff(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    }
  }, [visible, scheduleDate, fetchApprovedTimeOff]);

  const loadBuildingGroups = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading building groups for schedule...');

      // Load buildings first
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('client_buildings')
        .select('*')
        .order('client_name', { ascending: true });

      if (buildingsError) {
        console.error('❌ Error loading buildings:', buildingsError);
        throw buildingsError;
      }

      const buildingsList: ClientBuilding[] = (buildingsData || []).map(row => ({
        id: row.id,
        clientName: row.client_name,
        buildingName: row.building_name,
        name: row.building_name,
        address: row.address || undefined,
        security: row.security || undefined,
        securityLevel: row.security_level as 'low' | 'medium' | 'high',
        securityInfo: row.security || undefined,
        isActive: true,
        priority: 'medium',
      }));
      setBuildings(buildingsList);

      // Load building groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('building_groups')
        .select('*')
        .order('client_name', { ascending: true});

      if (groupsError) {
        console.error('❌ Error loading building groups:', groupsError);
        throw groupsError;
      }

      const groupsWithBuildings: BuildingGroup[] = [];
      
      for (const group of groupsData || []) {
        const { data: membersData, error: membersError } = await supabase
          .from('building_group_members')
          .select('building_id')
          .eq('group_id', group.id);

        if (membersError) {
          console.error('❌ Error loading group members:', membersError);
          continue;
        }

        const buildingIds = membersData?.map(m => m.building_id) || [];
        const groupBuildings = buildingsList.filter(b => buildingIds.includes(b.id));

        groupsWithBuildings.push({
          id: group.id,
          client_name: group.client_name,
          group_name: group.group_name,
          description: group.description || undefined,
          building_ids: buildingIds,
          buildings: groupBuildings,
        });
      }

      setBuildingGroups(groupsWithBuildings);
      console.log(`✅ Loaded ${groupsWithBuildings.length} building groups`);
    } catch (error) {
      console.error('❌ Failed to load building groups:', error);
      Alert.alert('Error', 'Failed to load building groups');
    } finally {
      setLoading(false);
    }
  };

  const toggleCleanerSelection = (cleanerName: string) => {
    if (selectedCleaners.includes(cleanerName)) {
      if (selectedCleaners.length > 1) {
        setSelectedCleaners(selectedCleaners.filter(name => name !== cleanerName));
      }
    } else {
      setSelectedCleaners([...selectedCleaners, cleanerName]);
    }
  };

  // Group building groups by client
  const groupsByClient = useMemo(() => {
    return buildingGroups.reduce((acc, group) => {
      if (!acc[group.client_name]) {
        acc[group.client_name] = [];
      }
      acc[group.client_name].push(group);
      return acc;
    }, {} as Record<string, BuildingGroup[]>);
  }, [buildingGroups]);

  const handleScheduleGroup = async () => {
    if (!selectedGroupId) {
      Alert.alert('Error', 'Please select a building group');
      return;
    }

    if (selectedCleaners.length === 0) {
      Alert.alert('Error', 'Please select at least one cleaner');
      return;
    }

    if (!scheduleDate) {
      Alert.alert('Error', 'Please enter a valid date');
      return;
    }

    const selectedGroup = buildingGroups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) {
      Alert.alert('Error', 'Selected group not found');
      return;
    }

    if (selectedGroup.buildings.length === 0) {
      Alert.alert('Error', 'Selected group has no buildings');
      return;
    }

    try {
      setSaving(true);
      console.log('🔄 Creating schedule entries for building group:', selectedGroup.group_name);
      console.log('Using date:', scheduleDate);

      const hoursNum = parseFloat(hours) || 8;
      const cleanerIds = selectedCleaners.map(name => {
        const cleaner = cleaners.find(c => c.name === name);
        return cleaner?.id || '';
      }).filter(id => id);

      // Calculate end time
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const endHour = startHour + Math.floor(hoursNum);
      const endMinute = startMinute + ((hoursNum % 1) * 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(Math.floor(endMinute)).padStart(2, '0')}`;

      // Calculate payment
      let hourlyRate = 15;
      let flatRate = parseFloat(flatRateAmount) || 100;
      
      if (paymentType === 'hourly' && selectedCleaners.length > 0) {
        const cleaner = cleaners.find(c => c.name === selectedCleaners[0]);
        hourlyRate = cleaner?.defaultHourlyRate || 15;
      }

      // Parse the date to get the day of week - ensure proper format
      const dateObj = new Date(scheduleDate + 'T00:00:00');
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
      
      console.log('Date object:', dateObj);
      console.log('Day of week:', dayOfWeek);

      // Create schedule entries for each building in the group
      const scheduleEntries = selectedGroup.buildings.map(building => ({
        id: uuid.v4() as string,
        client_name: building.clientName,
        building_name: building.buildingName,
        cleaner_name: selectedCleaners[0], // Primary cleaner
        cleaner_names: selectedCleaners,
        cleaner_ids: cleanerIds,
        hours: hoursNum,
        day: dayOfWeek,
        date: scheduleDate, // Store in YYYY-MM-DD format
        start_time: startTime,
        end_time: endTime,
        status: 'scheduled',
        week_id: weekId,
        notes: notes.trim() || `Scheduled as part of ${selectedGroup.group_name}`,
        priority: 'medium',
        is_recurring: false,
        payment_type: paymentType,
        flat_rate_amount: paymentType === 'flat_rate' ? flatRate : 0,
        hourly_rate: paymentType === 'hourly' ? hourlyRate : 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      console.log(`Creating ${scheduleEntries.length} schedule entries...`);
      console.log('Sample entry:', scheduleEntries[0]);

      // Check for existing entries to prevent duplicates
      const { data: existingEntries, error: checkError } = await supabase
        .from('schedule_entries')
        .select('id, building_name, date')
        .eq('week_id', weekId)
        .eq('date', scheduleDate)
        .in('building_name', selectedGroup.buildings.map(b => b.buildingName));

      if (checkError) {
        console.error('❌ Error checking existing entries:', checkError);
        throw checkError;
      }

      // Filter out entries that already exist
      const existingBuildingDates = new Set(
        (existingEntries || []).map(e => `${e.building_name}-${e.date}`)
      );

      const newEntries = scheduleEntries.filter(entry => 
        !existingBuildingDates.has(`${entry.building_name}-${entry.date}`)
      );

      if (newEntries.length === 0) {
        console.log('⚠️ All entries already exist, skipping insert');
        Alert.alert(
          'Already Scheduled',
          'All buildings in this group are already scheduled for this date.',
          [{ text: 'OK', onPress: onClose }]
        );
        return;
      }

      console.log(`Inserting ${newEntries.length} new entries (${scheduleEntries.length - newEntries.length} already exist)`);

      const { error } = await supabase
        .from('schedule_entries')
        .insert(newEntries);

      if (error) {
        console.error('❌ Error creating schedule entries:', error);
        throw error;
      }

      console.log('✅ Schedule entries created successfully');
      
      Alert.alert(
        'Success',
        `Created ${newEntries.length} schedule entries for ${selectedGroup.group_name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onScheduleCreated();
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Failed to create schedule entries:', error);
      Alert.alert('Error', 'Failed to create schedule entries');
    } finally {
      setSaving(false);
    }
  };

  const selectedGroup = buildingGroups.find(g => g.id === selectedGroupId);

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  };

  const getSecurityLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return 'shield-checkmark';
      case 'medium': return 'shield-half';
      case 'low': return 'shield-outline';
      default: return 'shield-outline';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.5)',
        justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
        alignItems: Platform.OS === 'ios' ? 'stretch' : 'center',
      }}>
        {Platform.OS !== 'ios' && (
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }} 
            activeOpacity={1} 
            onPress={onClose}
          />
        )}
        <View style={{
          width: Platform.OS === 'ios' ? '100%' : '90%',
          maxWidth: Platform.OS === 'ios' ? undefined : 600,
          maxHeight: Platform.OS === 'ios' ? '100%' : '85%',
          backgroundColor: colors.background,
          borderRadius: Platform.OS === 'ios' ? 0 : 16,
          overflow: 'hidden',
        }}>
          <View style={commonStyles.header}>
            <IconButton 
              icon="close" 
              onPress={onClose} 
              variant="white"
            />
            <Text style={commonStyles.headerTitle}>Schedule Building Group</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              <Icon name="information-circle" size={20} style={{ color: colors.primary }} />
              <Text style={styles.infoText}>
                Schedule all buildings in a group at once. This will create individual schedule entries for each building.
              </Text>
            </View>

            {/* Building Group Selection */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>Select Building Group *</Text>
              <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                {Object.keys(groupsByClient).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="albums-outline" size={48} style={{ color: colors.textSecondary }} />
                    <Text style={styles.emptyStateText}>
                      No building groups available.
                      {'\n'}Create groups in the Clients screen.
                    </Text>
                  </View>
                ) : (
                  Object.entries(groupsByClient).map(([clientName, clientGroups]) => (
                    <View key={clientName} style={{ marginBottom: spacing.md }}>
                      <Text style={styles.clientHeader}>{clientName}</Text>
                      {clientGroups.map(group => (
                        <TouchableOpacity
                          key={group.id}
                          style={[
                            styles.groupCard,
                            selectedGroupId === group.id && styles.groupCardSelected,
                          ]}
                          onPress={() => setSelectedGroupId(group.id)}
                        >
                          <View style={[commonStyles.row, { alignItems: 'center', marginBottom: spacing.xs }]}>
                            <Icon 
                              name={selectedGroupId === group.id ? 'radio-button-on' : 'radio-button-off'} 
                              size={20} 
                              style={{ color: selectedGroupId === group.id ? colors.primary : colors.textSecondary, marginRight: spacing.sm }} 
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.groupName, selectedGroupId === group.id && { color: colors.primary }]}>
                                {group.group_name}
                              </Text>
                              {group.description && (
                                <Text style={styles.groupDescription}>{group.description}</Text>
                              )}
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs, marginLeft: 28 }}>
                            {group.buildings.map(building => (
                              <View 
                                key={building.id}
                                style={styles.buildingChip}
                              >
                                <Text style={styles.buildingChipText}>
                                  {building.buildingName}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Selected Group Summary */}
            {selectedGroup && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Selected Group</Text>
                <Text style={styles.summaryValue}>{selectedGroup.group_name}</Text>
                <Text style={styles.summaryLabel}>
                  {selectedGroup.buildings.length} building{selectedGroup.buildings.length !== 1 ? 's' : ''} will be scheduled
                </Text>
              </View>
            )}

            {/* Date Field with Calendar */}
            <DateInput
              label="Date"
              value={scheduleDate}
              onChangeText={setScheduleDate}
              placeholder="YYYY-MM-DD"
              required
              themeColor={colors.primary}
            />

            {/* Cleaner Selection */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>Select Cleaners *</Text>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {cleaners.filter(c => c.isActive).map(cleaner => {
                  const isSelected = selectedCleaners.includes(cleaner.name);
                  const isOnTimeOff = scheduleDate ? isCleanerOnTimeOff(cleaner.name, scheduleDate) : false;
                  const timeOffDetails = isOnTimeOff && scheduleDate ? getCleanerTimeOffDetails(cleaner.name, scheduleDate) : null;
                  const canAssign = !isOnTimeOff;

                  return (
                    <TouchableOpacity
                      key={cleaner.id}
                      style={[
                        styles.cleanerCard,
                        isSelected && styles.cleanerCardSelected,
                        !canAssign && styles.cleanerCardDisabled,
                      ]}
                      onPress={() => canAssign && toggleCleanerSelection(cleaner.name)}
                      disabled={!canAssign}
                    >
                      <Icon
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={24}
                        style={{
                          color: !canAssign ? colors.textSecondary + '50' : (isSelected ? colors.primary : colors.textSecondary),
                          marginRight: spacing.sm
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                          <Text style={[
                            styles.cleanerName,
                            isSelected && { color: colors.primary },
                            !canAssign && { color: colors.textSecondary, opacity: 0.5 }
                          ]}>
                            {cleaner.name}
                          </Text>
                          {isOnTimeOff && (
                            <View style={[styles.timeOffBadge, { backgroundColor: colors.warning + '20' }]}>
                              <Icon name="calendar" size={10} style={{ color: colors.warning }} />
                              <Text style={[styles.timeOffBadgeText, { color: colors.warning }]}>
                                Time Off
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[
                          styles.cleanerInfo,
                          !canAssign && { opacity: 0.5 }
                        ]}>
                          {cleaner.employeeId} • {cleaner.securityLevel.toUpperCase()} Security
                          {cleaner.defaultHourlyRate && ` • $${cleaner.defaultHourlyRate.toFixed(2)}/hr`}
                        </Text>
                        {isOnTimeOff && timeOffDetails && (
                          <Text style={[styles.timeOffReason, { color: colors.warning }]}>
                            ⛱️ {timeOffDetails.reason}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Schedule Details */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>Hours *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowHoursDropdown(!showHoursDropdown)}
              >
                <Text style={[styles.inputText, !hours && styles.placeholderText]}>
                  {hours || '8'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showHoursDropdown && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdown} nestedScrollEnabled>
                    {hoursOptions.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[styles.dropdownItem, hours === hour && styles.dropdownItemSelected]}
                        onPress={() => {
                          setHours(hour);
                          setShowHoursDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownText, hours === hour && styles.dropdownTextSelected]}>
                          {hour} {parseFloat(hour) === 1 ? 'hour' : 'hours'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.closeDropdownButton}
                    onPress={() => setShowHoursDropdown(false)}
                  >
                    <Text style={styles.closeDropdownText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00"
                placeholderTextColor={colors.textSecondary}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>

            {/* Payment Type */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>Payment Type *</Text>
              <View style={[commonStyles.row, { gap: spacing.sm }]}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'hourly' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('hourly')}
                >
                  <Icon 
                    name="time" 
                    size={16} 
                    style={{ 
                      color: paymentType === 'hourly' ? colors.background : colors.primary,
                      marginRight: spacing.xs 
                    }} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'hourly' && styles.paymentTypeTextActive,
                  ]}>
                    Hourly
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'flat_rate' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('flat_rate')}
                >
                  <Icon 
                    name="cash" 
                    size={16} 
                    style={{ 
                      color: paymentType === 'flat_rate' ? colors.background : colors.success,
                      marginRight: spacing.xs 
                    }} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'flat_rate' && styles.paymentTypeTextActive,
                  ]}>
                    Flat Rate
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {paymentType === 'flat_rate' && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={styles.label}>Flat Rate Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100.00"
                  placeholderTextColor={colors.textSecondary}
                  value={flatRateAmount}
                  onChangeText={setFlatRateAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Notes */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add any notes about this schedule..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            <Button
              text={saving ? 'Creating Schedule...' : 'Schedule Group'}
              onPress={handleScheduleGroup}
              disabled={saving || !selectedGroupId || selectedCleaners.length === 0}
              variant="primary"
              style={{ marginBottom: spacing.lg }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  clientHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  groupCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  groupName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  groupDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  buildingChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  buildingChipText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  summaryTitle: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.success,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cleanerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cleanerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  cleanerCardDisabled: {
    opacity: 0.5,
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  cleanerInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeOffBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  timeOffReason: {
    ...typography.caption,
    marginTop: 2,
    fontStyle: 'italic',
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
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentTypeText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  paymentTypeTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
});

BuildingGroupScheduleModal.displayName = 'BuildingGroupScheduleModal';

export default BuildingGroupScheduleModal;
