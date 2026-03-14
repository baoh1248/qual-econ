
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform, Dimensions, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../integrations/supabase/client';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import SendItemsModal from '../../components/inventory/SendItemsModal';
import TransferHistoryModal from '../../components/inventory/TransferHistoryModal';
import ReceiveSupplyModal from '../../components/inventory/ReceiveSupplyModal';
import uuid from 'react-native-uuid';
import { formatCurrency } from '../../utils/inventoryTracking';
import { commonStyles, colors, spacing, typography, buttonStyles, getContrastColor } from '../../styles/commonStyles';

const WAREHOUSES = ['Sparks Warehouse', 'Regular Warehouse'] as const;
type Warehouse = typeof WAREHOUSES[number];

interface InventoryItem {
  id: string;
  name: string;
  item_number?: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  supply_type?: string;
  image_url?: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  location: string;
  cost: number;
  tax_per_unit?: number;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: number;
  associated_buildings?: string[];
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
  item_number: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: string;
  min_stock: string;
  unit: string;
  location: string;
  cost: string;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: string;
}

interface EditItemForm {
  name: string;
  item_number: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  min_stock: string;
  unit: string;
  location: string;
  cost: string;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: string;
  associated_buildings: string[];
}

const generateItemNumber = (): string => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ITM-${random}`;
};

const { width } = Dimensions.get('window');
const ITEMS_PER_ROW = 8;
const ITEM_SPACING = spacing.sm;
const HORIZONTAL_PADDING = spacing.lg * 2;
const SCROLLBAR_RESERVE = Platform.OS === 'web' ? 20 : 0;
const ITEM_WIDTH = Math.floor((width - SCROLLBAR_RESERVE - HORIZONTAL_PADDING - (ITEM_SPACING * (ITEMS_PER_ROW - 1))) / ITEMS_PER_ROW);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  actionButtonsContainer: {
    marginTop: -spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
    elevation: 3,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E6ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: ITEM_SPACING,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: ITEM_WIDTH,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: ITEM_SPACING,
  },
  itemHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    justifyContent: 'center',
  },
  itemInfo: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  stockBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    flex: 1,
  },
  requestInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: 'flex-end',
  },
  buildingChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  buildingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  buildingChipText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '600' as any,
    marginRight: spacing.xs,
  },
  buildingListContainer: {
    maxHeight: 200,
    marginTop: spacing.sm,
  },
  buildingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  buildingListItemText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  buildingListItemName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: '600' as any,
  },
  buildingListItemClient: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  buildingAssocDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E6ED',
    backgroundColor: '#FFFFFF',
  },
  viewToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  viewToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  viewToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  buildingViewContainer: {
    paddingHorizontal: spacing.lg,
  },
  bvClientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bvClientName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  bvClientBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  bvClientBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bvBuildingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  bvBuildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  bvBuildingName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  bvBuildingCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  bvItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  bvItemName: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  bvItemNumber: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemProductNumber: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  costBreakdownText: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  bvItemStock: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  bvItemStockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bvNoItems: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  bvNoItemsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default function SupervisorInventoryScreen() {
  const { theme, themeColor } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config, syncStatus } = useDatabase();
  const [hoveredImage, setHoveredImage] = useState<{ url: string; x: number; y: number } | null>(null);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'cleaning-supplies' | 'equipment' | 'safety'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<'all' | Warehouse>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showSendItemsModal, setShowSendItemsModal] = useState(false);
  const [showTransferHistoryModal, setShowTransferHistoryModal] = useState(false);
  const [showReceiveSupplyModal, setShowReceiveSupplyModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; name: string } | null>(null);

  const [newItemForm, setNewItemForm] = useState<NewItemForm>({
    name: '',
    item_number: '',
    category: 'cleaning-supplies',
    current_stock: '0',
    min_stock: '10',
    unit: 'units',
    location: 'Sparks Warehouse',
    cost: '0',
    supplier: '',
    auto_reorder_enabled: false,
    reorder_quantity: '50',
  });

  const [editItemForm, setEditItemForm] = useState<EditItemForm>({
    name: '',
    item_number: '',
    category: 'cleaning-supplies',
    min_stock: '10',
    unit: 'units',
    location: 'Sparks Warehouse',
    cost: '0',
    supplier: '',
    auto_reorder_enabled: false,
    reorder_quantity: '50',
    associated_buildings: [],
  });

  const [availableBuildings, setAvailableBuildings] = useState<Array<{ clientName: string; buildingName: string; destination: string }>>([]);
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'items' | 'by-building'>('items');
  const [expandedBuildingViewClients, setExpandedBuildingViewClients] = useState<Set<string>>(new Set());

  const loadAvailableBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('client_buildings')
        .select('client_name, building_name')
        .order('client_name', { ascending: true });
      if (!error && data) {
        const mapped = data.map((b: { client_name: string; building_name: string }) => ({
          clientName: b.client_name,
          buildingName: b.building_name,
          destination: b.client_name + ' - ' + b.building_name,
        }));
        setAvailableBuildings(mapped);
      }
    } catch (e) {
      console.error('Failed to load buildings:', e);
    }
  };

  // Load inventory data from Supabase
  const loadInventoryData = useCallback(async () => {
    if (!config.useSupabase) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading inventory data from Supabase...');

      // Load inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (itemsError) {
        console.error('❌ Error loading inventory items:', itemsError);
        throw itemsError;
      }

      console.log(`✅ Loaded ${itemsData?.length || 0} inventory items`);
      setItems(itemsData || []);

      // Load restock requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('restock_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (requestsError) {
        console.error('❌ Error loading restock requests:', requestsError);
        throw requestsError;
      }

      console.log(`✅ Loaded ${requestsData?.length || 0} restock requests`);
      setRestockRequests(requestsData || []);

      // Always keep buildings list fresh for By Building view
      await loadAvailableBuildings();
    } catch (error) {
      console.error('❌ Failed to load inventory data:', error);
      showToast('Failed to load inventory data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [config.useSupabase, showToast]);

  // Sync to Supabase when online
  const syncToSupabase = useCallback(async () => {
    if (!config.useSupabase || !syncStatus.isOnline) return;

    console.log('🔄 Syncing inventory to Supabase...');
    await loadInventoryData();
  }, [config.useSupabase, syncStatus.isOnline, loadInventoryData]);

  // Reload inventory data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadInventoryData();
    }, [loadInventoryData])
  );

  useEffect(() => {
    if (syncStatus.isOnline && config.useSupabase) {
      syncToSupabase();
    }
  }, [syncStatus.isOnline, config.useSupabase, syncToSupabase]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= item.min_stock) {
      return { status: 'low', color: colors.error, label: 'Low Stock' };
    } else {
      return { status: 'normal', color: colors.success, label: 'Normal' };
    }
  };

  const handleAddItem = async () => {
    if (!newItemForm.name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }

    try {
      console.log('🔄 Adding new inventory item:', newItemForm.name);

      const newItem: InventoryItem = {
        id: uuid.v4() as string,
        name: newItemForm.name.trim(),
        item_number: newItemForm.item_number.trim() || generateItemNumber(),
        category: newItemForm.category,
        current_stock: parseInt(newItemForm.current_stock) || 0,
        min_stock: parseInt(newItemForm.min_stock) || 10,
        max_stock: 999999,
        unit: newItemForm.unit.trim(),
        location: newItemForm.location.trim(),
        cost: parseFloat(newItemForm.cost) || 0,
        supplier: newItemForm.supplier.trim(),
        auto_reorder_enabled: newItemForm.auto_reorder_enabled,
        reorder_quantity: parseInt(newItemForm.reorder_quantity) || 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from('inventory_items')
        .insert(newItem);

      // If the item_number column doesn't exist yet (migration pending), retry without it
      if (error && (error.code === '42703' || error.message?.includes('item_number'))) {
        console.warn('⚠️ item_number column not found — retrying without it (apply migration to enable)');
        const { item_number: _itemNum, ...newItemFallback } = newItem;
        const { error: fallbackError } = await supabase
          .from('inventory_items')
          .insert(newItemFallback);
        error = fallbackError;
      }

      if (error) {
        console.error('❌ Error adding inventory item:', error);
        throw error;
      }

      console.log('✅ Inventory item added successfully');
      showToast('Item added successfully', 'success');

      // Refresh data to show the new item
      await loadInventoryData();

      setShowAddModal(false);
      setNewItemForm({
        name: '',
        item_number: '',
        category: 'cleaning-supplies',
        current_stock: '0',
        min_stock: '10',
        unit: 'units',
        location: 'Sparks Warehouse',
        cost: '0',
        supplier: '',
        auto_reorder_enabled: false,
        reorder_quantity: '50',
      });
    } catch (error) {
      console.error('❌ Failed to add inventory item:', error);
      showToast('Failed to add item', 'error');
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditItemForm({
      name: item.name,
      item_number: item.item_number || '',
      category: item.category,
      min_stock: item.min_stock.toString(),
      unit: item.unit,
      location: item.location,
      cost: item.cost.toString(),
      supplier: item.supplier,
      auto_reorder_enabled: item.auto_reorder_enabled,
      reorder_quantity: item.reorder_quantity.toString(),
      associated_buildings: item.associated_buildings ? item.associated_buildings : [],
    });
    setBuildingSearchQuery('');
    loadAvailableBuildings();
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !editItemForm.name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }

    try {
      console.log('🔄 Updating inventory item:', selectedItem.id);

      const updates = {
        name: editItemForm.name.trim(),
        item_number: editItemForm.item_number.trim() || undefined,
        category: editItemForm.category,
        min_stock: parseInt(editItemForm.min_stock) || 10,
        unit: editItemForm.unit.trim(),
        location: editItemForm.location.trim(),
        cost: parseFloat(editItemForm.cost) || 0,
        supplier: editItemForm.supplier.trim(),
        auto_reorder_enabled: editItemForm.auto_reorder_enabled,
        reorder_quantity: parseInt(editItemForm.reorder_quantity) || 50,
        associated_buildings: editItemForm.associated_buildings ? editItemForm.associated_buildings : [],
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', selectedItem.id);

      // If the item_number column doesn't exist yet (migration pending), retry without it
      if (error && (error.code === '42703' || error.message?.includes('item_number'))) {
        console.warn('⚠️ item_number column not found — retrying without it (apply migration to enable)');
        const { item_number: _itemNum, ...updatesFallback } = updates;
        const { error: fallbackError } = await supabase
          .from('inventory_items')
          .update(updatesFallback)
          .eq('id', selectedItem.id);
        error = fallbackError;
      }

      if (error) {
        console.error('❌ Error updating inventory item:', error);
        throw error;
      }

      console.log('✅ Inventory item updated successfully');
      showToast('Item updated successfully', 'success');
      
      // Refresh data to show the updated item
      await loadInventoryData();
      
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('❌ Failed to update inventory item:', error);
      showToast('Failed to update item', 'error');
    }
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (Platform.OS === 'web') {
      setDeleteConfirmItem({ id: itemId, name: itemName });
    } else {
      Alert.alert(
        'Delete Item',
        `Are you sure you want to delete ${itemName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => confirmDeleteItem(itemId),
          },
        ]
      );
    }
  };

  const confirmDeleteItem = async (itemId: string) => {
    try {
      console.log('🔄 Deleting inventory item:', itemId);

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('❌ Error deleting inventory item:', error);
        throw error;
      }

      console.log('✅ Inventory item deleted successfully');
      showToast('Item deleted successfully', 'success');

      await loadInventoryData();
    } catch (error) {
      console.error('❌ Failed to delete inventory item:', error);
      showToast('Failed to delete item', 'error');
    } finally {
      setDeleteConfirmItem(null);
    }
  };

  const handleSendItems = async (itemIds: string[], quantities: number[]) => {
    try {
      console.log('🔄 Sending items:', itemIds, quantities);

      // Update inventory quantities
      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const quantity = quantities[i];
        const item = items.find(item => item.id === itemId);
        
        if (item) {
          const newStock = item.current_stock - quantity;
          
          const { error } = await supabase
            .from('inventory_items')
            .update({ 
              current_stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);

          if (error) {
            console.error('❌ Error updating inventory item:', error);
            throw error;
          }

          // Log the transaction (non-fatal)
          try {
            await supabase
              .from('inventory_transactions')
              .insert({
                id: uuid.v4() as string,
                item_id: itemId,
                item_name: item.name,
                transaction_type: 'out',
                quantity: quantity,
                previous_stock: item.current_stock,
                new_stock: newStock,
                reason: 'Sent to location',
                performed_by: 'Supervisor',
                created_at: new Date().toISOString(),
              });
          } catch (transactionError) {
            console.warn('⚠️ Failed to log transaction (non-critical):', transactionError);
          }
        }
      }

      console.log('✅ Items sent successfully');
      await loadInventoryData();
    } catch (error) {
      console.error('❌ Failed to send items:', error);
      throw error;
    }
  };

  const handleWarehouseTransfer = async (itemIds: string[], quantities: number[], destinationWarehouse: string) => {
    try {
      console.log('🔄 Transferring items between warehouses:', itemIds, quantities, '->', destinationWarehouse);

      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const quantity = quantities[i];
        const sourceItem = items.find(item => item.id === itemId);

        if (sourceItem) {
          // Decrement source warehouse stock
          const newSourceStock = sourceItem.current_stock - quantity;
          const { error: sourceError } = await supabase
            .from('inventory_items')
            .update({ current_stock: newSourceStock, updated_at: new Date().toISOString() })
            .eq('id', itemId);

          if (sourceError) throw sourceError;

          // Find matching item by name in destination warehouse and increment its stock
          const destItem = items.find(item => item.name === sourceItem.name && item.location === destinationWarehouse);
          if (destItem) {
            const newDestStock = destItem.current_stock + quantity;
            const { error: destError } = await supabase
              .from('inventory_items')
              .update({ current_stock: newDestStock, updated_at: new Date().toISOString() })
              .eq('id', destItem.id);

            if (destError) throw destError;
          } else {
            // Item doesn't exist in the destination warehouse — create it there
            const { error: createError } = await supabase
              .from('inventory_items')
              .insert({
                id: uuid.v4() as string,
                name: sourceItem.name,
                item_number: sourceItem.item_number,
                category: sourceItem.category,
                current_stock: quantity,
                min_stock: sourceItem.min_stock,
                max_stock: sourceItem.max_stock,
                unit: sourceItem.unit,
                location: destinationWarehouse,
                cost: sourceItem.cost,
                supplier: sourceItem.supplier,
                auto_reorder_enabled: sourceItem.auto_reorder_enabled,
                reorder_quantity: sourceItem.reorder_quantity,
                associated_buildings: sourceItem.associated_buildings || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (createError) throw createError;
          }

          // Log the transactions
          await supabase.from('inventory_transactions').insert({
            id: uuid.v4() as string,
            item_id: itemId,
            item_name: sourceItem.name,
            transaction_type: 'out',
            quantity,
            previous_stock: sourceItem.current_stock,
            new_stock: newSourceStock,
            reason: `Transferred to ${destinationWarehouse}`,
            performed_by: 'Supervisor',
            created_at: new Date().toISOString(),
          });
        }
      }

      console.log('✅ Warehouse transfer completed');
      await loadInventoryData();
    } catch (error) {
      console.error('❌ Failed to transfer between warehouses:', error);
      throw error;
    }
  };

  const handleReceiveSupply = async (itemIds: string[], quantities: number[], costs: number[], taxPerUnits: number[] = []) => {
    try {
      console.log('🔄 Receiving supply:', itemIds, quantities, costs);

      // Update inventory quantities and costs
      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const quantity = quantities[i];
        const cost = costs[i]; // already includes tax per unit (landed cost)
        const taxPerUnit = taxPerUnits[i] || 0;
        const item = items.find(item => item.id === itemId);

        if (item) {
          const newStock = item.current_stock + quantity;

          // Weighted Average Cost (WAC):
          // new_avg = (existing_stock × old_cost + received_qty × landed_cost) / new_total_stock
          const landedCostPerUnit = cost; // already includes tax per unit
          const existingValue = item.current_stock * (item.cost || 0);
          const incomingValue = quantity * landedCostPerUnit;
          const newAvgCost = newStock > 0 ? (existingValue + incomingValue) / newStock : landedCostPerUnit;

          // Update stock and WAC cost
          const updateData: any = {
            current_stock: newStock,
            updated_at: new Date().toISOString()
          };

          if (landedCostPerUnit > 0) {
            updateData.cost = newAvgCost;
          }

          let { error } = await supabase
            .from('inventory_items')
            .update(updateData)
            .eq('id', itemId);

          // If update fails, retry with minimal fields (handles missing optional columns)
          if (error) {
            console.warn('⚠️ Full update failed, retrying with minimal fields:', error.message);
            const minimalUpdate = { current_stock: newStock, updated_at: updateData.updated_at };
            const retryResult = await supabase
              .from('inventory_items')
              .update(minimalUpdate)
              .eq('id', itemId);
            if (retryResult.error) {
              console.error('❌ Error updating inventory item:', retryResult.error);
              throw retryResult.error;
            }
          }

          // Log the transaction (non-fatal)
          try {
            await supabase
              .from('inventory_transactions')
              .insert({
                id: uuid.v4() as string,
                item_id: itemId,
                item_name: item.name,
                transaction_type: 'in',
                quantity: quantity,
                previous_stock: item.current_stock,
                new_stock: newStock,
                reason: `Supply received @ ${formatCurrency(landedCostPerUnit)}/unit (WAC: ${formatCurrency(newAvgCost)})`,
                performed_by: 'Supervisor',
                created_at: new Date().toISOString(),
              });
          } catch (transactionError) {
            console.warn('⚠️ Failed to log transaction (non-critical):', transactionError);
          }
        }
      }

      console.log('✅ Supply received successfully');
      await loadInventoryData();
    } catch (error) {
      console.error('❌ Failed to receive supply:', error);
      throw error;
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      console.log('🔄 Approving restock request:', requestId);

      const { error } = await supabase
        .from('restock_requests')
        .update({
          status: 'approved',
          approved_by: 'Supervisor',
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('❌ Error approving restock request:', error);
        throw error;
      }

      console.log('✅ Restock request approved successfully');
      showToast('Request approved', 'success');
      
      // Refresh data to show the updated request
      await loadInventoryData();
    } catch (error) {
      console.error('❌ Failed to approve restock request:', error);
      showToast('Failed to approve request', 'error');
    }
  };

  const confirmRejectRequest = (requestId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this restock request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Rejecting restock request:', requestId);

              const { error } = await supabase
                .from('restock_requests')
                .delete()
                .eq('id', requestId);

              if (error) {
                console.error('❌ Error rejecting restock request:', error);
                throw error;
              }

              console.log('✅ Restock request rejected successfully');
              showToast('Request rejected', 'success');
              
              // Refresh data to remove the rejected request
              await loadInventoryData();
            } catch (error) {
              console.error('❌ Failed to reject restock request:', error);
              showToast('Failed to reject request', 'error');
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cleaning-supplies':
        return 'water';
      case 'equipment':
        return 'construct';
      case 'safety':
        return 'shield-checkmark';
      default:
        return 'cube';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'ordered':
        return themeColor;
      case 'delivered':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(q) ||
                         item.supplier.toLowerCase().includes(q) ||
                         (item.item_number ? item.item_number.toLowerCase().includes(q) : false) ||
                         (item.supply_type ? item.supply_type.toLowerCase().includes(q) : false);
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesWarehouse = selectedWarehouse === 'all' || item.location === selectedWarehouse;
    return matchesSearch && matchesCategory && matchesWarehouse;
  });

  // By Building view: group buildings by client, find associated items for each
  const buildingViewData = useMemo(() => {
    const grouped: Record<string, Array<{ building: { clientName: string; buildingName: string; destination: string }; buildingItems: InventoryItem[] }>> = {};
    availableBuildings.forEach(b => {
      const bItems = items.filter(item => {
        if (!item.associated_buildings?.includes(b.destination)) return false;
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        if (selectedWarehouse !== 'all' && item.location !== selectedWarehouse) return false;
        if (searchQuery) { const q = searchQuery.toLowerCase(); if (!item.name.toLowerCase().includes(q) && !item.supplier?.toLowerCase().includes(q) && !(item.item_number ? item.item_number.toLowerCase().includes(q) : false)) return false; }
        return true;
      });
      if (!grouped[b.clientName]) grouped[b.clientName] = [];
      grouped[b.clientName].push({ building: b, buildingItems: bItems });
    });
    return grouped;
  }, [availableBuildings, items, filterCategory, selectedWarehouse, searchQuery]);

  // Items that have no associated buildings at all (unassigned)
  const unassignedItems = useMemo(() => {
    return items.filter(item => {
      if (!item.associated_buildings || item.associated_buildings.length === 0) {
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        if (selectedWarehouse !== 'all' && item.location !== selectedWarehouse) return false;
        if (searchQuery) { const q = searchQuery.toLowerCase(); if (!item.name.toLowerCase().includes(q) && !(item.item_number ? item.item_number.toLowerCase().includes(q) : false)) return false; }
        return true;
      }
      return false;
    });
  }, [items, filterCategory, selectedWarehouse, searchQuery]);

  const warehouseItems = selectedWarehouse === 'all' ? items : items.filter(item => item.location === selectedWarehouse);
  const stats = {
    totalItems: warehouseItems.length,
    lowStock: warehouseItems.filter(item => item.current_stock <= item.min_stock).length,
    totalValue: warehouseItems.reduce((sum, item) => sum + (item.current_stock * item.cost), 0),
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="white"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="cube" size={22} style={{ color: '#FFFFFF' }} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSubtitle}>
            {stats.totalItems} items{selectedWarehouse !== 'all' ? ` in ${selectedWarehouse}` : ''} • {stats.lowStock} low stock alerts
          </Text>
        </View>

        {/* Search Bar in Header */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} style={[styles.searchIcon, { color: themeColor }]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="add" size={16} color={themeColor} />
          <Text style={[styles.actionButtonText, { color: themeColor }]}>Add Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowSendItemsModal(true)}
        >
          <Icon name="send" size={16} color={themeColor} />
          <Text style={[styles.actionButtonText, { color: themeColor }]}>Send Items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowTransferHistoryModal(true)}
        >
          <Icon name="create" size={16} color={themeColor} />
          <Text style={[styles.actionButtonText, { color: themeColor }]}>Edit Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.success }]}
          onPress={() => setShowReceiveSupplyModal(true)}
        >
          <Icon name="download" size={16} color={colors.success} />
          <Text style={[styles.actionButtonText, { color: colors.success }]}>Supply Received</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/supervisor/inventory-transfer-statements')}
        >
          <Icon name="stats-chart" size={16} color={themeColor} />
          <Text style={[styles.actionButtonText, { color: themeColor }]}>Statements</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.primary }]}
          onPress={() => router.push('/supervisor/inventory-catalog')}
        >
          <Icon name="list" size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Item Directory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.warning }]}
          onPress={() => router.push('/supervisor/purchase-orders')}
        >
          <Icon name="document-text" size={16} color={colors.warning} />
          <Text style={[styles.actionButtonText, { color: colors.warning }]}>Purchase Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: '#8B5CF6' }]}
          onPress={() => router.push('/supervisor/building-cost-report')}
        >
          <Icon name="bar-chart" size={16} color="#8B5CF6" />
          <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Cost Report</Text>
        </TouchableOpacity>
      </View>

      {/* Warehouse Toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedWarehouse === 'all' && [styles.filterChipActive, { backgroundColor: themeColor, borderColor: themeColor }]]}
          onPress={() => setSelectedWarehouse('all')}
        >
          <Text style={[styles.filterChipText, selectedWarehouse === 'all' && styles.filterChipTextActive]}>
            All Warehouses
          </Text>
        </TouchableOpacity>
        {WAREHOUSES.map((wh) => (
          <TouchableOpacity
            key={wh}
            style={[styles.filterChip, selectedWarehouse === wh && [styles.filterChipActive, { backgroundColor: themeColor, borderColor: themeColor }]]}
            onPress={() => setSelectedWarehouse(wh)}
          >
            <Text style={[styles.filterChipText, selectedWarehouse === wh && styles.filterChipTextActive]}>
              {wh}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'all' && [styles.filterChipActive, { backgroundColor: themeColor, borderColor: themeColor }]]}
          onPress={() => setFilterCategory('all')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'cleaning-supplies' && [styles.filterChipActive, { backgroundColor: themeColor, borderColor: themeColor }]]}
          onPress={() => setFilterCategory('cleaning-supplies')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'cleaning-supplies' && styles.filterChipTextActive]}>
            Supplies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'equipment' && [styles.filterChipActive, { backgroundColor: themeColor, borderColor: themeColor }]]}
          onPress={() => setFilterCategory('equipment')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'equipment' && styles.filterChipTextActive]}>
            Equipment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'safety' && [styles.filterChipActive, { backgroundColor: themeColor, borderColor: themeColor }]]}
          onPress={() => setFilterCategory('safety')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'safety' && styles.filterChipTextActive]}>
            Safety
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle: Items / By Building */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'items' && [styles.viewToggleBtnActive, { borderColor: themeColor, backgroundColor: themeColor }]]}
          onPress={() => setViewMode('items')}
        >
          <Icon name="grid" size={14} color={viewMode === 'items' ? '#FFFFFF' : colors.text} />
          <Text style={[styles.viewToggleBtnText, viewMode === 'items' && styles.viewToggleBtnTextActive]}>Items</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'by-building' && [styles.viewToggleBtnActive, { borderColor: themeColor, backgroundColor: themeColor }]]}
          onPress={() => setViewMode('by-building')}
        >
          <Icon name="business" size={14} color={viewMode === 'by-building' ? '#FFFFFF' : colors.text} />
          <Text style={[styles.viewToggleBtnText, viewMode === 'by-building' && styles.viewToggleBtnTextActive]}>By Building</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: themeColor }]}>
          <View style={[styles.statIconContainer, { backgroundColor: themeColor + '15' }]}>
            <Icon name="cube" size={18} style={{ color: themeColor }} />
          </View>
          <Text style={styles.statValue}>{stats.totalItems}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.danger }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.danger + '15' }]}>
            <Icon name="alert-circle" size={18} style={{ color: colors.danger }} />
          </View>
          <Text style={[styles.statValue, { color: colors.danger }]}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.success + '15' }]}>
            <Icon name="cash" size={18} style={{ color: colors.success }} />
          </View>
          <Text style={[styles.statValue, { color: colors.success }]}>${stats.totalValue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Value</Text>
        </View>
      </View>

      <ScrollView>
        {viewMode === 'items' ? (
          /* ── Items grid view ── */
          filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="cube-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No items found' : 'No inventory items yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <AnimatedCard key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      {item.image_url ? (
                        <View
                          // @ts-ignore — web-only hover events
                          onMouseEnter={(e: any) => setHoveredImage({ url: item.image_url, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                          onMouseLeave={() => setHoveredImage(null)}
                        >
                          <Image source={{ uri: item.image_url }} style={{ width: 36, height: 36, borderRadius: 6 }} resizeMode="cover" />
                        </View>
                      ) : (
                        <Icon name={getCategoryIcon(item.category)} size={32} color={themeColor} />
                      )}
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      {item.item_number && (
                        <Text style={styles.itemProductNumber}>{item.item_number}</Text>
                      )}
                      {item.supply_type ? (
                        <Text style={[styles.itemProductNumber, { color: '#8B5CF6', marginTop: 2 }]}>{item.supply_type}</Text>
                      ) : null}
                    </View>

                    <View style={styles.itemInfo}>
                      <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
                        <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                          {item.current_stock} {item.unit}
                        </Text>
                      </View>
                      <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
                      {item.tax_per_unit && item.tax_per_unit > 0 ? (
                        <View>
                          <Text style={styles.infoText}>${item.cost.toFixed(2)}</Text>
                          <Text style={styles.costBreakdownText}>
                            ${(item.cost - item.tax_per_unit).toFixed(2)} + ${item.tax_per_unit.toFixed(2)} tax
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.infoText}>${item.cost.toFixed(2)}</Text>
                      )}
                    </View>

                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => openEditModal(item)}>
                        <Icon name="create" size={18} color={themeColor} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteItem(item.id, item.name)}>
                        <Icon name="trash" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </AnimatedCard>
                );
              })}
            </View>
          )
        ) : (
          /* ── By Building view ── */
          <View style={styles.buildingViewContainer}>
            {availableBuildings.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="business-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No buildings found</Text>
              </View>
            ) : (
              Object.entries(buildingViewData).map(([clientName, buildingEntries]) => {
                const isExpanded = expandedBuildingViewClients.has(clientName);
                const totalItemsForClient = buildingEntries.reduce((sum, e) => sum + e.buildingItems.length, 0);
                return (
                  <View key={clientName} style={{ marginBottom: spacing.sm }}>
                    {/* Client header (collapsible) */}
                    <TouchableOpacity
                      style={styles.bvClientHeader}
                      onPress={() => {
                        setExpandedBuildingViewClients(prev => {
                          const next = new Set(prev);
                          if (next.has(clientName)) next.delete(clientName);
                          else next.add(clientName);
                          return next;
                        });
                      }}
                    >
                      <Icon
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={20}
                        style={{ color: themeColor }}
                      />
                      <Text style={styles.bvClientName}>{clientName}</Text>
                      <View style={[styles.bvClientBadge, { backgroundColor: themeColor + '20' }]}>
                        <Text style={[styles.bvClientBadgeText, { color: themeColor }]}>
                          {buildingEntries.length} {buildingEntries.length === 1 ? 'building' : 'buildings'}
                        </Text>
                      </View>
                      <View style={[styles.bvClientBadge, { backgroundColor: totalItemsForClient > 0 ? colors.success + '20' : colors.border + '40' }]}>
                        <Text style={[styles.bvClientBadgeText, { color: totalItemsForClient > 0 ? colors.success : colors.textSecondary }]}>
                          {totalItemsForClient} items
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Building cards under this client */}
                    {isExpanded && buildingEntries.map(({ building, buildingItems }) => (
                      <View key={building.destination} style={styles.bvBuildingCard}>
                        {/* Building header */}
                        <View style={styles.bvBuildingHeader}>
                          <Icon name="location" size={16} style={{ color: themeColor }} />
                          <Text style={styles.bvBuildingName}>{building.buildingName}</Text>
                          <Text style={styles.bvBuildingCount}>
                            {buildingItems.length} {buildingItems.length === 1 ? 'item' : 'items'}
                          </Text>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: themeColor,
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 4,
                              borderRadius: 8,
                              gap: 3,
                            }}
                            onPress={() => setShowSendItemsModal(true)}
                          >
                            <Icon name="send" size={12} style={{ color: '#FFFFFF' }} />
                            <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '700' }}>Send</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Item rows */}
                        {buildingItems.length === 0 ? (
                          <View style={styles.bvNoItems}>
                            <Text style={styles.bvNoItemsText}>No items associated with this building</Text>
                          </View>
                        ) : (
                          buildingItems.map((item) => {
                            const stockStatus = getStockStatus(item);
                            return (
                              <View key={item.id} style={styles.bvItemRow}>
                                {item.image_url ? (
                                  <Image source={{ uri: item.image_url }} style={{ width: 28, height: 28, borderRadius: 5 }} resizeMode="cover" />
                                ) : (
                                  <Icon name={getCategoryIcon(item.category)} size={20} style={{ color: themeColor }} />
                                )}
                                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                  <Text style={styles.bvItemName}>{item.name}</Text>
                                  {item.item_number && (
                                    <Text style={styles.itemProductNumber}>{item.item_number}</Text>
                                  )}
                                  {item.supply_type ? (
                                    <Text style={[styles.itemProductNumber, { color: '#8B5CF6' }]}>{item.supply_type}</Text>
                                  ) : null}
                                  <Text style={styles.bvItemNumber}>{item.location}</Text>
                                </View>
                                <View style={[styles.bvItemStock, { backgroundColor: stockStatus.color + '20' }]}>
                                  <Text style={[styles.bvItemStockText, { color: stockStatus.color }]}>
                                    {item.current_stock} {item.unit}
                                  </Text>
                                </View>
                                <TouchableOpacity onPress={() => openEditModal(item)}>
                                  <Icon name="create" size={16} style={{ color: colors.textSecondary }} />
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}
                      </View>
                    ))}
                  </View>
                );
              })
            )}

            {/* Unassigned items section */}
            {unassignedItems.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <TouchableOpacity
                  style={styles.bvClientHeader}
                  onPress={() => {
                    setExpandedBuildingViewClients(prev => {
                      const next = new Set(prev);
                      if (next.has('__unassigned__')) next.delete('__unassigned__');
                      else next.add('__unassigned__');
                      return next;
                    });
                  }}
                >
                  <Icon
                    name={expandedBuildingViewClients.has('__unassigned__') ? 'chevron-down' : 'chevron-forward'}
                    size={20}
                    style={{ color: colors.textSecondary }}
                  />
                  <Text style={[styles.bvClientName, { color: colors.textSecondary }]}>Unassigned Items</Text>
                  <View style={[styles.bvClientBadge, { backgroundColor: colors.border + '40' }]}>
                    <Text style={[styles.bvClientBadgeText, { color: colors.textSecondary }]}>
                      {unassignedItems.length}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expandedBuildingViewClients.has('__unassigned__') && (
                  <View style={[styles.bvBuildingCard, { marginLeft: 0 }]}>
                    {unassignedItems.map((item) => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <View key={item.id} style={styles.bvItemRow}>
                          <Icon name={getCategoryIcon(item.category)} size={20} style={{ color: colors.textSecondary }} />
                          <View style={{ flex: 1, marginLeft: spacing.sm }}>
                            <Text style={styles.bvItemName}>{item.name}</Text>
                            {item.item_number && (
                              <Text style={styles.itemProductNumber}>{item.item_number}</Text>
                            )}
                            <Text style={styles.bvItemNumber}>{item.location}</Text>
                          </View>
                          <View style={[styles.bvItemStock, { backgroundColor: stockStatus.color + '20' }]}>
                            <Text style={[styles.bvItemStockText, { color: stockStatus.color }]}>
                              {item.current_stock} {item.unit}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => openEditModal(item)}>
                            <Icon name="create" size={16} style={{ color: colors.textSecondary }} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {restockRequests.length > 0 && (
          <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
            <Text style={[styles.modalTitle, { marginBottom: spacing.md }]}>Restock Requests</Text>
            {restockRequests.map((request) => (
              <AnimatedCard key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestName}>{request.item_name}</Text>
                  <View style={[styles.stockBadge, { backgroundColor: getPriorityColor(request.priority) + '20' }]}>
                    <Text style={[styles.stockBadgeText, { color: getPriorityColor(request.priority) }]}>
                      {request.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestInfo}>
                  <View style={styles.infoItem}>
                    <Icon name="cube" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>Qty: {request.quantity}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Icon name="person" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{request.requested_by}</Text>
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.stockBadgeText, { color: getStatusColor(request.status) }]}>
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {request.notes && (
                  <Text style={[styles.infoText, { marginTop: spacing.sm }]}>{request.notes}</Text>
                )}

                {request.status === 'pending' && (
                  <View style={styles.requestActions}>
                    <Button
                      title="Reject"
                      onPress={() => confirmRejectRequest(request.id)}
                      variant="secondary"
                      style={{ marginRight: spacing.sm }}
                    />
                    <Button
                      title="Approve"
                      onPress={() => handleApproveRequest(request.id)}
                      variant="primary"
                    />
                  </View>
                )}
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Send Items Modal */}
      <SendItemsModal
        visible={showSendItemsModal}
        onClose={() => setShowSendItemsModal(false)}
        inventory={items}
        onSend={handleSendItems}
        onWarehouseTransfer={handleWarehouseTransfer}
        onSuccess={() => loadInventoryData()}
        warehouses={WAREHOUSES as unknown as string[]}
      />

      {/* Transfer History Modal */}
      <TransferHistoryModal
        visible={showTransferHistoryModal}
        onClose={() => setShowTransferHistoryModal(false)}
        onRefresh={() => loadInventoryData()}
      />

      {/* Receive Supply Modal */}
      <ReceiveSupplyModal
        visible={showReceiveSupplyModal}
        onClose={() => setShowReceiveSupplyModal(false)}
        inventory={items}
        onReceive={handleReceiveSupply}
        onSuccess={() => loadInventoryData()}
        warehouses={WAREHOUSES as unknown as string[]}
      />

      {/* Add Item Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Inventory Item</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter item name"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.name}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Item / Product Number</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="e.g. ITM-A1B2C3 (auto-generated if blank)"
                    placeholderTextColor={colors.textSecondary}
                    value={newItemForm.item_number}
                    onChangeText={(text) => setNewItemForm({ ...newItemForm, item_number: text })}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: themeColor,
                      paddingHorizontal: spacing.md,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => setNewItemForm({ ...newItemForm, item_number: generateItemNumber() })}
                  >
                    <Icon name="refresh" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {['cleaning-supplies', 'equipment', 'safety'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        newItemForm.category === cat && styles.filterChipActive,
                      ]}
                      onPress={() => setNewItemForm({ ...newItemForm, category: cat as any })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          newItemForm.category === cat && styles.filterChipTextActive,
                        ]}
                      >
                        {cat === 'cleaning-supplies' ? 'Supplies' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.current_stock}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, current_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Min Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.min_stock}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, min_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="units, boxes, etc."
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.unit}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, unit: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Warehouse *</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {WAREHOUSES.map((wh) => (
                    <TouchableOpacity
                      key={wh}
                      style={[
                        styles.filterChip,
                        newItemForm.location === wh && styles.filterChipActive,
                      ]}
                      onPress={() => setNewItemForm({ ...newItemForm, location: wh })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          newItemForm.location === wh && styles.filterChipTextActive,
                        ]}
                      >
                        {wh}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost per Unit ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.cost}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, cost: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplier name"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.supplier}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, supplier: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowAddModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Add Item"
                onPress={handleAddItem}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Inventory Item</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter item name"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.name}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Item / Product Number</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="e.g. ITM-A1B2C3"
                    placeholderTextColor={colors.textSecondary}
                    value={editItemForm.item_number}
                    onChangeText={(text) => setEditItemForm({ ...editItemForm, item_number: text })}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: themeColor,
                      paddingHorizontal: spacing.md,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => setEditItemForm({ ...editItemForm, item_number: generateItemNumber() })}
                  >
                    <Icon name="refresh" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {['cleaning-supplies', 'equipment', 'safety'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        editItemForm.category === cat && styles.filterChipActive,
                      ]}
                      onPress={() => setEditItemForm({ ...editItemForm, category: cat as any })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          editItemForm.category === cat && styles.filterChipTextActive,
                        ]}
                      >
                        {cat === 'cleaning-supplies' ? 'Supplies' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Min Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.min_stock}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, min_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="units, boxes, etc."
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.unit}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, unit: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Warehouse *</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {WAREHOUSES.map((wh) => (
                    <TouchableOpacity
                      key={wh}
                      style={[
                        styles.filterChip,
                        editItemForm.location === wh && styles.filterChipActive,
                      ]}
                      onPress={() => setEditItemForm({ ...editItemForm, location: wh })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          editItemForm.location === wh && styles.filterChipTextActive,
                        ]}
                      >
                        {wh}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost per Unit ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.cost}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, cost: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplier name"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.supplier}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, supplier: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Associated Buildings</Text>
                <Text style={styles.buildingAssocDescription}>
                  Select buildings that frequently use this item
                </Text>

                {editItemForm.associated_buildings && editItemForm.associated_buildings.length > 0 ? (
                  <View style={styles.buildingChipsContainer}>
                    {editItemForm.associated_buildings.map((dest) => (
                      <TouchableOpacity
                        key={dest}
                        style={styles.buildingChip}
                        onPress={() => {
                          const filtered = editItemForm.associated_buildings.filter(b => b !== dest);
                          setEditItemForm({ ...editItemForm, associated_buildings: filtered });
                        }}
                      >
                        <Text style={styles.buildingChipText}>{dest}</Text>
                        <Icon name="close-circle" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <TextInput
                  style={styles.input}
                  placeholder="Search buildings..."
                  placeholderTextColor={colors.textSecondary}
                  value={buildingSearchQuery}
                  onChangeText={setBuildingSearchQuery}
                />

                <View style={styles.buildingListContainer}>
                  <ScrollView nestedScrollEnabled>
                    {availableBuildings
                      .filter(b => {
                        const isSelected = editItemForm.associated_buildings && editItemForm.associated_buildings.includes(b.destination);
                        return !isSelected;
                      })
                      .filter(b => {
                        if (!buildingSearchQuery) return true;
                        return b.destination.toLowerCase().includes(buildingSearchQuery.toLowerCase());
                      })
                      .map((b) => (
                        <TouchableOpacity
                          key={b.destination}
                          style={styles.buildingListItem}
                          onPress={() => {
                            const current = editItemForm.associated_buildings ? editItemForm.associated_buildings : [];
                            setEditItemForm({ ...editItemForm, associated_buildings: [...current, b.destination] });
                            setBuildingSearchQuery('');
                          }}
                        >
                          <Icon name="add-circle-outline" size={20} color={colors.primary} />
                          <View style={styles.buildingListItemText}>
                            <Text style={styles.buildingListItemName}>{b.buildingName}</Text>
                            <Text style={styles.buildingListItemClient}>{b.clientName}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleUpdateItem}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal (web-compatible) */}
      <Modal visible={deleteConfirmItem !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400, alignItems: 'center' }]}>
            <Icon name="trash" size={48} color={colors.error} />
            <Text style={[styles.modalTitle, { textAlign: 'center', marginTop: spacing.md }]}>Delete Item</Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
              Are you sure you want to delete {deleteConfirmItem?.name}? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setDeleteConfirmItem(null)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Delete"
                onPress={() => deleteConfirmItem && confirmDeleteItem(deleteConfirmItem.id)}
                variant="danger"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* Image hover tooltip */}
      {hoveredImage && (
        <View
          pointerEvents="none"
          // @ts-ignore — position: fixed is web-only
          style={{
            position: 'fixed',
            top: hoveredImage.y - 90,
            left: hoveredImage.x + 16,
            zIndex: 9999,
            backgroundColor: colors.surface,
            borderRadius: 10,
            padding: 8,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Image
            source={{ uri: hoveredImage.url }}
            style={{ width: 190, height: 190, borderRadius: 6 }}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
}
