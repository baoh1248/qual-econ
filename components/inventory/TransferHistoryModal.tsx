
import React, { memo, useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import { getInventoryTransferLogs, deleteInventoryTransferLog, formatTransferSummary, type InventoryTransfer } from '../../utils/inventoryTracking';

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

  useEffect(() => {
    if (visible) {
      loadTransfers();
    }
  }, [visible]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const logs = await getInventoryTransferLogs();
      // Sort by timestamp descending (newest first)
      const sortedLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransfers(sortedLogs);
    } catch (error) {
      console.error('Failed to load transfer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransfer = (transferId: string) => {
    Alert.alert(
      'Delete Transfer Record',
      'Are you sure you want to delete this transfer record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryTransferLog(transferId);
              await loadTransfers();
              onRefresh?.();
            } catch (error) {
              console.error('Failed to delete transfer:', error);
            }
          }
        }
      ]
    );
  };

  const filteredTransfers = transfers.filter(transfer => 
    transfer.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    transfer.transferredBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {/* Summary Stats */}
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
                    {new Set(transfers.map(t => t.destination)).size}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Locations</Text>
                </View>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.keys(groupedTransfers).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
                  <Icon name="archive" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
                  <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                    No transfer history found
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Transfer records will appear here once items are sent
                  </Text>
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
                    
                    {groupedTransfers[dateString].map((transfer, index) => (
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
                            onPress={() => handleDeleteTransfer(transfer.id)}
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
  );
});

TransferHistoryModal.displayName = 'TransferHistoryModal';

export default TransferHistoryModal;
