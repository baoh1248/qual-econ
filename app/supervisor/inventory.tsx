
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import TransferHistoryModal from '../../components/inventory/TransferHistoryModal';
import CompanyLogo from '../../components/CompanyLogo';
import SendItemsModal from '../../components/inventory/SendItemsModal';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { commonStyles, colors, spacing, typography, buttonStyles, getContrastColor } from '../../styles/commonStyles';

interface InventoryItem {
  id: string;
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  location: string;
  cost: number;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: number;
  created_at?: string;
  updated_at?: string;
}

interface RestockRequest {
  id: string;
  item_id: string;
  item_name: string;
  requested_by: string;
  requested_at: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'ordered' | 'delivered';
  notes: string;
  approved_by?: string;
  approved_at?: string;
}

interface NewItemForm {
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: string;
  min_stock: string;
  max_stock: string;
  unit: string;
  location: string;
  cost: string;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: string;
}

interface EditItemForm {
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: string;
  min_stock: string;
  max_stock: string;
  unit: string;
  location: string;
  cost: string;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: string;
}

const SupervisorInventoryScreen = () => {
  const { showToast } = useToast();
  const { executeQuery, config, syncStatus, error: dbError, syncToSupabase } = useDatabase();

  // State management
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cleaning-supplies' | 'equipment' | 'safety'>('all');
  const [showLowStock, setShowLowStock] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSendItemsModal, setShowSendItemsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [requestToReject, setRequestToReject] = useState<RestockRequest | null>(null);

  // Form states
  const [newItemForm, setNewItemForm] = useState<NewItemForm>({
    name: '',
    category: 'cleaning-supplies',
    current_stock: '',
    min_stock: '',
    max_stock: '',
    unit: '',
    location: '',
    cost: '',
    supplier: '',
    auto_reorder_enabled: false,
    reorder_quantity: '',
  });

  const [editItemForm, setEditItemForm] = useState<EditItemForm>({
    name: '',
    category: 'cleaning-supplies',
    current_stock: '',
    min_stock: '',
    max_stock: '',
    unit: '',
    location: '',
    cost: '',
    supplier: '',
    auto_reorder_enabled: false,
    reorder_quantity: '',
  });

  // Load data from database
  const loadInventoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading inventory data from database...');

      // Load inventory items
      const inventoryData = await executeQuery<InventoryItem>('select', 'inventory_items');
      console.log('Loaded inventory items:', inventoryData.length);

      // Load restock requests
      const requestsData = await executeQuery<RestockRequest>('select', 'restock_requests');
      console.log('Loaded restock requests:', requestsData.length);

      // If no data exists, initialize with sample data
      if (inventoryData.length === 0) {
        console.log('No inventory data found, initializing with sample data...');
        await initializeSampleData();
        return; // initializeSampleData will call loadInventoryData again
      }

      setInventory(inventoryData);
      setRestockRequests(requestsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      showToast('Failed to load inventory data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [executeQuery, showToast]);

  // Initialize sample data
  const initializeSampleData = useCallback(async () => {
    try {
      console.log('Initializing sample inventory data...');

      const sampleItems: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          name: 'All-Purpose Cleaner',
          category: 'cleaning-supplies',
          current_stock: 25,
          min_stock: 10,
          max_stock: 50,
          unit: 'bottles',
          location: 'Storage Room A',
          cost: 8.99,
          supplier: 'CleanCorp Supply',
          auto_reorder_enabled: true,
          reorder_quantity: 20,
        },
        {
          name: 'Vacuum Cleaner',
          category: 'equipment',
          current_stock: 3,
          min_stock: 2,
          max_stock: 8,
          unit: 'units',
          location: 'Equipment Room',
          cost: 299.99,
          supplier: 'Equipment Plus',
          auto_reorder_enabled: false,
          reorder_quantity: 2,
        },
        {
          name: 'Safety Gloves',
          category: 'safety',
          current_stock: 8,
          min_stock: 15,
          max_stock: 100,
          unit: 'pairs',
          location: 'Safety Cabinet',
          cost: 2.50,
          supplier: 'Safety First Inc',
          auto_reorder_enabled: true,
          reorder_quantity: 50,
        },
        {
          name: 'Disinfectant Spray',
          category: 'cleaning-supplies',
          current_stock: 12,
          min_stock: 8,
          max_stock: 30,
          unit: 'bottles',
          location: 'Storage Room A',
          cost: 12.99,
          supplier: 'CleanCorp Supply',
          auto_reorder_enabled: true,
          reorder_quantity: 15,
        },
        {
          name: 'Mop and Bucket Set',
          category: 'equipment',
          current_stock: 5,
          min_stock: 3,
          max_stock: 10,
          unit: 'sets',
          location: 'Equipment Room',
          cost: 45.99,
          supplier: 'Equipment Plus',
          auto_reorder_enabled: false,
          reorder_quantity: 3,
        },
      ];

      // Add sample items to database
      for (const item of sampleItems) {
        const itemWithId = {
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await executeQuery('insert', 'inventory_items', itemWithId);
      }

      // Add sample restock request for low stock item
      const lowStockRequest: Omit<RestockRequest, 'id'>= {
        item_id: 'item-safety-gloves',
        item_name: 'Safety Gloves',
        requested_by: 'System Auto-Reorder',
        requested_at: new Date().toISOString(),
        quantity: 50,
        priority: 'high',
        status: 'pending',
        notes: 'Auto-generated restock request due to low stock levels',
      };

      await executeQuery('insert', 'restock_requests', {
        ...lowStockRequest,
        id: `request-${Date.now()}`,
      });

      console.log('Sample data initialized successfully');
      showToast('Sample inventory data loaded', 'success');

      // Reload data
      await loadInventoryData();
    } catch (error) {
      console.error('Error initializing sample data:', error);
      showToast('Failed to initialize sample data', 'error');
    }
  }, [executeQuery, showToast, loadInventoryData]);

  // Load data on component mount
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Sync to database when online
  useEffect(() => {
    if (syncStatus.isOnline && config.useSupabase) {
      console.log('Syncing inventory data to Supabase...');
      syncToSupabase();
    }
  }, [syncStatus.isOnline, config.useSupabase, syncToSupabase]);

  // Filter inventory based on search and category
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    const matchesLowStock = !showLowStock || item.current_stock <= item.min_stock;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Get stock status
  const getStockStatus = (item: InventoryItem): 'low' | 'medium' | 'high' => {
    if (item.current_stock <= item.min_stock) return 'low';
    if (item.current_stock <= item.min_stock * 1.5) return 'medium';
    return 'high';
  };

  // Add new item
  const addNewItem = useCallback(async () => {
    try {
      if (!newItemForm.name.trim()) {
        showToast('Please enter an item name', 'error');
        return;
      }

      const newItem: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'> = {
        name: newItemForm.name.trim(),
        category: newItemForm.category,
        current_stock: parseInt(newItemForm.current_stock) || 0,
        min_stock: parseInt(newItemForm.min_stock) || 0,
        max_stock: parseInt(newItemForm.max_stock) || 100,
        unit: newItemForm.unit.trim(),
        location: newItemForm.location.trim(),
        cost: parseFloat(newItemForm.cost) || 0,
        supplier: newItemForm.supplier.trim(),
        auto_reorder_enabled: newItemForm.auto_reorder_enabled,
        reorder_quantity: parseInt(newItemForm.reorder_quantity) || 0,
      };

      const itemWithId = {
        ...newItem,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await executeQuery('insert', 'inventory_items', itemWithId);
      
      setInventory(prev => [...prev, itemWithId]);
      setShowAddModal(false);
      
      // Reset form
      setNewItemForm({
        name: '',
        category: 'cleaning-supplies',
        current_stock: '',
        min_stock: '',
        max_stock: '',
        unit: '',
        location: '',
        cost: '',
        supplier: '',
        auto_reorder_enabled: false,
        reorder_quantity: '',
      });

      showToast('Item added successfully', 'success');
    } catch (error) {
      console.error('Error adding item:', error);
      showToast('Failed to add item', 'error');
    }
  }, [newItemForm, executeQuery, showToast]);

  // Update stock
  const updateStock = useCallback(async (itemId: string, newStock: number) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;

      const updatedItem = {
        ...item,
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      };

      await executeQuery('update', 'inventory_items', updatedItem, { id: itemId });
      
      setInventory(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      
      // Create transaction record
      const transaction = {
        id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        item_id: itemId,
        item_name: item.name,
        transaction_type: newStock > item.current_stock ? 'in' : 'out',
        quantity: Math.abs(newStock - item.current_stock),
        previous_stock: item.current_stock,
        new_stock: newStock,
        reason: 'Manual adjustment',
        performed_by: 'Supervisor',
        created_at: new Date().toISOString(),
      };

      await executeQuery('insert', 'inventory_transactions', transaction);
      
      showToast('Stock updated successfully', 'success');
    } catch (error) {
      console.error('Error updating stock:', error);
      showToast('Failed to update stock', 'error');
    }
  }, [inventory, executeQuery, showToast]);

  // Request restock
  const requestRestock = useCallback(async (itemId: string) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;

      const request: Omit<RestockRequest, 'id'> = {
        item_id: itemId,
        item_name: item.name,
        requested_by: 'Supervisor',
        requested_at: new Date().toISOString(),
        quantity: item.reorder_quantity || item.min_stock * 2,
        priority: item.current_stock <= item.min_stock * 0.5 ? 'high' : 'medium',
        status: 'pending',
        notes: `Restock request for ${item.name}`,
      };

      const requestWithId = {
        ...request,
        id: `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      await executeQuery('insert', 'restock_requests', requestWithId);
      
      setRestockRequests(prev => [...prev, requestWithId]);
      showToast('Restock request submitted', 'success');
    } catch (error) {
      console.error('Error requesting restock:', error);
      showToast('Failed to submit restock request', 'error');
    }
  }, [inventory, executeQuery, showToast]);

  // Approve restock request
  const approveRestockRequest = useCallback(async (requestId: string) => {
    try {
      const updatedRequest = {
        status: 'approved',
        approved_by: 'Supervisor',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await executeQuery('update', 'restock_requests', updatedRequest, { id: requestId });
      
      setRestockRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, ...updatedRequest } : r
      ));
      
      showToast('Restock request approved', 'success');
    } catch (error) {
      console.error('Error approving restock request:', error);
      showToast('Failed to approve restock request', 'error');
    }
  }, [executeQuery, showToast]);

  // Reject restock request
  const rejectRestockRequest = useCallback(async (requestId: string) => {
    try {
      await executeQuery('delete', 'restock_requests', null, { id: requestId });
      
      setRestockRequests(prev => prev.filter(r => r.id !== requestId));
      setRequestToReject(null);
      showToast('Restock request rejected', 'success');
    } catch (error) {
      console.error('Error rejecting restock request:', error);
      showToast('Failed to reject restock request', 'error');
    }
  }, [executeQuery, showToast]);

  // Toggle auto reorder
  const toggleAutoReorder = useCallback(async (itemId: string) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;

      const updatedItem = {
        ...item,
        auto_reorder_enabled: !item.auto_reorder_enabled,
        updated_at: new Date().toISOString(),
      };

      await executeQuery('update', 'inventory_items', updatedItem, { id: itemId });
      
      setInventory(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      
      showToast(
        `Auto-reorder ${updatedItem.auto_reorder_enabled ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling auto reorder:', error);
      showToast('Failed to update auto-reorder setting', 'error');
    }
  }, [inventory, executeQuery, showToast]);

  // Delete item
  const removeItem = useCallback(async (itemId: string) => {
    try {
      await executeQuery('delete', 'inventory_items', null, { id: itemId });
      
      setInventory(prev => prev.filter(i => i.id !== itemId));
      setItemToDelete(null);
      showToast('Item deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Failed to delete item', 'error');
    }
  }, [executeQuery, showToast]);

  // Open edit modal
  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditItemForm({
      name: item.name,
      category: item.category,
      current_stock: item.current_stock.toString(),
      min_stock: item.min_stock.toString(),
      max_stock: item.max_stock.toString(),
      unit: item.unit,
      location: item.location,
      cost: item.cost.toString(),
      supplier: item.supplier,
      auto_reorder_enabled: item.auto_reorder_enabled,
      reorder_quantity: item.reorder_quantity.toString(),
    });
    setShowEditModal(true);
  };

  // Save edited item
  const saveEditedItem = useCallback(async () => {
    try {
      if (!selectedItem || !editItemForm.name.trim()) {
        showToast('Please enter an item name', 'error');
        return;
      }

      const updatedItem: InventoryItem = {
        ...selectedItem,
        name: editItemForm.name.trim(),
        category: editItemForm.category,
        current_stock: parseInt(editItemForm.current_stock) || 0,
        min_stock: parseInt(editItemForm.min_stock) || 0,
        max_stock: parseInt(editItemForm.max_stock) || 100,
        unit: editItemForm.unit.trim(),
        location: editItemForm.location.trim(),
        cost: parseFloat(editItemForm.cost) || 0,
        supplier: editItemForm.supplier.trim(),
        auto_reorder_enabled: editItemForm.auto_reorder_enabled,
        reorder_quantity: parseInt(editItemForm.reorder_quantity) || 0,
        updated_at: new Date().toISOString(),
      };

      await executeQuery('update', 'inventory_items', updatedItem, { id: selectedItem.id });
      
      setInventory(prev => prev.map(i => i.id === selectedItem.id ? updatedItem : i));
      setShowEditModal(false);
      setSelectedItem(null);
      
      showToast('Item updated successfully', 'success');
    } catch (error) {
      console.error('Error updating item:', error);
      showToast('Failed to update item', 'error');
    }
  }, [selectedItem, editItemForm, executeQuery, showToast]);

  // Confirm delete item
  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => removeItem(itemToDelete.id)
        }
      ]
    );
  };

  // Confirm reject request
  const confirmRejectRequest = () => {
    if (!requestToReject) return;
    
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject the restock request for "${requestToReject.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => rejectRestockRequest(requestToReject.id)
        }
      ]
    );
  };

  // Handle items sent
  const handleItemsSent = useCallback(async (itemIds: string[], quantities: number[]) => {
    try {
      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const quantity = quantities[i];
        const item = inventory.find(item => item.id === itemId);
        
        if (item && quantity > 0) {
          const newStock = Math.max(0, item.current_stock - quantity);
          await updateStock(itemId, newStock);
        }
      }
      
      showToast('Items sent successfully', 'success');
    } catch (error) {
      console.error('Error sending items:', error);
      showToast('Failed to send items', 'error');
    }
  }, [inventory, updateStock, showToast]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cleaning-supplies': return 'flask';
      case 'equipment': return 'construct';
      case 'safety': return 'shield-checkmark';
      default: return 'cube';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'approved': return colors.primary;
      case 'ordered': return colors.info;
      case 'delivered': return colors.success;
      default: return colors.textSecondary;
    }
  };

  // Handle stock update with prompt
  const handleStockUpdate = (item: InventoryItem) => {
    if (Platform.OS === 'web') {
      const newStock = prompt(
        `Update stock for ${item.name}\nCurrent stock: ${item.current_stock} ${item.unit}`,
        item.current_stock.toString()
      );
      
      if (newStock !== null) {
        const stockValue = parseInt(newStock);
        if (!isNaN(stockValue) && stockValue >= 0) {
          updateStock(item.id, stockValue);
        } else {
          showToast('Please enter a valid stock number', 'error');
        }
      }
    } else {
      Alert.prompt(
        'Update Stock',
        `Current stock: ${item.current_stock} ${item.unit}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Update', 
            onPress: (value) => {
              const newStock = parseInt(value || '0');
              if (!isNaN(newStock) && newStock >= 0) {
                updateStock(item.id, newStock);
              } else {
                showToast('Please enter a valid stock number', 'error');
              }
            }
          }
        ],
        'plain-text',
        item.current_stock.toString()
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Inventory Management</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Database status indicator */}
          <View style={[styles.statusIndicator, { 
            backgroundColor: config.useSupabase && syncStatus.isOnline ? colors.success : colors.warning 
          }]}>
            <Icon 
              name={config.useSupabase && syncStatus.isOnline ? "cloud-done" : "cloud-offline"} 
              size={16} 
              style={{ color: colors.background }} 
            />
          </View>
          <IconButton
            icon="add"
            onPress={() => setShowAddModal(true)}
            size={24}
            color={colors.background}
          />
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} style={{ color: colors.textSecondary }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedCategory === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, selectedCategory === 'cleaning-supplies' && styles.filterButtonActive]}
            onPress={() => setSelectedCategory('cleaning-supplies')}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'cleaning-supplies' && styles.filterButtonTextActive]}>
              Supplies
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, selectedCategory === 'equipment' && styles.filterButtonActive]}
            onPress={() => setSelectedCategory('equipment')}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'equipment' && styles.filterButtonTextActive]}>
              Equipment
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, selectedCategory === 'safety' && styles.filterButtonActive]}
            onPress={() => setSelectedCategory('safety')}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'safety' && styles.filterButtonTextActive]}>
              Safety
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, showLowStock && styles.filterButtonActive]}
            onPress={() => setShowLowStock(!showLowStock)}
          >
            <Text style={[styles.filterButtonText, showLowStock && styles.filterButtonTextActive]}>
              Low Stock
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Send Items"
          onPress={() => setShowSendItemsModal(true)}
          style={[buttonStyles.secondary, { flex: 1, marginRight: spacing.sm }]}
        />
        <Button
          title="Transfer History"
          onPress={() => setShowTransferModal(true)}
          style={[buttonStyles.outline, { flex: 1 }]}
        />
      </View>

      {/* Inventory List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredInventory.map((item) => {
          const stockStatus = getStockStatus(item);
          const pendingRequests = restockRequests.filter(r => r.item_id === item.id && r.status === 'pending');
          
          return (
            <AnimatedCard key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleRow}>
                  <Icon 
                    name={getCategoryIcon(item.category)} 
                    size={24} 
                    style={{ color: colors.primary }} 
                  />
                  <View style={styles.itemTitleContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSupplier}>{item.supplier}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <IconButton
                      icon="create"
                      onPress={() => openEditModal(item)}
                      size={20}
                      color={colors.textSecondary}
                    />
                    <IconButton
                      icon="trash"
                      onPress={() => setItemToDelete(item)}
                      size={20}
                      color={colors.danger}
                    />
                  </View>
                </View>
                
                <View style={styles.stockInfo}>
                  <View style={[styles.stockBadge, { backgroundColor: 
                    stockStatus === 'low' ? colors.danger : 
                    stockStatus === 'medium' ? colors.warning : colors.success 
                  }]}>
                    <Text style={styles.stockBadgeText}>
                      {item.current_stock} {item.unit}
                    </Text>
                  </View>
                  <Text style={styles.stockRange}>
                    Min: {item.min_stock} • Max: {item.max_stock}
                  </Text>
                </View>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Location:</Text>
                  <Text style={styles.itemDetailValue}>{item.location}</Text>
                </View>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Cost:</Text>
                  <Text style={styles.itemDetailValue}>${item.cost.toFixed(2)}</Text>
                </View>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Auto-reorder:</Text>
                  <TouchableOpacity
                    onPress={() => toggleAutoReorder(item.id)}
                    style={styles.toggleButton}
                  >
                    <Text style={[styles.toggleButtonText, { 
                      color: item.auto_reorder_enabled ? colors.success : colors.textSecondary 
                    }]}>
                      {item.auto_reorder_enabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {pendingRequests.length > 0 && (
                <View style={styles.pendingRequests}>
                  <Text style={styles.pendingRequestsTitle}>Pending Requests:</Text>
                  {pendingRequests.map((request) => (
                    <View key={request.id} style={styles.requestItem}>
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestQuantity}>{request.quantity} {item.unit}</Text>
                        <Text style={[styles.requestPriority, { color: getPriorityColor(request.priority) }]}>
                          {request.priority.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.requestActions}>
                        <IconButton
                          icon="checkmark"
                          onPress={() => approveRestockRequest(request.id)}
                          size={20}
                          color={colors.success}
                        />
                        <IconButton
                          icon="close"
                          onPress={() => setRequestToReject(request)}
                          size={20}
                          color={colors.danger}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.itemActions}>
                <Button
                  title="Update Stock"
                  onPress={() => handleStockUpdate(item)}
                  style={[buttonStyles.secondary, { flex: 1, marginRight: spacing.sm }]}
                />
                
                {stockStatus === 'low' && (
                  <Button
                    title="Request Restock"
                    onPress={() => requestRestock(item.id)}
                    style={[buttonStyles.primary, { flex: 1 }]}
                  />
                )}
              </View>
            </AnimatedCard>
          );
        })}

        {filteredInventory.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="cube-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateTitle}>No items found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery || selectedCategory !== 'all' || showLowStock
                ? 'Try adjusting your search or filters'
                : 'Add your first inventory item to get started'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <IconButton
              icon="close"
              onPress={() => setShowAddModal(false)}
              size={24}
              color={colors.text}
            />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Item Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newItemForm.name}
                onChangeText={(text) => setNewItemForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter item name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryButtons}>
                {(['cleaning-supplies', 'equipment', 'safety'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      newItemForm.category === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewItemForm(prev => ({ ...prev, category }))}
                  >
                    <Icon 
                      name={getCategoryIcon(category)} 
                      size={16} 
                      style={{ 
                        color: newItemForm.category === category ? colors.background : colors.primary,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[
                      styles.categoryButtonText,
                      newItemForm.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category === 'cleaning-supplies' ? 'Supplies' : 
                       category === 'equipment' ? 'Equipment' : 'Safety'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Current Stock *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItemForm.current_stock}
                  onChangeText={(text) => setNewItemForm(prev => ({ ...prev, current_stock: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Unit *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItemForm.unit}
                  onChangeText={(text) => setNewItemForm(prev => ({ ...prev, unit: text }))}
                  placeholder="bottles, units, etc."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Min Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItemForm.min_stock}
                  onChangeText={(text) => setNewItemForm(prev => ({ ...prev, min_stock: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Max Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItemForm.max_stock}
                  onChangeText={(text) => setNewItemForm(prev => ({ ...prev, max_stock: text }))}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location</Text>
              <TextInput
                style={styles.formInput}
                value={newItemForm.location}
                onChangeText={(text) => setNewItemForm(prev => ({ ...prev, location: text }))}
                placeholder="Storage location"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Cost ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItemForm.cost}
                  onChangeText={(text) => setNewItemForm(prev => ({ ...prev, cost: text }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Reorder Qty</Text>
                <TextInput
                  style={styles.formInput}
                  value={newItemForm.reorder_quantity}
                  onChangeText={(text) => setNewItemForm(prev => ({ ...prev, reorder_quantity: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Supplier</Text>
              <TextInput
                style={styles.formInput}
                value={newItemForm.supplier}
                onChangeText={(text) => setNewItemForm(prev => ({ ...prev, supplier: text }))}
                placeholder="Supplier name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Auto-reorder enabled</Text>
                <TouchableOpacity
                  style={[styles.switch, newItemForm.auto_reorder_enabled && styles.switchActive]}
                  onPress={() => setNewItemForm(prev => ({ ...prev, auto_reorder_enabled: !prev.auto_reorder_enabled }))}
                >
                  <View style={[styles.switchThumb, newItemForm.auto_reorder_enabled && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowAddModal(false)}
              style={[buttonStyles.outline, { flex: 1, marginRight: spacing.sm }]}
            />
            <Button
              title="Add Item"
              onPress={addNewItem}
              style={[buttonStyles.primary, { flex: 1 }]}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <IconButton
              icon="close"
              onPress={() => setShowEditModal(false)}
              size={24}
              color={colors.text}
            />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Item Name *</Text>
              <TextInput
                style={styles.formInput}
                value={editItemForm.name}
                onChangeText={(text) => setEditItemForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter item name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryButtons}>
                {(['cleaning-supplies', 'equipment', 'safety'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      editItemForm.category === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setEditItemForm(prev => ({ ...prev, category }))}
                  >
                    <Icon 
                      name={getCategoryIcon(category)} 
                      size={16} 
                      style={{ 
                        color: editItemForm.category === category ? colors.background : colors.primary,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[
                      styles.categoryButtonText,
                      editItemForm.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category === 'cleaning-supplies' ? 'Supplies' : 
                       category === 'equipment' ? 'Equipment' : 'Safety'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Current Stock *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editItemForm.current_stock}
                  onChangeText={(text) => setEditItemForm(prev => ({ ...prev, current_stock: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Unit *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editItemForm.unit}
                  onChangeText={(text) => setEditItemForm(prev => ({ ...prev, unit: text }))}
                  placeholder="bottles, units, etc."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Min Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={editItemForm.min_stock}
                  onChangeText={(text) => setEditItemForm(prev => ({ ...prev, min_stock: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Max Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={editItemForm.max_stock}
                  onChangeText={(text) => setEditItemForm(prev => ({ ...prev, max_stock: text }))}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location</Text>
              <TextInput
                style={styles.formInput}
                value={editItemForm.location}
                onChangeText={(text) => setEditItemForm(prev => ({ ...prev, location: text }))}
                placeholder="Storage location"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Cost ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editItemForm.cost}
                  onChangeText={(text) => setEditItemForm(prev => ({ ...prev, cost: text }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Reorder Qty</Text>
                <TextInput
                  style={styles.formInput}
                  value={editItemForm.reorder_quantity}
                  onChangeText={(text) => setEditItemForm(prev => ({ ...prev, reorder_quantity: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Supplier</Text>
              <TextInput
                style={styles.formInput}
                value={editItemForm.supplier}
                onChangeText={(text) => setEditItemForm(prev => ({ ...prev, supplier: text }))}
                placeholder="Supplier name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Auto-reorder enabled</Text>
                <TouchableOpacity
                  style={[styles.switch, editItemForm.auto_reorder_enabled && styles.switchActive]}
                  onPress={() => setEditItemForm(prev => ({ ...prev, auto_reorder_enabled: !prev.auto_reorder_enabled }))}
                >
                  <View style={[styles.switchThumb, editItemForm.auto_reorder_enabled && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowEditModal(false)}
              style={[buttonStyles.outline, { flex: 1, marginRight: spacing.sm }]}
            />
            <Button
              title="Save Changes"
              onPress={saveEditedItem}
              style={[buttonStyles.primary, { flex: 1 }]}
            />
          </View>
        </View>
      </Modal>

      {/* Send Items Modal */}
      <SendItemsModal
        visible={showSendItemsModal}
        inventory={inventory}
        onClose={() => setShowSendItemsModal(false)}
        onSend={handleItemsSent}
      />

      {/* Transfer History Modal */}
      <TransferHistoryModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      {/* Delete Confirmation */}
      {itemToDelete && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.overlayContainer}>
            <View style={styles.confirmationModal}>
              <Text style={styles.confirmationTitle}>Delete Item</Text>
              <Text style={styles.confirmationMessage}>
                Are you sure you want to delete "{itemToDelete.name}"? This action cannot be undone.
              </Text>
              <View style={styles.confirmationActions}>
                <Button
                  title="Cancel"
                  onPress={() => setItemToDelete(null)}
                  style={[buttonStyles.outline, { flex: 1, marginRight: spacing.sm }]}
                />
                <Button
                  title="Delete"
                  onPress={confirmDeleteItem}
                  style={[buttonStyles.danger, { flex: 1 }]}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reject Request Confirmation */}
      {requestToReject && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.overlayContainer}>
            <View style={styles.confirmationModal}>
              <Text style={styles.confirmationTitle}>Reject Request</Text>
              <Text style={styles.confirmationMessage}>
                Are you sure you want to reject the restock request for "{requestToReject.item_name}"?
              </Text>
              <View style={styles.confirmationActions}>
                <Button
                  title="Cancel"
                  onPress={() => setRequestToReject(null)}
                  style={[buttonStyles.outline, { flex: 1, marginRight: spacing.sm }]}
                />
                <Button
                  title="Reject"
                  onPress={confirmRejectRequest}
                  style={[buttonStyles.danger, { flex: 1 }]}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  itemHeader: {
    marginBottom: spacing.md,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSupplier: {
    ...typography.small,
    color: colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  stockBadgeText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
  },
  stockRange: {
    ...typography.small,
    color: colors.textSecondary,
  },
  itemDetails: {
    marginBottom: spacing.md,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemDetailLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  itemDetailValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleButtonText: {
    ...typography.small,
    fontWeight: '500',
  },
  pendingRequests: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingRequestsTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  requestInfo: {
    flex: 1,
  },
  requestQuantity: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
  },
  requestPriority: {
    ...typography.small,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmationModal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  confirmationTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  confirmationMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  confirmationActions: {
    flexDirection: 'row',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.success,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
});

export default SupervisorInventoryScreen;
