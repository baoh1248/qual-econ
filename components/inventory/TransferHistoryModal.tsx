
import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import FilterDropdown from '../FilterDropdown';
import { getInventoryTransferLogs, deleteInventoryTransferLog, updateInventoryTransferLog, formatTransferSummary, formatCurrency, type InventoryTransfer, type InventoryTransferItem } from '../../utils/inventoryTracking';
import PropTypes from 'prop-types';

interface TransferHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const TransferHistoryModal = memo<TransferHistoryModalProps>(({ visible, onClose, onRefresh }) => {
  console.log('TransferHistoryModal rendered');
  
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<InventoryTransfer | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<InventoryTransfer | null>(null);
  const [editDestination, setEditDestination] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSentFrom, setEditSentFrom] = useState('');
  const [editItems, setEditItems] = useState<InventoryTransferItem[]>([]);

  useEffect(() => {
    if (visible) {
      loadTransfers();
    }
  }, [visible]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const logs = await getInventoryTransferLogs();
      const sortedLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransfers(sortedLogs);
    } catch (error) {
      console.error('Failed to load transfer history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract client names from building destinations (format: "Client - Building")
  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    transfers.forEach(t => {
      const parts = t.destination.split(' - ');
      if (parts.length > 1) {
        clients.add(parts[0]);
      }
    });
    return Array.from(clients).sort();
  }, [transfers]);

  // Get unique buildings (filtered by selected client if any)
  const uniqueBuildings = useMemo(() => {
    let filteredTransfers = transfers;
    if (selectedClient) {
      filteredTransfers = transfers.filter(t => t.destination.startsWith(selectedClient + ' - '));
    }
    const buildings = new Set(filteredTransfers.map(t => t.destination));
    return Array.from(buildings).sort();
  }, [transfers, selectedClient]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(transfer => {
      // Filter by client
      if (selectedClient) {
        if (!transfer.destination.toLowerCase().includes(selectedClient.toLowerCase())) {
          return false;
        }
      }

      // Filter by building
      if (selectedBuilding) {
        if (!transfer.destination.toLowerCase().includes(selectedBuilding.toLowerCase())) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery !== '') {
        const matchesSearch = 
          transfer.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
          transfer.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          transfer.transferredBy.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) {
          return false;
        }
      }
      
      return true;
    });
  }, [transfers, selectedClient, selectedBuilding, searchQuery]);

  const handleDeleteTransfer = (transfer: InventoryTransfer) => {
    console.log('Delete transfer requested:', transfer.id);
    
    if (Platform.OS === 'web') {
      setTransferToDelete(transfer);
      setShowDeleteConfirmModal(true);
    } else {
      Alert.alert(
        'Delete Transfer Record',
        'Are you sure you want to delete this transfer record?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => confirmDeleteTransfer(transfer.id)
          }
        ]
      );
    }
  };

  const confirmDeleteTransfer = async (transferId: string) => {
    try {
      console.log('Confirming delete for transfer:', transferId);
      await deleteInventoryTransferLog(transferId);
      await loadTransfers();
      onRefresh?.();
      console.log('Transfer deleted successfully');
    } catch (error) {
      console.error('Failed to delete transfer:', error);
    } finally {
      setShowDeleteConfirmModal(false);
      setTransferToDelete(null);
    }
  };

  const handleEditTransfer = (transfer: InventoryTransfer) => {
    setEditingTransfer(transfer);
    setEditDestination(transfer.destination);
    setEditSource(transfer.source || '');
    setEditOrderNumber(transfer.orderNumber || '');
    setEditNotes(transfer.notes || '');
    setEditSentFrom(transfer.sentFrom || '');
    setEditItems(transfer.items.map(item => ({ ...item })));
    setShowEditModal(true);
  };

  const updateEditItem = (index: number, field: keyof InventoryTransferItem, value: any) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitCost') {
      newItems[index].totalCost = (newItems[index].quantity || 0) * (newItems[index].unitCost || 0);
    }
    setEditItems(newItems);
  };

  const handleSaveEdit = async () => {
    if (!editingTransfer) return;

    try {
      const updates: Partial<Omit<InventoryTransfer, 'id'>> = {
        items: editItems,
        destination: editDestination,
        notes: editNotes || undefined,
        sentFrom: editSentFrom || undefined,
      };

      if (editingTransfer.type === 'incoming') {
        updates.source = editSource;
        updates.orderNumber = editOrderNumber;
      }

      await updateInventoryTransferLog(editingTransfer.id, updates);
      await loadTransfers();
      onRefresh?.();
      setShowEditModal(false);
      setEditingTransfer(null);
    } catch (error) {
      console.error('Failed to update transfer:', error);
    }
  };

  const clearFilters = () => {
    setSelectedClient('');
    setSelectedBuilding('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedClient !== '' || selectedBuilding !== '' || searchQuery !== '';

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedClient !== '') count++;
    if (selectedBuilding !== '') count++;
    return count;
  }, [selectedClient, selectedBuilding]);

  const getClientCount = (clientName: string) => {
    if (!clientName) return transfers.length;
    return transfers.filter(t => t.destination.startsWith(clientName + ' - ')).length;
  };

  const getBuildingCount = (buildingName: string) => {
    if (!buildingName) return uniqueBuildings.length;
    return transfers.filter(t => t.destination === buildingName).length;
  };

  const groupTransfersByDate = (transfers: InventoryTransfer[]) => {
    const groups: { [key: string]: InventoryTransfer[] } = {};
    
    transfers.forEach(transfer => {
      const date = new Date(transfer.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transfer);
    });
    
    return groups;
  };

  const groupedTransfers = groupTransfersByDate(filteredTransfers);

  // Calculate total value of all transfers
  const totalTransferValue = useMemo(() => {
    return transfers.reduce((sum, transfer) => sum + (transfer.totalValue || 0), 0);
  }, [transfers]);

  return (
    <>
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
            maxWidth: Platform.OS === 'ios' ? undefined : 700,
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
              <Text style={commonStyles.headerTitle}>Transfer History</Text>
              <IconButton 
                icon="refresh" 
                onPress={loadTransfers} 
                variant="white"
              />
            </View>

            <View style={commonStyles.content}>
              {/* Stats Summary Card */}
              <View style={[styles.statsCard, { marginBottom: spacing.lg }]}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Icon name="swap-horizontal" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{transfers.length}</Text>
                    <Text style={styles.statLabel}>Total Transfers</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
                    <Icon name="today" size={24} color={colors.success} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>
                      {transfers.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString()).length}
                    </Text>
                    <Text style={styles.statLabel}>Today</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.info + '20' }]}>
                    <Icon name="cash" size={24} color={colors.info} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{formatCurrency(totalTransferValue)}</Text>
                    <Text style={styles.statLabel}>Total Value</Text>
                  </View>
                </View>
              </View>

              {/* Filter Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                  <View style={styles.filterHeaderLeft}>
                    <Icon name="filter" size={20} color={colors.primary} />
                    <Text style={styles.filterHeaderText}>Filters</Text>
                    {activeFilterCount > 0 && (
                      <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                      </View>
                    )}
                  </View>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                      <Icon name="close-circle" size={16} color={colors.danger} />
                      <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Enhanced Filter Dropdowns */}
                <View style={styles.filterGrid}>
                  <View style={styles.dropdownWrapper}>
                    <FilterDropdown
                      label="Client"
                      value={selectedClient}
                      onValueChange={(value) => {
                        setSelectedClient(value);
                        setSelectedBuilding('');
                      }}
                      options={uniqueClients}
                      placeholder="All Clients or type..."
                      themeColor={colors.primary}
                      allowManualInput={true}
                      showCount={true}
                      getOptionCount={getClientCount}
                    />
                  </View>

                  <View style={styles.dropdownWrapper}>
                    <FilterDropdown
                      label="Building"
                      value={selectedBuilding}
                      onValueChange={setSelectedBuilding}
                      options={uniqueBuildings}
                      placeholder="All Buildings or type..."
                      themeColor={colors.primary}
                      allowManualInput={true}
                      showCount={true}
                      getOptionCount={getBuildingCount}
                    />
                  </View>
                </View>
              </View>

              {/* Transfer List */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.transferList}>
                {Object.keys(groupedTransfers).length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
                      <Icon name="archive" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyStateTitle}>
                      {hasActiveFilters ? 'No Matching Transfers' : 'No Transfer History'}
                    </Text>
                    <Text style={styles.emptyStateText}>
                      {hasActiveFilters
                        ? 'Try adjusting your filters to see more results'
                        : 'Transfer records will appear here once items are sent'
                      }
                    </Text>
                    {hasActiveFilters && (
                      <TouchableOpacity onPress={clearFilters} style={styles.emptyStateButton}>
                        <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  Object.keys(groupedTransfers).map(dateString => (
                    <View key={dateString} style={styles.dateGroup}>
                      <View style={styles.dateHeader}>
                        <Icon name="calendar" size={16} color={colors.primary} />
                        <Text style={styles.dateHeaderText}>
                          {new Date(dateString).toLocaleDateString([], { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <View style={[styles.dateBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.dateBadgeText, { color: colors.primary }]}>
                            {groupedTransfers[dateString].length}
                          </Text>
                        </View>
                      </View>
                      
                      {groupedTransfers[dateString].map((transfer) => (
                        <View key={transfer.id} style={styles.transferCard}>
                          <View style={styles.transferHeader}>
                            <View style={styles.transferHeaderLeft}>
                              <View style={[styles.transferIcon, { backgroundColor: colors.primary + '15' }]}>
                                <Icon name="send" size={20} color={colors.primary} />
                              </View>
                              <View style={styles.transferInfo}>
                                <Text style={styles.transferDestination}>{transfer.destination}</Text>
                                <View style={styles.transferMeta}>
                                  <Icon name="time" size={14} color={colors.textSecondary} />
                                  <Text style={styles.transferMetaText}>
                                    {new Date(transfer.timestamp).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </Text>
                                  <View style={styles.metaDivider} />
                                  <Icon name="person" size={14} color={colors.textSecondary} />
                                  <Text style={styles.transferMetaText}>{transfer.transferredBy}</Text>
                                </View>
                                {transfer.sentFrom && (
                                  <View style={[styles.transferMeta, { marginTop: spacing.xs }]}>
                                    <Icon name="location" size={14} color={colors.primary} />
                                    <Text style={[styles.transferMetaText, { color: colors.primary, fontWeight: '600' }]}>
                                      From: {transfer.sentFrom}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                              <IconButton
                                icon="create"
                                onPress={() => handleEditTransfer(transfer)}
                                variant="secondary"
                                size="small"
                                style={{ backgroundColor: colors.primary + '15' }}
                              />
                              <IconButton
                                icon="trash"
                                onPress={() => handleDeleteTransfer(transfer)}
                                variant="secondary"
                                size="small"
                                style={{ backgroundColor: colors.danger + '15' }}
                              />
                            </View>
                          </View>

                          <View style={styles.transferItems}>
                            <Text style={styles.transferItemsLabel}>Items Transferred:</Text>
                            {transfer.items.map((item, itemIndex) => (
                              <View key={itemIndex} style={styles.transferItem}>
                                <View style={[styles.itemBullet, { backgroundColor: colors.primary }]} />
                                <View style={{ flex: 1 }}>
                                  <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                                    <Text style={styles.transferItemText}>
                                      <Text style={styles.transferItemQuantity}>{item.quantity} {item.unit}</Text>
                                      {' of '}
                                      <Text style={styles.transferItemName}>{item.name}</Text>
                                    </Text>
                                    {item.totalCost !== undefined && (
                                      <Text style={[styles.transferItemCost, { color: colors.primary }]}>
                                        {formatCurrency(item.totalCost)}
                                      </Text>
                                    )}
                                  </View>
                                  {item.unitCost !== undefined && (
                                    <Text style={[styles.transferItemUnitCost, { color: colors.textSecondary }]}>
                                      {formatCurrency(item.unitCost)} per {item.unit}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>

                          {transfer.totalValue !== undefined && transfer.totalValue > 0 && (
                            <View style={[styles.transferTotalValue, { backgroundColor: colors.success + '10', borderLeftColor: colors.success }]}>
                              <Icon name="cash" size={16} color={colors.success} />
                              <Text style={[styles.transferTotalValueText, { color: colors.success }]}>
                                Total Value: {formatCurrency(transfer.totalValue)}
                              </Text>
                            </View>
                          )}

                          {transfer.notes && (
                            <View style={styles.transferNotes}>
                              <Icon name="document-text" size={14} color={colors.textSecondary} />
                              <Text style={styles.transferNotesText}>{transfer.notes}</Text>
                            </View>
                          )}

                          <View style={[styles.transferSummary, { borderLeftColor: colors.primary }]}>
                            <Icon name="information-circle" size={16} color={colors.primary} />
                            <Text style={[styles.transferSummaryText, { color: colors.primary }]}>
                              {formatTransferSummary(transfer)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={[styles.deleteModalIcon, { backgroundColor: colors.danger + '20' }]}>
                <Icon name="trash" size={32} color={colors.danger} />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Transfer Record</Text>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete this transfer record to &quot;{transferToDelete?.destination}&quot;? This action cannot be undone.
              </Text>
            </View>
            
            <View style={styles.deleteModalActions}>
              <Button
                text="Cancel"
                onPress={() => {
                  setShowDeleteConfirmModal(false);
                  setTransferToDelete(null);
                }}
                style={{ flex: 1 }}
                variant="secondary"
              />
              <Button
                text="Delete"
                onPress={() => transferToDelete && confirmDeleteTransfer(transferToDelete.id)}
                style={{ flex: 1 }}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Transfer Modal */}
      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeaderRow}>
              <Icon name="create" size={24} color={colors.primary} />
              <Text style={styles.editModalTitle}>
                Edit {editingTransfer?.type === 'incoming' ? 'Supply Received' : 'Transfer'}
              </Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingTransfer(null); }}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalScroll} showsVerticalScrollIndicator={false}>
              {/* Sent From */}
              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Sent From</Text>
                <TextInput
                  style={styles.editInput}
                  value={editSentFrom}
                  onChangeText={setEditSentFrom}
                  placeholder="e.g. Company Warehouse, Client C - Building D"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Destination */}
              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Destination</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDestination}
                  onChangeText={setEditDestination}
                  placeholder="Enter destination"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {editingTransfer?.type === 'incoming' && (
                <>
                  <View style={styles.editFormGroup}>
                    <Text style={styles.editLabel}>Supplier / Source</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editSource}
                      onChangeText={setEditSource}
                      placeholder="Enter supplier name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.editFormGroup}>
                    <Text style={styles.editLabel}>Order / Invoice Number</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editOrderNumber}
                      onChangeText={setEditOrderNumber}
                      placeholder="Enter order number"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </>
              )}

              {/* Items */}
              <Text style={styles.editSectionTitle}>Items</Text>
              {editItems.map((item, index) => (
                <View key={index} style={styles.editItemCard}>
                  <View style={styles.editFormGroup}>
                    <Text style={styles.editLabel}>Item Name</Text>
                    <TextInput
                      style={styles.editInput}
                      value={item.name}
                      onChangeText={(text) => updateEditItem(index, 'name', text)}
                      placeholder="Item name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.editItemRow}>
                    <View style={[styles.editFormGroup, { flex: 1 }]}>
                      <Text style={styles.editLabel}>Quantity</Text>
                      <TextInput
                        style={styles.editInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          updateEditItem(index, 'quantity', num);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={[styles.editFormGroup, { flex: 1 }]}>
                      <Text style={styles.editLabel}>Unit</Text>
                      <TextInput
                        style={styles.editInput}
                        value={item.unit}
                        onChangeText={(text) => updateEditItem(index, 'unit', text)}
                        placeholder="units"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={[styles.editFormGroup, { flex: 1 }]}>
                      <Text style={styles.editLabel}>Unit Cost ($)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={(item.unitCost || 0).toString()}
                        onChangeText={(text) => {
                          const num = parseFloat(text) || 0;
                          updateEditItem(index, 'unitCost', num);
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.editItemTotal}>
                    <Text style={styles.editItemTotalLabel}>Total:</Text>
                    <Text style={styles.editItemTotalValue}>
                      {formatCurrency((item.quantity || 0) * (item.unitCost || 0))}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Notes */}
              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Notes</Text>
                <TextInput
                  style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Add notes (optional)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.editModalActions}>
              <Button
                text="Cancel"
                onPress={() => { setShowEditModal(false); setEditingTransfer(null); }}
                style={{ flex: 1 }}
                variant="secondary"
              />
              <Button
                text="Save Changes"
                onPress={handleSaveEdit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 28,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  filterSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterHeaderText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  filterBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...typography.small,
    fontSize: 11,
    color: colors.textInverse,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
  filterGrid: {
    gap: spacing.lg,
  },
  dropdownWrapper: {
    zIndex: 1,
  },
  transferList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyStateButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '700',
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateHeaderText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  dateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '700',
  },
  transferCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  transferHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.sm,
  },
  transferIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferInfo: {
    flex: 1,
  },
  transferDestination: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  transferMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transferMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  transferItems: {
    marginBottom: spacing.md,
  },
  transferItemsLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  transferItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  transferItemQuantity: {
    fontWeight: '700',
    color: colors.primary,
  },
  transferItemName: {
    fontWeight: '600',
  },
  transferItemCost: {
    ...typography.body,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  transferItemUnitCost: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  transferTotalValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  transferTotalValueText: {
    ...typography.bodyMedium,
    flex: 1,
    fontWeight: '700',
  },
  transferNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  transferNotesText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  transferSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '08',
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  transferSummaryText: {
    ...typography.small,
    flex: 1,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  deleteModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  deleteModalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  deleteModalText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  editModalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 550,
    maxHeight: '85%',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  editModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editModalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
    marginLeft: spacing.sm,
  },
  editModalScroll: {
    flex: 1,
  },
  editFormGroup: {
    marginBottom: spacing.md,
  },
  editLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  editInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editSectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  editItemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editItemRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editItemTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  editItemTotalLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  editItemTotalValue: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

TransferHistoryModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
};

TransferHistoryModal.displayName = 'TransferHistoryModal';

export default TransferHistoryModal;
