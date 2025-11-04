
import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import FilterDropdown from '../FilterDropdown';
import { getInventoryTransferLogs, deleteInventoryTransferLog, formatTransferSummary, type InventoryTransfer } from '../../utils/inventoryTracking';
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

  const clearFilters = () => {
    setSelectedClient('');
    setSelectedBuilding('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedClient !== '' || selectedBuilding !== '' || searchQuery !== '';

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
              <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
                <View style={[commonStyles.row, { justifyContent: 'space-around' }]}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[typography.h2, { color: colors.primary }]}>{transfers.length}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Total Transfers</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[typography.h2, { color: colors.success }]}>
                      {transfers.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString()).length}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Today</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[typography.h2, { color: colors.info }]}>
                      {uniqueBuildings.length}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Buildings</Text>
                  </View>
                </View>
              </View>

              {/* Filter Section */}
              <View style={{ marginBottom: spacing.md }}>
                <View style={[commonStyles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }]}>
                  <Text style={[typography.caption, { 
                    color: colors.textSecondary, 
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }]}>
                    Filters
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={clearFilters}>
                      <Text style={[typography.small, { color: colors.danger, fontWeight: '600' }]}>
                        Clear All
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Enhanced Filter Dropdowns with Manual Input */}
                <View style={{ marginBottom: spacing.sm }}>
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

              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.keys(groupedTransfers).length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
                    <Icon name="archive" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                      {hasActiveFilters
                        ? 'No transfers match your filters'
                        : 'No transfer history found'
                      }
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                      {hasActiveFilters
                        ? 'Try adjusting your filters or clear them to see all transfers'
                        : 'Transfer records will appear here once items are sent'
                      }
                    </Text>
                    {hasActiveFilters && (
                      <TouchableOpacity onPress={clearFilters} style={{ marginTop: spacing.md }}>
                        <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                          Clear Filters
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  Object.keys(groupedTransfers).map(dateString => (
                    <View key={dateString} style={{ marginBottom: spacing.lg }}>
                      <Text style={[typography.body, { 
                        color: colors.text, 
                        fontWeight: '600', 
                        marginBottom: spacing.sm,
                        paddingHorizontal: spacing.sm 
                      }]}>
                        {new Date(dateString).toLocaleDateString([], { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                      
                      {groupedTransfers[dateString].map((transfer) => (
                        <View key={transfer.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                            <View style={[commonStyles.row, { flex: 1 }]}>
                              <Icon 
                                name="send" 
                                size={20} 
                                style={{ color: colors.primary, marginRight: spacing.sm }} 
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                  {transfer.destination}
                                </Text>
                                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                                  {new Date(transfer.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} • by {transfer.transferredBy}
                                </Text>
                              </View>
                            </View>
                            <IconButton
                              icon="trash"
                              onPress={() => handleDeleteTransfer(transfer)}
                              variant="secondary"
                              size="small"
                              style={{ backgroundColor: colors.danger }}
                            />
                          </View>

                          <View style={{ marginBottom: spacing.sm }}>
                            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                              Items Transferred:
                            </Text>
                            {transfer.items.map((item, itemIndex) => (
                              <View key={itemIndex} style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                                <View style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: colors.primary,
                                  marginRight: spacing.sm,
                                  marginTop: 6,
                                }} />
                                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                                  {item.quantity} {item.unit} of {item.name}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {transfer.notes && (
                            <View style={{
                              backgroundColor: colors.backgroundAlt,
                              padding: spacing.sm,
                              borderRadius: 8,
                              marginBottom: spacing.sm,
                            }}>
                              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                Notes:
                              </Text>
                              <Text style={[typography.body, { color: colors.text }]}>
                                {transfer.notes}
                              </Text>
                            </View>
                          )}

                          <View style={{
                            backgroundColor: colors.primary + '10',
                            padding: spacing.sm,
                            borderRadius: 8,
                            borderLeftWidth: 3,
                            borderLeftColor: colors.primary,
                          }}>
                            <Text style={[typography.caption, { color: colors.primary, fontStyle: 'italic' }]}>
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

      <Modal
        visible={showDeleteConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: spacing.lg,
            width: '100%',
            maxWidth: 400,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.danger + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}>
                <Icon name="trash" size={32} style={{ color: colors.danger }} />
              </View>
              <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
                Delete Transfer Record
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Are you sure you want to delete this transfer record to &quot;{transferToDelete?.destination}&quot;? This action cannot be undone.
              </Text>
            </View>
            
            <View style={[commonStyles.row, { gap: spacing.sm }]}>
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
    </>
  );
});

TransferHistoryModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
};

TransferHistoryModal.displayName = 'TransferHistoryModal';

export default TransferHistoryModal;
