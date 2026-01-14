
import React, { memo, useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import PropTypes from 'prop-types';
import { colors, spacing, typography, commonStyles, buttonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import { logInventoryTransfer, type InventoryTransferItem } from '../../utils/inventoryTracking';
import { supabase } from '../../app/integrations/supabase/client';
import type { ClientBuilding } from '../../hooks/useClientData';

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  category: string;
  cost?: number;
}

interface BuildingGroup {
  id: string;
  client_name: string;
  group_name: string;
  description?: string;
  building_ids: string[];
  buildings: ClientBuilding[];
}

interface SendItemsModalProps {
  visible: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onSend: (itemIds: string[], quantities: number[]) => void;
  onSuccess?: () => void;
}

interface SelectedItem extends InventoryTransferItem {
  id: string;
  maxQuantity: number;
}

const SendItemsModal = memo<SendItemsModalProps>(({ visible, onClose, inventory, onSend, onSuccess }) => {
  console.log('SendItemsModal rendered');
  
  const [destination, setDestination] = useState('');
  const [destinationType, setDestinationType] = useState<'building' | 'group'>('building');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  
  const [buildings, setBuildings] = useState<ClientBuilding[]>([]);
  const [buildingGroups, setBuildingGroups] = useState<BuildingGroup[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  
  // State for collapsible sections - START EXPANDED BY DEFAULT
  const [expandedBuildingClients, setExpandedBuildingClients] = useState<Set<string>>(new Set());
  const [expandedGroupClients, setExpandedGroupClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadDestinations();
    } else {
      setDestination('');
      setDestinationType('building');
      setSelectedBuildingId(null);
      setSelectedGroupId(null);
      setSelectedItems([]);
      setNotes('');
      setSearchQuery('');
      setExpandedBuildingClients(new Set());
      setExpandedGroupClients(new Set());
    }
  }, [visible]);

  const loadDestinations = async () => {
    try {
      setLoadingDestinations(true);
      console.log('🔄 Loading buildings and groups for send items...');

      // Load buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('client_buildings')
        .select('*')
        .order('client_name', { ascending: true });

      if (buildingsError) {
        console.error('❌ Error loading buildings:', buildingsError);
      } else {
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
        console.log(`✅ Loaded ${buildingsList.length} buildings`);
        
        // Auto-expand all building clients
        const buildingClients = new Set(buildingsList.map(b => b.clientName));
        setExpandedBuildingClients(buildingClients);
      }

      // Load building groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('building_groups')
        .select('*')
        .order('client_name', { ascending: true });

      if (groupsError) {
        console.error('❌ Error loading building groups:', groupsError);
      } else {
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
        console.log('Building groups:', groupsWithBuildings);
        
        // Auto-expand all group clients
        const groupClients = new Set(groupsWithBuildings.map(g => g.client_name));
        setExpandedGroupClients(groupClients);
      }
    } catch (error) {
      console.error('❌ Failed to load destinations:', error);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    item.current_stock > 0 &&
    !selectedItems.some(selected => selected.id === item.id)
  );

  const addItem = (item: InventoryItem) => {
    const unitCost = item.cost || 0;
    const newItem: SelectedItem = {
      id: item.id,
      name: item.name,
      quantity: 1,
      unit: item.unit,
      maxQuantity: item.current_stock,
      unitCost: unitCost,
      totalCost: unitCost * 1,
    };
    setSelectedItems(prev => [...prev, newItem]);
    setSearchQuery('');
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, Math.min(quantity, item.maxQuantity));
        return {
          ...item,
          quantity: newQuantity,
          totalCost: (item.unitCost || 0) * newQuantity,
        };
      }
      return item;
    }));
  };

  const getDestinationName = () => {
    if (destinationType === 'building' && selectedBuildingId) {
      const building = buildings.find(b => b.id === selectedBuildingId);
      return building ? `${building.clientName} - ${building.buildingName}` : '';
    } else if (destinationType === 'group' && selectedGroupId) {
      const group = buildingGroups.find(g => g.id === selectedGroupId);
      return group ? `${group.client_name} - ${group.group_name} (${group.buildings.length} buildings)` : '';
    }
    return '';
  };

  const handleSendItems = async () => {
    const destinationName = getDestinationName();
    
    if (!destinationName.trim()) {
      Alert.alert('Error', 'Please select or enter a destination');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to send');
      return;
    }

    try {
      setSending(true);
      
      console.log('=== SENDING ITEMS ===');
      console.log('Destination Type:', destinationType);
      console.log('Destination:', destinationName);
      console.log('Selected items:', selectedItems);
      
      // Calculate total value
      const totalValue = selectedItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      
      await logInventoryTransfer({
        items: selectedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })),
        destination: destinationName,
        timestamp: new Date().toISOString(),
        transferredBy: 'Supervisor',
        notes: notes.trim() || undefined,
        totalValue: totalValue,
      });

      const itemIds = selectedItems.map(item => item.id);
      const quantities = selectedItems.map(item => item.quantity);
      
      console.log('Calling onSend with:', { itemIds, quantities });
      await onSend(itemIds, quantities);

      const itemSummary = selectedItems.map(item => `${item.quantity} ${item.name}`).join(', ');
      
      console.log('Items sent successfully, closing modal...');
      
      onClose();
      
      setTimeout(() => {
        Alert.alert(
          'Items Sent Successfully',
          `${itemSummary} have been sent to ${destinationName}`,
          [{ text: 'OK', onPress: () => onSuccess?.() }]
        );
      }, 300);

    } catch (error) {
      console.error('Failed to send items:', error);
      Alert.alert('Error', 'Failed to send items. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = selectedItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  // Group buildings by client
  const buildingsByClient = buildings.reduce((acc, building) => {
    if (!acc[building.clientName]) {
      acc[building.clientName] = [];
    }
    acc[building.clientName].push(building);
    return acc;
  }, {} as Record<string, ClientBuilding[]>);

  // Group building groups by client
  const groupsByClient = buildingGroups.reduce((acc, group) => {
    if (!acc[group.client_name]) {
      acc[group.client_name] = [];
    }
    acc[group.client_name].push(group);
    return acc;
  }, {} as Record<string, BuildingGroup[]>);

  const toggleBuildingClient = (clientName: string) => {
    setExpandedBuildingClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  };

  const toggleGroupClient = (clientName: string) => {
    setExpandedGroupClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
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
        ...(Platform.OS === 'web' && {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }),
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
          ...(Platform.OS === 'web' && {
            zIndex: 10000,
            position: 'relative' as any,
          }),
        }}>
          <View style={commonStyles.header}>
            <IconButton 
              icon="close" 
              onPress={onClose} 
              variant="white"
            />
            <Text style={commonStyles.headerTitle}>Send Items</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                Destination
              </Text>
              
              {/* Destination Type Selector */}
              <View style={[commonStyles.row, { gap: spacing.sm, marginBottom: spacing.md }]}>
                <TouchableOpacity
                  style={[
                    destinationType === 'building' ? buttonStyles.quickSelectButtonActive : buttonStyles.quickSelectButton,
                    { flex: 1, borderWidth: 0 }
                  ]}
                  onPress={() => {
                    setDestinationType('building');
                    setDestination('');
                    setSelectedGroupId(null);
                  }}
                >
                  <Icon
                    name="business"
                    size={16}
                    style={{
                      color: destinationType === 'building'
                        ? getContrastColor(colors.primary)
                        : getContrastColor(colors.background),
                      marginRight: spacing.xs
                    }}
                  />
                  <Text style={[
                    typography.caption,
                    {
                      color: destinationType === 'building'
                        ? getContrastColor(colors.primary)
                        : getContrastColor(colors.background),
                      fontWeight: destinationType === 'building' ? '700' : '500'
                    }
                  ]}>
                    Building
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    destinationType === 'group' ? buttonStyles.quickSelectButtonActive : buttonStyles.quickSelectButton,
                    { flex: 1, borderWidth: 0 }
                  ]}
                  onPress={() => {
                    setDestinationType('group');
                    setDestination('');
                    setSelectedBuildingId(null);
                  }}
                >
                  <Icon
                    name="albums"
                    size={16}
                    style={{
                      color: destinationType === 'group'
                        ? getContrastColor(colors.primary)
                        : getContrastColor(colors.background),
                      marginRight: spacing.xs
                    }}
                  />
                  <Text style={[
                    typography.caption,
                    {
                      color: destinationType === 'group'
                        ? getContrastColor(colors.primary)
                        : getContrastColor(colors.background),
                      fontWeight: destinationType === 'group' ? '700' : '500'
                    }
                  ]}>
                    Group
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Building Selector - Collapsible by Client */}
              {destinationType === 'building' && (
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  {Object.entries(buildingsByClient).map(([clientName, clientBuildings]) => {
                    const isExpanded = expandedBuildingClients.has(clientName);
                    return (
                      <View key={clientName} style={{ marginBottom: spacing.sm }}>
                        <TouchableOpacity
                          style={[
                            commonStyles.card,
                            { 
                              marginBottom: spacing.xs,
                              backgroundColor: colors.surface,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }
                          ]}
                          onPress={() => toggleBuildingClient(clientName)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Icon 
                              name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                              size={20} 
                              style={{ color: colors.primary, marginRight: spacing.sm }} 
                            />
                            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                              {clientName}
                            </Text>
                          </View>
                          <View style={{
                            backgroundColor: colors.primary + '20',
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            borderRadius: 12,
                          }}>
                            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                              {clientBuildings.length}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        
                        {isExpanded && clientBuildings.map(building => (
                          <TouchableOpacity
                            key={building.id}
                            style={[
                              commonStyles.card,
                              { 
                                marginBottom: spacing.xs,
                                marginLeft: spacing.lg,
                                backgroundColor: selectedBuildingId === building.id ? colors.primary + '20' : colors.surface,
                                borderWidth: selectedBuildingId === building.id ? 2 : 1,
                                borderColor: selectedBuildingId === building.id ? colors.primary : colors.border,
                              }
                            ]}
                            onPress={() => setSelectedBuildingId(building.id)}
                          >
                            <View style={[commonStyles.row, { alignItems: 'center' }]}>
                              <Icon 
                                name={selectedBuildingId === building.id ? 'radio-button-on' : 'radio-button-off'} 
                                size={20} 
                                style={{ color: selectedBuildingId === building.id ? colors.primary : colors.textSecondary, marginRight: spacing.sm }} 
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                  {building.buildingName}
                                </Text>
                                {building.address && (
                                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                                    {building.address}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                  {buildings.length === 0 && (
                    <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                      No buildings available
                    </Text>
                  )}
                </ScrollView>
              )}

              {/* Building Group Selector - Collapsible by Client */}
              {destinationType === 'group' && (
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  {Object.entries(groupsByClient).map(([clientName, clientGroups]) => {
                    const isExpanded = expandedGroupClients.has(clientName);
                    return (
                      <View key={clientName} style={{ marginBottom: spacing.sm }}>
                        <TouchableOpacity
                          style={[
                            commonStyles.card,
                            { 
                              marginBottom: spacing.xs,
                              backgroundColor: colors.surface,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }
                          ]}
                          onPress={() => toggleGroupClient(clientName)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Icon 
                              name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                              size={20} 
                              style={{ color: colors.primary, marginRight: spacing.sm }} 
                            />
                            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                              {clientName}
                            </Text>
                          </View>
                          <View style={{
                            backgroundColor: colors.primary + '20',
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            borderRadius: 12,
                          }}>
                            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                              {clientGroups.length} {clientGroups.length === 1 ? 'group' : 'groups'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        
                        {isExpanded && clientGroups.map(group => (
                          <TouchableOpacity
                            key={group.id}
                            style={[
                              commonStyles.card,
                              { 
                                marginBottom: spacing.xs,
                                marginLeft: spacing.lg,
                                backgroundColor: selectedGroupId === group.id ? colors.primary + '20' : colors.surface,
                                borderWidth: selectedGroupId === group.id ? 2 : 1,
                                borderColor: selectedGroupId === group.id ? colors.primary : colors.border,
                              }
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
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                  {group.group_name}
                                </Text>
                                {group.description && (
                                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                                    {group.description}
                                  </Text>
                                )}
                                <Text style={[typography.caption, { color: colors.primary, marginTop: spacing.xs }]}>
                                  {group.buildings.length} {group.buildings.length === 1 ? 'building' : 'buildings'}
                                </Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
                              {group.buildings.map(building => (
                                <View 
                                  key={building.id}
                                  style={{
                                    backgroundColor: colors.primary + '15',
                                    paddingHorizontal: spacing.sm,
                                    paddingVertical: spacing.xs,
                                    borderRadius: 12,
                                  }}
                                >
                                  <Text style={[typography.caption, { color: colors.primary, fontSize: 10 }]}>
                                    {building.buildingName}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                  {Object.keys(groupsByClient).length === 0 && (
                    <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                      No building groups available. Create groups in the Clients screen.
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>

            {selectedItems.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    Selected Items ({totalItems} total)
                  </Text>
                  <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>
                    ${totalValue.toFixed(2)}
                  </Text>
                </View>
                {selectedItems.map(item => (
                  <View key={item.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                    <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                          {item.name}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          ${(item.unitCost || 0).toFixed(2)} per {item.unit}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>
                          ${(item.totalCost || 0).toFixed(2)}
                        </Text>
                        <IconButton
                          icon="close"
                          onPress={() => removeItem(item.id)}
                          variant="secondary"
                          size="small"
                          style={{ backgroundColor: colors.danger, marginTop: spacing.xs }}
                        />
                      </View>
                    </View>
                    
                    <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                      <View style={[commonStyles.row, { alignItems: 'center', gap: spacing.sm }]}>
                        <IconButton
                          icon="remove"
                          onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                          variant="secondary"
                          size="small"
                          disabled={item.quantity <= 1}
                          style={{ backgroundColor: item.quantity <= 1 ? colors.backgroundAlt : colors.danger }}
                        />
                        
                        <Text style={[typography.body, { color: colors.text, minWidth: 60, textAlign: 'center' }]}>
                          {item.quantity} {item.unit}
                        </Text>
                        
                        <IconButton
                          icon="add"
                          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                          variant="secondary"
                          size="small"
                          disabled={item.quantity >= item.maxQuantity}
                          style={{ backgroundColor: item.quantity >= item.maxQuantity ? colors.backgroundAlt : colors.success }}
                        />
                      </View>
                      
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        Max: {item.maxQuantity} {item.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                Add Items
              </Text>
              
              <View style={[commonStyles.row, { position: 'relative', marginBottom: spacing.sm }]}>
                <Icon 
                  name="search" 
                  size={20} 
                  style={{ 
                    position: 'absolute', 
                    left: spacing.md, 
                    top: spacing.sm + 2,
                    zIndex: 1,
                    color: colors.textSecondary 
                  }} 
                />
                <TextInput
                  style={[
                    commonStyles.textInput,
                    { paddingLeft: spacing.xl + spacing.md, flex: 1 }
                  ]}
                  placeholder="Search inventory..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {searchQuery.length > 0 && (
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                  {filteredInventory.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[commonStyles.card, { marginBottom: spacing.sm }]}
                      onPress={() => addItem(item)}
                    >
                      <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                            {item.name}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>
                            Available: {item.current_stock} {item.unit} • ${(item.cost || 0).toFixed(2)} per {item.unit}
                          </Text>
                        </View>
                        <IconButton
                          icon="add-circle"
                          onPress={() => addItem(item)}
                          variant="secondary"
                          style={{ backgroundColor: colors.success }}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {filteredInventory.length === 0 && (
                    <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                      No available items found
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                Notes (Optional)
              </Text>
              <TextInput
                style={[commonStyles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add any additional notes about this transfer..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            <Button
              text={sending ? 'Sending...' : `Send ${totalItems} Item${totalItems !== 1 ? 's' : ''} ($${totalValue.toFixed(2)})`}
              onPress={handleSendItems}
              disabled={sending || !getDestinationName().trim() || selectedItems.length === 0}
              variant="primary"
              style={{ marginBottom: spacing.lg }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

SendItemsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  inventory: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    current_stock: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    cost: PropTypes.number,
  }).isRequired).isRequired,
  onSend: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

SendItemsModal.displayName = 'SendItemsModal';

export default SendItemsModal;
