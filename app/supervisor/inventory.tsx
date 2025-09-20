
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles, colors, spacing, typography, buttonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import IconButton from '../../components/IconButton';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import AnimatedCard from '../../components/AnimatedCard';
import SendItemsModal from '../../components/inventory/SendItemsModal';
import TransferHistoryModal from '../../components/inventory/TransferHistoryModal';

interface InventoryItem {
  id: string;
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastUpdated: Date;
  location: string;
  cost: number;
  supplier: string;
  autoReorderEnabled: boolean;
  reorderQuantity: number;
}

interface RestockRequest {
  id: string;
  itemId: string;
  itemName: string;
  requestedBy: string;
  requestedAt: Date;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'ordered' | 'delivered';
  notes: string;
}

export default function SupervisorInventoryScreen() {
  console.log('SupervisorInventoryScreen rendered');

  const { toast, showToast, hideToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSendItemsModal, setShowSendItemsModal] = useState(false);
  const [showTransferHistoryModal, setShowTransferHistoryModal] = useState(false);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'All-Purpose Cleaner',
      category: 'cleaning-supplies',
      currentStock: 8,
      minStock: 15,
      maxStock: 50,
      unit: 'bottles',
      lastUpdated: new Date(),
      location: 'Storage Room A',
      cost: 12.99,
      supplier: 'CleanCorp Supplies',
      autoReorderEnabled: true,
      reorderQuantity: 25,
    },
    {
      id: '2',
      name: 'Vacuum Cleaner',
      category: 'equipment',
      currentStock: 3,
      minStock: 2,
      maxStock: 5,
      unit: 'units',
      lastUpdated: new Date(),
      location: 'Equipment Room',
      cost: 299.99,
      supplier: 'Equipment Plus',
      autoReorderEnabled: false,
      reorderQuantity: 1,
    },
    {
      id: '3',
      name: 'Disinfectant Spray',
      category: 'cleaning-supplies',
      currentStock: 12,
      minStock: 12,
      maxStock: 40,
      unit: 'bottles',
      lastUpdated: new Date(),
      location: 'Storage Room A',
      cost: 8.99,
      supplier: 'CleanCorp Supplies',
      autoReorderEnabled: true,
      reorderQuantity: 20,
    },
    {
      id: '4',
      name: 'Safety Gloves',
      category: 'safety',
      currentStock: 15,
      minStock: 20,
      maxStock: 100,
      unit: 'pairs',
      lastUpdated: new Date(),
      location: 'Safety Cabinet',
      cost: 2.50,
      supplier: 'Safety First Co',
      autoReorderEnabled: true,
      reorderQuantity: 50,
    },
    {
      id: '5',
      name: 'Microfiber Cloths',
      category: 'cleaning-supplies',
      currentStock: 45,
      minStock: 30,
      maxStock: 200,
      unit: 'pieces',
      lastUpdated: new Date(),
      location: 'Storage Room B',
      cost: 1.25,
      supplier: 'Textile Solutions',
      autoReorderEnabled: true,
      reorderQuantity: 100,
    },
    {
      id: '6',
      name: 'Toilet Paper',
      category: 'cleaning-supplies',
      currentStock: 24,
      minStock: 20,
      maxStock: 100,
      unit: 'rolls',
      lastUpdated: new Date(),
      location: 'Storage Room A',
      cost: 1.50,
      supplier: 'Paper Products Inc',
      autoReorderEnabled: true,
      reorderQuantity: 50,
    },
  ]);

  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([
    {
      id: '1',
      itemId: '1',
      itemName: 'All-Purpose Cleaner',
      requestedBy: 'John Smith',
      requestedAt: new Date(Date.now() - 3600000), // 1 hour ago
      quantity: 25,
      priority: 'high',
      status: 'pending',
      notes: 'Running critically low, needed for tomorrow&apos;s jobs',
    },
    {
      id: '2',
      itemId: '3',
      itemName: 'Disinfectant Spray',
      requestedBy: 'Sarah Johnson',
      requestedAt: new Date(Date.now() - 7200000), // 2 hours ago
      quantity: 20,
      priority: 'medium',
      status: 'approved',
      notes: 'Regular restock needed',
    },
  ]);

  const categories = [
    { id: 'all', name: 'All Items', icon: 'apps' },
    { id: 'cleaning-supplies', name: 'Cleaning Supplies', icon: 'flask' },
    { id: 'equipment', name: 'Equipment', icon: 'construct' },
    { id: 'safety', name: 'Safety', icon: 'shield-checkmark' },
  ];

  // Check for low stock items and auto-reorder
  useEffect(() => {
    const checkLowStock = () => {
      const lowStockItems = inventory.filter(item => 
        item.currentStock <= item.minStock && item.autoReorderEnabled
      );
      
      lowStockItems.forEach(item => {
        console.log(`Auto-reorder triggered for ${item.name}`);
        // In a real app, this would trigger an API call to place an order
      });

      if (lowStockItems.length > 0) {
        showToast(`${lowStockItems.length} items need restocking`, 'warning');
      }
    };

    checkLowStock();
  }, [inventory, showToast]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.currentStock / item.maxStock) * 100;
    if (item.currentStock <= item.minStock) {
      return { status: 'critical', color: colors.danger, text: 'Critical', percentage };
    } else if (item.currentStock <= item.minStock * 1.5) {
      return { status: 'low', color: colors.warning, text: 'Low Stock', percentage };
    } else if (percentage >= 80) {
      return { status: 'full', color: colors.success, text: 'Well Stocked', percentage };
    } else {
      return { status: 'good', color: colors.success, text: 'Good Stock', percentage };
    }
  };

  const approveRestockRequest = (requestId: string) => {
    setRestockRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'approved' as const }
        : req
    ));
    showToast('Restock request approved', 'success');
  };

  const rejectRestockRequest = (requestId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this restock request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            setRestockRequests(prev => prev.filter(req => req.id !== requestId));
            showToast('Restock request rejected', 'info');
          }
        },
      ]
    );
  };

  const updateStock = (itemId: string, newStock: number) => {
    setInventory(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, currentStock: Math.max(0, newStock), lastUpdated: new Date() }
        : item
    ));
    console.log(`Stock updated for item ${itemId}: ${newStock}`);
  };

  const handleItemsSent = (itemIds: string[], quantities: number[]) => {
    setInventory(prev => prev.map(item => {
      const index = itemIds.indexOf(item.id);
      if (index !== -1) {
        const newStock = Math.max(0, item.currentStock - quantities[index]);
        console.log(`Reducing stock for ${item.name}: ${item.currentStock} -> ${newStock}`);
        return { ...item, currentStock: newStock, lastUpdated: new Date() };
      }
      return item;
    }));
    showToast('Items sent successfully', 'success');
  };

  const toggleAutoReorder = (itemId: string) => {
    setInventory(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, autoReorderEnabled: !item.autoReorderEnabled }
        : item
    ));
    showToast('Auto-reorder settings updated', 'success');
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || 'cube';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'approved': return colors.primary;
      case 'ordered': return colors.info;
      case 'delivered': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
  const pendingRequests = restockRequests.filter(req => req.status === 'pending').length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);

  return (
    <View style={commonStyles.container}>
      <Toast {...toast} onHide={hideToast} />
      
      <View style={commonStyles.header}>
        <IconButton 
          icon="arrow-back" 
          onPress={() => router.back()} 
          variant="white"
        />
        <Text style={commonStyles.headerTitle}>Inventory Management</Text>
        <IconButton 
          icon="notifications" 
          onPress={() => setShowRequestsModal(true)} 
          variant="primary"
          style={{ position: 'relative' }}
        >
          {pendingRequests > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: colors.danger,
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={[typography.small, { color: colors.background, fontSize: 10 }]}>
                {pendingRequests}
              </Text>
            </View>
          )}
        </IconButton>
      </View>

      <View style={commonStyles.content}>
        {/* Overview Cards */}
        <AnimatedCard index={0}>
          <View style={[commonStyles.row, { justifyContent: 'space-around', marginBottom: spacing.md }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.text }]}>{inventory.length}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Total Items</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h2, { color: lowStockCount > 0 ? colors.danger : colors.success }]}>
                {lowStockCount}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Low Stock</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.primary }]}>${totalValue.toFixed(0)}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Total Value</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Action Buttons */}
        <View style={[commonStyles.row, { gap: spacing.sm, marginBottom: spacing.md }]}>
          <Button
            text="Send Items"
            onPress={() => setShowSendItemsModal(true)}
            style={{ flex: 1 }}
            variant="primary"
            icon="send"
          />
          <Button
            text="Transfer History"
            onPress={() => setShowTransferHistoryModal(true)}
            style={{ flex: 1 }}
            variant="secondary"
            icon="time"
          />
        </View>

        {/* Search and Filter */}
        <View style={{ marginBottom: spacing.md }}>
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
            <IconButton
              icon="settings"
              onPress={() => setShowSettingsModal(true)}
              variant="white"
              style={{ marginLeft: spacing.sm }}
            />
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
          >
            <View style={[commonStyles.row, { gap: spacing.sm, paddingHorizontal: spacing.xs }]}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    selectedCategory === category.id ? buttonStyles.filterButtonActive : buttonStyles.filterButton
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <View style={commonStyles.row}>
                    <Icon 
                      name={category.icon as any} 
                      size={16} 
                      style={{ 
                        color: selectedCategory === category.id 
                          ? colors.background 
                          : colors.text,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[
                      typography.caption,
                      { 
                        color: selectedCategory === category.id 
                          ? colors.background 
                          : colors.text,
                        fontWeight: selectedCategory === category.id ? '700' : '600'
                      }
                    ]}>
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Inventory List */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredInventory.map((item, index) => {
            const stockStatus = getStockStatus(item);
            return (
              <AnimatedCard key={item.id} index={index + 1}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedItem(item);
                    setShowRestockModal(true);
                  }}
                >
                  <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                    <View style={[commonStyles.row, { flex: 1 }]}>
                      <Icon 
                        name={getCategoryIcon(item.category) as any} 
                        size={24} 
                        style={{ color: colors.primary, marginRight: spacing.md }} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                          {item.name}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          {item.location} • {item.supplier}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      commonStyles.statusBadge,
                      { backgroundColor: stockStatus.color + '20', borderColor: stockStatus.color }
                    ]}>
                      <Text style={[
                        typography.small,
                        { color: stockStatus.color, fontWeight: '600' }
                      ]}>
                        {stockStatus.text}
                      </Text>
                    </View>
                  </View>

                  {/* Stock Progress Bar */}
                  <View style={{ marginBottom: spacing.sm }}>
                    <View style={{
                      height: 6,
                      backgroundColor: colors.backgroundAlt,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        height: '100%',
                        width: `${Math.min(stockStatus.percentage, 100)}%`,
                        backgroundColor: stockStatus.color,
                      }} />
                    </View>
                  </View>

                  <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
                    <View>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Current Stock</Text>
                      <Text style={[typography.h3, { color: colors.text }]}>
                        {item.currentStock} {item.unit}
                      </Text>
                    </View>
                    <View>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Min Stock</Text>
                      <Text style={[typography.body, { color: colors.textSecondary }]}>
                        {item.minStock} {item.unit}
                      </Text>
                    </View>
                    <View>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Value</Text>
                      <Text style={[typography.body, { color: colors.text }]}>
                        ${(item.currentStock * item.cost).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                    <View style={[commonStyles.row, { gap: spacing.sm }]}>
                      <IconButton
                        icon="remove"
                        onPress={() => updateStock(item.id, item.currentStock - 1)}
                        variant="primary"
                        size="small"
                      />

                      <IconButton
                        icon="add"
                        onPress={() => updateStock(item.id, item.currentStock + 1)}
                        variant="primary"
                        size="small"
                      />
                    </View>

                    <View style={[commonStyles.row, { alignItems: 'center' }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginRight: spacing.sm }]}>
                        Auto-reorder
                      </Text>
                      <TouchableOpacity
                        style={{
                          width: 40,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: item.autoReorderEnabled ? colors.success : colors.backgroundAlt,
                          justifyContent: 'center',
                          paddingHorizontal: 2,
                          borderWidth: 2,
                          borderColor: item.autoReorderEnabled ? colors.success : colors.border,
                        }}
                        onPress={() => toggleAutoReorder(item.id)}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: colors.background,
                          alignSelf: item.autoReorderEnabled ? 'flex-end' : 'flex-start',
                        }} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                    Last updated: {item.lastUpdated.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </AnimatedCard>
            );
          })}

          {filteredInventory.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Icon name="cube" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No items found
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                Try adjusting your search or filter
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Send Items Modal */}
      <SendItemsModal
        visible={showSendItemsModal}
        onClose={() => setShowSendItemsModal(false)}
        inventory={inventory}
        onItemsSent={handleItemsSent}
        onSuccess={() => {
          // Refresh any data if needed
          console.log('Items sent successfully');
        }}
      />

      {/* Transfer History Modal */}
      <TransferHistoryModal
        visible={showTransferHistoryModal}
        onClose={() => setShowTransferHistoryModal(false)}
        onRefresh={() => {
          // Refresh inventory data if needed
          console.log('Transfer history refreshed');
        }}
      />

      {/* Restock Requests Modal */}
      <Modal
        visible={showRequestsModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowRequestsModal(false)}
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
              onPress={() => setShowRequestsModal(false)}
            />
          )}
          <View style={{
            width: Platform.OS === 'ios' ? '100%' : '90%',
            maxWidth: Platform.OS === 'ios' ? undefined : 600,
            maxHeight: Platform.OS === 'ios' ? '100%' : '80%',
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
                onPress={() => setShowRequestsModal(false)} 
                variant="white"
              />
              <Text style={commonStyles.headerTitle}>Restock Requests</Text>
              <View style={{ width: 44 }} />
            </View>
            <ScrollView style={commonStyles.content}>
              {restockRequests.map(request => (
                <View key={request.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                  <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                      {request.itemName}
                    </Text>
                    <View style={[
                      commonStyles.statusBadge,
                      { backgroundColor: getPriorityColor(request.priority) + '20', borderColor: getPriorityColor(request.priority) }
                    ]}>
                      <Text style={[
                        typography.small,
                        { color: getPriorityColor(request.priority), fontWeight: '600' }
                      ]}>
                        {request.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                    Requested by {request.requestedBy} • {request.requestedAt.toLocaleString()}
                  </Text>

                  <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                    Quantity: {request.quantity}
                  </Text>

                  {request.notes && (
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                      Notes: {request.notes}
                    </Text>
                  )}

                  <View style={[
                    commonStyles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) + '20', marginBottom: spacing.md, borderColor: getStatusColor(request.status) }
                  ]}>
                    <Text style={[
                      typography.small,
                      { color: getStatusColor(request.status), fontWeight: '600' }
                    ]}>
                      {request.status.toUpperCase()}
                    </Text>
                  </View>

                  {request.status === 'pending' && (
                    <View style={[commonStyles.row, { gap: spacing.sm }]}>
                      <Button
                        text="Approve"
                        onPress={() => approveRestockRequest(request.id)}
                        style={{ flex: 1 }}
                        variant="success"
                      />
                      <Button
                        text="Reject"
                        onPress={() => rejectRestockRequest(request.id)}
                        style={{ flex: 1 }}
                        variant="danger"
                      />
                    </View>
                  )}
                </View>
              ))}

              {restockRequests.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
                  <Icon name="checkmark-circle" size={48} style={{ color: colors.success, marginBottom: spacing.md }} />
                  <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                    No pending restock requests
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
