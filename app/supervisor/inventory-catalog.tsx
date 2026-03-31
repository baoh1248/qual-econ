
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, Platform, Image, useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import Button from '../../components/Button';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import { formatCurrency } from '../../utils/inventoryTracking';
import uuid from 'react-native-uuid';
import BarcodeScanner from '../../components/inventory/BarcodeScanner';

// ─── Constants ────────────────────────────────────────────────────────────────

const WAREHOUSES = ['Sparks Warehouse', 'Regular Warehouse'];

// Relative flex weights — they are normalized to screen width at runtime
const COLUMNS = [
  { key: 'image',       label: 'Picture',              flex: 4.0,  sort: null },
  { key: 'item_number', label: 'Product Number',       flex: 7.5,  sort: 'alpha' as const },
  { key: 'name',        label: 'Item Name',            flex: 14.0, sort: 'alpha' as const },
  { key: 'supply_type', label: 'Type of Supply',       flex: 7.5,  sort: 'alpha' as const },
  { key: 'supplier',    label: 'Supplier',             flex: 7.0,  sort: 'alpha' as const },
  { key: 'unit',        label: 'Unit',                 flex: 3.5,  sort: 'alpha' as const },
  { key: 'avg_cost',    label: 'Cost per Unit/WAC',    flex: 14.5, sort: 'value' as const },
  { key: 'warehouse',   label: 'Warehouse',            flex: 13.0, sort: 'alpha' as const },
  { key: 'total_stock', label: 'Total',                flex: 5.5,  sort: 'value' as const },
  { key: 'buildings',   label: 'Associated Buildings', flex: 9.5,  sort: 'alpha' as const },
  { key: 'sent_to',     label: 'Sent To',              flex: 9.5,  sort: 'alpha' as const },
  { key: 'edit',        label: '',                     flex: 4.5,  sort: null },
];
const TOTAL_FLEX = COLUMNS.reduce((s, c) => s + c.flex, 0);

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'cleaning-supplies', label: 'Cleaning' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'safety', label: 'Safety' },
];

const SUPPLY_TYPES = [
  'Cleaning Chemical',
  'Disinfectant',
  'Paper Product',
  'Cleaning Tool',
  'PPE',
  'Equipment',
  'Trash Liner',
  'Janitorial Supply',
  'Other',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarehouseStock {
  warehouse: string;
  current_stock: number;
  min_stock: number;
  item_id: string;
  cost: number;
  associated_buildings: string[];
  sent_to: string[];
}

interface CatalogEntry {
  name: string;
  item_number: string;
  barcode: string;
  category: string;
  supply_type: string;
  image_url: string;
  unit: string;
  supplier: string;
  avg_cost: number;
  total_stock: number;
  by_warehouse: WarehouseStock[];
  is_low_stock: boolean;
  buildings_serviced: string[];
}

type CategoryFilter = 'all' | 'cleaning-supplies' | 'equipment' | 'safety';

const BLANK_FORM = {
  name: '',
  item_number: '',
  barcode: '',
  category: 'cleaning-supplies' as CategoryFilter,
  supply_type: '',
  image_url: '',
  unit: '',
  supplier: '',
};

// ─── Image upload helper ──────────────────────────────────────────────────────

async function uploadItemImage(localUri: string): Promise<string> {
  const fileName = `item_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const path = `items/${fileName}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('inventory-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('inventory-images').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InventoryCatalog() {
  const { toastVisible, toastMessage, toastType, showToast, hideToast } = useToast();
  const [hoveredImage, setHoveredImage] = useState<{ url: string; x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // key = item_id (one per warehouse row), value = that warehouse's buildings
  const [editBuildingsByWarehouse, setEditBuildingsByWarehouse] = useState<Record<string, string[]>>({});
  const [editWarehouseTab, setEditWarehouseTab] = useState<string>('');
  const [availableBuildings, setAvailableBuildings] = useState<Array<{ clientName: string; buildingName: string; destination: string }>>([]);
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeScanTarget, setBarcodeScanTarget] = useState<'edit' | 'add'>('edit');

  // Buildings popup (for +N more in table cells)
  const [buildingsPopup, setBuildingsPopup] = useState<{ title: string; items: string[] } | null>(null);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    ...BLANK_FORM,
    unit: 'unit',
    cost: '',
    min_stock: '',
    warehouse: WAREHOUSES[0],
  });
  const [adding, setAdding] = useState(false);
  const [uploadingAddImage, setUploadingAddImage] = useState(false);

  // Sort & filter
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterSupplyTypes, setFilterSupplyTypes] = useState<string[]>([]);
  const [filterWarehouses, setFilterWarehouses] = useState<string[]>([]);
  const [filterBuildings, setFilterBuildings] = useState<string[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load inventory items + recent outgoing transfers in parallel
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [itemsRes, transfersRes] = await Promise.all([
        supabase.from('inventory_items').select('*').order('name'),
        supabase
          .from('inventory_transfers')
          .select('destination, items, sent_from')
          .eq('type', 'outgoing')
          .gte('created_at', ninetyDaysAgo),
      ]);

      if (itemsRes.error) throw itemsRes.error;

      // Build per-warehouse sent-to map: itemNameLower → warehouseName → Set<destination>
      const warehouseSentToMap: Record<string, Record<string, Set<string>>> = {};
      // Also build a global sent-to map for items with no warehouse source info
      const globalSentToMap: Record<string, Set<string>> = {};
      for (const t of transfersRes.data || []) {
        const dest = t.destination?.trim();
        if (!dest) continue;
        const fromWh = t.sent_from?.trim() || null;
        const items = Array.isArray(t.items) ? t.items : [];
        for (const itm of items) {
          const key = (itm.item_name || '').toLowerCase().trim();
          if (!key) continue;
          if (fromWh) {
            if (!warehouseSentToMap[key]) warehouseSentToMap[key] = {};
            if (!warehouseSentToMap[key][fromWh]) warehouseSentToMap[key][fromWh] = new Set();
            warehouseSentToMap[key][fromWh].add(dest);
          }
          if (!globalSentToMap[key]) globalSentToMap[key] = new Set();
          globalSentToMap[key].add(dest);
        }
      }

      const groups: Record<string, any[]> = {};
      for (const item of itemsRes.data || []) {
        const key = item.name.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      const entries: CatalogEntry[] = Object.values(groups).map(items => {
        const totalStock = items.reduce((s, i) => s + (i.current_stock || 0), 0);
        const totalValue = items.reduce((s, i) => s + (i.current_stock || 0) * (i.cost || 0), 0);
        const avgCost = totalStock > 0 ? totalValue / totalStock : (items[0]?.cost || 0);
        const isLowStock = items.some(i => (i.current_stock || 0) <= (i.min_stock || 0) && (i.min_stock || 0) > 0);

        const master = items.sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        )[0];

        const nameKey = master.name.toLowerCase().trim();
        // Aggregate all sent-to destinations across warehouses for the top-level field
        const allSentTo: string[] = globalSentToMap[nameKey]
          ? Array.from(globalSentToMap[nameKey]).sort()
          : [];

        // Union all associated_buildings across warehouse rows for top-level field
        const allBuildings = new Set<string>();
        for (const i of items) {
          if (Array.isArray(i.associated_buildings)) {
            i.associated_buildings.forEach((b: string) => allBuildings.add(b));
          }
        }

        return {
          name: master.name,
          item_number: master.item_number || '',
          barcode: master.barcode || '',
          category: master.category || 'cleaning-supplies',
          supply_type: master.supply_type || '',
          image_url: master.image_url || '',
          unit: master.unit || 'unit',
          supplier: master.supplier || '',
          avg_cost: avgCost,
          total_stock: totalStock,
          is_low_stock: isLowStock,
          buildings_serviced: Array.from(allBuildings).sort(),
          by_warehouse: items.map(i => ({
            warehouse: i.location || 'Unknown',
            current_stock: i.current_stock || 0,
            min_stock: i.min_stock || 0,
            item_id: i.id,
            cost: i.cost || 0,
            associated_buildings: Array.isArray(i.associated_buildings) ? i.associated_buildings : [],
            sent_to: warehouseSentToMap[nameKey]?.[i.location]
              ? Array.from(warehouseSentToMap[nameKey][i.location]).sort()
              : allSentTo,
          })),
        };
      });

      entries.sort((a, b) => {
        if (a.is_low_stock && !b.is_low_stock) return -1;
        if (!a.is_low_stock && b.is_low_stock) return 1;
        return a.name.localeCompare(b.name);
      });

      setCatalog(entries);
    } catch (err) {
      console.error('Failed to load catalog:', err);
      showToast('Failed to load item directory', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { loadCatalog(); }, [loadCatalog]));

  // ── Image picker ──────────────────────────────────────────────────────────

  const pickImage = async (
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void,
  ) => {
    Alert.alert('Add Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') { Alert.alert('Permission needed'); return; }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.75,
          });
          if (!result.canceled) await handleImageSelected(result.assets[0].uri, setUploading, setUrl);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') { Alert.alert('Permission needed'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.75,
          });
          if (!result.canceled) await handleImageSelected(result.assets[0].uri, setUploading, setUrl);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImageSelected = async (
    uri: string,
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void,
  ) => {
    try {
      setUploading(true);
      const publicUrl = await uploadItemImage(uri);
      setUrl(publicUrl);
    } catch (err: any) {
      // If storage bucket isn't set up, keep local URI as temp preview
      // and inform user what SQL to run
      console.warn('Storage upload failed:', err?.message);
      setUrl(uri);
      showToast('Image saved locally — run SQL below to enable cloud storage', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const loadAvailableBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('client_buildings')
        .select('client_name, building_name')
        .order('client_name', { ascending: true });
      if (!error && data) {
        setAvailableBuildings(data.map((b: { client_name: string; building_name: string }) => ({
          clientName: b.client_name,
          buildingName: b.building_name,
          destination: b.client_name + ' - ' + b.building_name,
        })));
      }
    } catch (e) {
      console.error('Failed to load buildings:', e);
    }
  };

  const openEdit = (entry: CatalogEntry) => {
    setEditingEntry(entry);
    setEditForm({
      name: entry.name,
      item_number: entry.item_number,
      barcode: entry.barcode,
      category: entry.category as CategoryFilter,
      supply_type: entry.supply_type,
      image_url: entry.image_url,
      unit: entry.unit,
      supplier: entry.supplier,
    });
    const byWh: Record<string, string[]> = {};
    for (const ws of entry.by_warehouse) {
      byWh[ws.item_id] = [...ws.associated_buildings];
    }
    setEditBuildingsByWarehouse(byWh);
    setEditWarehouseTab(entry.by_warehouse[0]?.item_id || '');
    setBuildingSearchQuery('');
    if (availableBuildings.length === 0) loadAvailableBuildings();
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingEntry || !editForm.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    try {
      setSaving(true);
      // Update shared fields (name, unit, etc.) across all warehouse rows
      const updateFields = {
        name: editForm.name.trim(),
        item_number: editForm.item_number.trim() || null,
        barcode: editForm.barcode.trim() || null,
        category: editForm.category,
        supply_type: editForm.supply_type.trim() || null,
        image_url: editForm.image_url.trim() || null,
        unit: editForm.unit.trim(),
        supplier: editForm.supplier.trim(),
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from('inventory_items')
        .update(updateFields)
        .ilike('name', editingEntry.name);

      // If a column doesn't exist yet (migration pending), retry without migration-dependent columns
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        console.warn('⚠️ Column not found — retrying without migration-dependent columns:', error.message);
        const { item_number: _a, barcode: _b, supply_type: _c, image_url: _d, ...fallbackFields } = updateFields;
        const { error: fallbackError } = await supabase
          .from('inventory_items')
          .update(fallbackFields)
          .ilike('name', editingEntry.name);
        error = fallbackError;
      }

      if (error) throw error;

      // Update associated_buildings per warehouse row individually
      for (const [itemId, buildings] of Object.entries(editBuildingsByWarehouse)) {
        const { error: bErr } = await supabase
          .from('inventory_items')
          .update({ associated_buildings: buildings })
          .eq('id', itemId);
        if (bErr) throw bErr;
      }

      showToast('Item updated across all warehouses', 'success');
      setShowEditModal(false);
      loadCatalog();
    } catch (err) {
      console.error('Failed to save:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Add ───────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    try {
      setAdding(true);
      const insertFields = {
        id: uuid.v4() as string,
        name: addForm.name.trim(),
        item_number: addForm.item_number.trim() || null,
        barcode: addForm.barcode.trim() || null,
        category: addForm.category,
        supply_type: addForm.supply_type.trim() || null,
        image_url: addForm.image_url.trim() || null,
        unit: addForm.unit.trim() || 'unit',
        supplier: addForm.supplier.trim() || '',
        cost: parseFloat(addForm.cost) || 0,
        current_stock: 0,
        min_stock: parseInt(addForm.min_stock) || 0,
        max_stock: 0,
        location: addForm.warehouse,
        auto_reorder_enabled: false,
        reorder_quantity: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase.from('inventory_items').insert(insertFields);

      // If a column doesn't exist yet (migration pending), retry without migration-dependent columns
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        console.warn('⚠️ Column not found — retrying without migration-dependent columns:', error.message);
        const { item_number: _a, barcode: _b, supply_type: _c, image_url: _d, ...fallbackFields } = insertFields;
        const { error: fallbackError } = await supabase.from('inventory_items').insert(fallbackFields);
        error = fallbackError;
      }

      if (error) throw error;
      showToast(`"${addForm.name.trim()}" added to ${addForm.warehouse}`, 'success');
      setShowAddModal(false);
      setAddForm({ ...BLANK_FORM, unit: 'unit', cost: '', min_stock: '', warehouse: WAREHOUSES[0] });
      loadCatalog();
    } catch (err) {
      console.error('Failed to add item:', err);
      showToast('Failed to add item', 'error');
    } finally {
      setAdding(false);
    }
  };

  // ── Sort & filter ─────────────────────────────────────────────────────────

  const handleSort = (col: string) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else setSortCol(null);
  };

  const getSortValue = (entry: CatalogEntry, col: string): string | number => {
    switch (col) {
      case 'item_number': return entry.item_number.toLowerCase();
      case 'name':        return entry.name.toLowerCase();
      case 'supply_type': return entry.supply_type.toLowerCase();
      case 'supplier':    return entry.supplier.toLowerCase();
      case 'unit':        return entry.unit.toLowerCase();
      case 'warehouse':   return entry.by_warehouse.map(w => w.warehouse).join(', ').toLowerCase();
      case 'buildings':
      case 'sent_to':     return entry.buildings_serviced.join(', ').toLowerCase();
      case 'avg_cost':    return entry.avg_cost;
      case 'total_stock': return entry.total_stock;
      default:            return '';
    }
  };

  const allBuildings = useMemo(
    () => [...new Set(catalog.flatMap(e => e.buildings_serviced))].sort(),
    [catalog],
  );

  const activeFilterCount = filterSupplyTypes.length + filterWarehouses.length + filterBuildings.length;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let result = catalog.filter(entry => {
      const matchesSearch = !q ||
        entry.name.toLowerCase().includes(q) ||
        entry.item_number.toLowerCase().includes(q) ||
        entry.barcode.toLowerCase().includes(q) ||
        entry.supplier.toLowerCase().includes(q) ||
        entry.supply_type.toLowerCase().includes(q) ||
        entry.buildings_serviced.some(b => b.toLowerCase().includes(q));
      const matchesSupplyType = !filterSupplyTypes.length || filterSupplyTypes.includes(entry.supply_type);
      const matchesWarehouse  = !filterWarehouses.length  || entry.by_warehouse.some(w => filterWarehouses.includes(w.warehouse));
      const matchesBuilding   = !filterBuildings.length   || entry.buildings_serviced.some(b => filterBuildings.includes(b));
      return matchesSearch && matchesSupplyType && matchesWarehouse && matchesBuilding;
    });
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = getSortValue(a, sortCol);
        const bv = getSortValue(b, sortCol);
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [catalog, searchQuery, filterSupplyTypes, filterWarehouses, filterBuildings, sortCol, sortDir]);

  const stats = {
    total: catalog.length,
    lowStock: catalog.filter(e => e.is_low_stock).length,
    outOfStock: catalog.filter(e => e.total_stock === 0).length,
  };

  const getStockColor = (entry: CatalogEntry) => {
    if (entry.total_stock === 0) return colors.danger;
    if (entry.is_low_stock) return colors.warning;
    return colors.success;
  };

  const toggleFilter = <T,>(arr: T[], setArr: (v: T[]) => void, val: T) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  // Compute pixel width of each column from screen width
  const { width: screenWidth } = useWindowDimensions();
  const colW = (key: string) => {
    const col = COLUMNS.find(c => c.key === key)!;
    return (screenWidth * col.flex) / TOTAL_FLEX;
  };

  const sortIcon = (col: string) => {
    if (sortCol !== col) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  // ── Shared form sections ──────────────────────────────────────────────────

  const renderImagePicker = (
    imageUrl: string,
    setUrl: (v: string) => void,
    uploading: boolean,
    setUploading: (v: boolean) => void,
  ) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>Item Photo</Text>
      <View style={[commonStyles.row, { gap: spacing.md, alignItems: 'flex-start' }]}>
        {/* Thumbnail preview */}
        <TouchableOpacity
          onPress={() => pickImage(setUploading, setUrl)}
          style={styles.imagePicker}
          activeOpacity={0.8}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera" size={28} style={{ color: colors.textSecondary }} />
              <Text style={styles.imagePlaceholderText}>Add Photo</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.imageOverlay}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Uploading…</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <TextInput
            style={[commonStyles.textInput, { fontSize: 13 }]}
            value={imageUrl}
            onChangeText={setUrl}
            placeholder="Or paste image URL…"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
          {imageUrl ? (
            <TouchableOpacity onPress={() => setUrl('')} style={{ marginTop: spacing.xs }}>
              <Text style={{ fontSize: 12, color: colors.danger }}>Remove photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderSupplyTypePicker = (
    value: string,
    onChange: (v: string) => void,
  ) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>Type of Supply</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
        <View style={{ flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.md }}>
          {SUPPLY_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChipBtn, value === t && styles.typeChipBtnActive]}
              onPress={() => onChange(value === t ? '' : t)}
            >
              <Text style={[styles.typeChipBtnText, value === t && styles.typeChipBtnTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <TextInput
        style={[commonStyles.textInput, { fontSize: 13 }]}
        value={value}
        onChangeText={onChange}
        placeholder="Or type a custom supply type…"
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

      {/* Header */}
      <View style={styles.header}>
        <View style={commonStyles.row}>
          <IconButton icon="arrow-back" onPress={() => router.back()} variant="white" />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={styles.headerTitle}>Item Directory</Text>
            <Text style={styles.headerSubtitle}>
              {stats.total} products · {stats.lowStock > 0 ? `${stats.lowStock} low stock` : 'all stocked'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Icon name="add" size={20} color={colors.background} />
          <Text style={styles.addBtnText}>New Item</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statPill}>
          <Icon name="cube" size={14} color={colors.primary} />
          <Text style={styles.statText}>{stats.total} products</Text>
        </View>
        {stats.lowStock > 0 && (
          <View style={[styles.statPill, { backgroundColor: colors.warning + '20' }]}>
            <Icon name="alert" size={14} color={colors.warning} />
            <Text style={[styles.statText, { color: colors.warning }]}>{stats.lowStock} low stock</Text>
          </View>
        )}
        {stats.outOfStock > 0 && (
          <View style={[styles.statPill, { backgroundColor: colors.danger + '20' }]}>
            <Icon name="close-circle" size={14} color={colors.danger} />
            <Text style={[styles.statText, { color: colors.danger }]}>{stats.outOfStock} out of stock</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} style={{ color: colors.textSecondary, marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, item #, supplier, supply type…"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={18} style={{ color: colors.textSecondary }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="options" size={16} color={activeFilterCount > 0 ? '#fff' : colors.primary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#fff' }]}>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Active filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
          contentContainerStyle={{ gap: spacing.xs, paddingLeft: spacing.xs }}>
          {filterSupplyTypes.map(t => (
            <TouchableOpacity key={t} style={styles.activeChip}
              onPress={() => toggleFilter(filterSupplyTypes, setFilterSupplyTypes, t)}>
              <Text style={styles.activeChipText}>{t}</Text>
              <Icon name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {filterWarehouses.map(w => (
            <TouchableOpacity key={w} style={styles.activeChip}
              onPress={() => toggleFilter(filterWarehouses, setFilterWarehouses, w)}>
              <Text style={styles.activeChipText}>{w}</Text>
              <Icon name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {filterBuildings.map(b => (
            <TouchableOpacity key={b} style={styles.activeChip}
              onPress={() => toggleFilter(filterBuildings, setFilterBuildings, b)}>
              <Text style={styles.activeChipText}>{b}</Text>
              <Icon name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearChip}
              onPress={() => { setFilterSupplyTypes([]); setFilterWarehouses([]); setFilterBuildings([]); }}>
              <Text style={styles.clearChipText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Text style={styles.resultCount}>{filtered.length} items</Text>
      </View>

      {isLoading ? <LoadingSpinner /> : (
        <ScrollView style={{ flex: 1 }}>

          {/* ── Table header ── */}
          <View style={styles.tableHeader}>
            {COLUMNS.map(col => (
              <TouchableOpacity
                key={col.key}
                style={[styles.headerCell, { width: colW(col.key) }]}
                onPress={() => col.sort ? handleSort(col.key) : undefined}
                activeOpacity={col.sort ? 0.7 : 1}
              >
                <Text style={styles.headerText} numberOfLines={2}>{col.label}</Text>
                {col.sort && (
                  <Text style={[styles.sortIcon, sortCol === col.key && styles.sortIconActive]}>
                    {sortIcon(col.key)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Table rows ── */}
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="cube" size={40} style={{ color: colors.textSecondary }} />
              <Text style={styles.emptyText}>
                {searchQuery || activeFilterCount > 0 ? 'No items match filters' : 'No items in directory'}
              </Text>
            </View>
          ) : (
            filtered.map((entry, idx) => {
              const rowBg = entry.is_low_stock
                ? colors.warning + '08'
                : idx % 2 === 0 ? colors.surface : '#FAFBFC';
              return (
                <View key={entry.name} style={[
                  styles.tableRow,
                  { backgroundColor: rowBg },
                  entry.is_low_stock && styles.tableRowLow,
                ]}>

                  {/* Picture */}
                  <View style={[styles.cell, { width: colW('image'), alignItems: 'center' }]}>
                    {entry.image_url ? (
                      <View
                        // @ts-ignore — web-only hover events
                        onMouseEnter={(e: any) => setHoveredImage({ url: entry.image_url, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                        onMouseLeave={() => setHoveredImage(null)}
                      >
                        <Image source={{ uri: entry.image_url }} style={styles.cellThumb} resizeMode="cover" />
                      </View>
                    ) : (
                      <View style={styles.cellThumbPlaceholder}>
                        <Icon name="cube-outline" size={20} style={{ color: colors.textSecondary }} />
                      </View>
                    )}
                    {entry.is_low_stock && <View style={styles.lowDot} />}
                  </View>

                  {/* Product Number */}
                  <View style={[styles.cell, { width: colW('item_number') }]}>
                    {entry.item_number
                      ? <Text style={styles.cellItemNum}>#{entry.item_number}</Text>
                      : <Text style={styles.cellMuted}>—</Text>}
                  </View>

                  {/* Item Name */}
                  <View style={[styles.cell, { width: colW('name') }]}>
                    <Text style={styles.cellName} numberOfLines={3}>{entry.name}</Text>
                    {entry.is_low_stock && (
                      <View style={styles.lowBadge}><Text style={styles.lowBadgeText}>LOW</Text></View>
                    )}
                  </View>

                  {/* Type of Supply */}
                  <View style={[styles.cell, { width: colW('supply_type') }]}>
                    <Text style={styles.cellText} numberOfLines={2}>{entry.supply_type || '—'}</Text>
                  </View>

                  {/* Supplier */}
                  <View style={[styles.cell, { width: colW('supplier') }]}>
                    <Text style={styles.cellText} numberOfLines={2}>{entry.supplier || '—'}</Text>
                  </View>

                  {/* Type of Unit */}
                  <View style={[styles.cell, { width: colW('unit') }]}>
                    <Text style={styles.cellText}>{entry.unit}</Text>
                  </View>

                  {/* Cost per Unit/WAC */}
                  <View style={[styles.cell, { width: colW('avg_cost') }]}>
                    {entry.by_warehouse.length > 1 ? (
                      entry.by_warehouse.map(ws => (
                        <Text key={ws.warehouse} style={styles.cellCost}>
                          {ws.warehouse === 'Sparks Warehouse' ? 'Sparks' : 'Regular'}: {formatCurrency(ws.cost)}/{entry.unit}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.cellCost}>{formatCurrency(entry.avg_cost)}/{entry.unit}</Text>
                    )}
                  </View>

                  {/* Warehouse */}
                  <View style={[styles.cell, { width: colW('warehouse') }]}>
                    {entry.by_warehouse.map(ws => {
                      const isLow = ws.current_stock <= ws.min_stock && ws.min_stock > 0;
                      return (
                        <Text key={ws.warehouse} style={styles.cellText} numberOfLines={1}>
                          {ws.warehouse}{' '}
                          <Text style={{ color: isLow ? colors.warning : colors.success, fontWeight: '700' }}>
                            {ws.current_stock} {entry.unit}{isLow ? ' △' : ''}
                          </Text>
                        </Text>
                      );
                    })}
                  </View>

                  {/* Total */}
                  <View style={[styles.cell, { width: colW('total_stock') }]}>
                    <Text style={[styles.cellCost, { color: getStockColor(entry) }]}>
                      {entry.total_stock} {entry.unit}
                    </Text>
                  </View>

                  {/* Associated Buildings */}
                  <View style={[styles.cell, { width: colW('buildings') }]}>
                    {(() => {
                      const isMulti = entry.by_warehouse.length > 1;
                      if (isMulti) {
                        return entry.by_warehouse.map(ws => {
                          const label = ws.warehouse === 'Sparks Warehouse' ? 'Sparks' : 'Regular';
                          const list = ws.associated_buildings;
                          if (list.length === 0) return <Text key={ws.warehouse} style={styles.cellMuted}>{label}: —</Text>;
                          return (
                            <View key={ws.warehouse} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 }}>
                              <Text style={[styles.cellText, { fontWeight: '700' }]}>{label}: </Text>
                              <Text style={styles.cellText} numberOfLines={1}>{list[0]}</Text>
                              {list.length > 1 && (
                                <TouchableOpacity
                                  style={styles.moreChip}
                                  onPress={() => setBuildingsPopup({ title: `${label} — Associated Buildings`, items: list })}
                                >
                                  <Text style={styles.moreChipText}>+{list.length - 1}</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        });
                      }
                      const list = entry.buildings_serviced;
                      if (list.length === 0) return <Text style={styles.cellMuted}>—</Text>;
                      return (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={styles.cellText} numberOfLines={1}>{list[0]}</Text>
                          {list.length > 1 && (
                            <TouchableOpacity
                              style={styles.moreChip}
                              onPress={() => setBuildingsPopup({ title: 'Associated Buildings', items: list })}
                            >
                              <Text style={styles.moreChipText}>+{list.length - 1}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })()}
                  </View>

                  {/* Sent To */}
                  <View style={[styles.cell, { width: colW('sent_to') }]}>
                    {(() => {
                      const isMulti = entry.by_warehouse.length > 1;
                      if (isMulti) {
                        return entry.by_warehouse.map(ws => {
                          const label = ws.warehouse === 'Sparks Warehouse' ? 'Sparks' : 'Regular';
                          const list = ws.sent_to;
                          if (list.length === 0) return <Text key={ws.warehouse} style={styles.cellMuted}>{label}: —</Text>;
                          return (
                            <View key={ws.warehouse} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 }}>
                              <Text style={[styles.cellText, { fontWeight: '700' }]}>{label}: </Text>
                              <Text style={styles.cellText} numberOfLines={1}>{list[0]}</Text>
                              {list.length > 1 && (
                                <TouchableOpacity
                                  style={styles.moreChip}
                                  onPress={() => setBuildingsPopup({ title: `${label} — Sent To`, items: list })}
                                >
                                  <Text style={styles.moreChipText}>+{list.length - 1}</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        });
                      }
                      const list = entry.buildings_serviced;
                      if (list.length === 0) return <Text style={styles.cellMuted}>—</Text>;
                      return (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={styles.cellText} numberOfLines={1}>{list[0]}</Text>
                          {list.length > 1 && (
                            <TouchableOpacity
                              style={styles.moreChip}
                              onPress={() => setBuildingsPopup({ title: 'Sent To', items: list })}
                            >
                              <Text style={styles.moreChipText}>+{list.length - 1}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })()}
                  </View>

                  {/* Edit */}
                  <View style={[styles.cell, { width: colW('edit'), alignItems: 'center' }]}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(entry)}>
                      <Icon name="create" size={17} color={colors.primary} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── Buildings Popup ──────────────────────────────────────────────────── */}
      <Modal
        visible={!!buildingsPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setBuildingsPopup(null)}
      >
        <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setBuildingsPopup(null)}>
          <View style={styles.popupSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>{buildingsPopup?.title}</Text>
              <TouchableOpacity onPress={() => setBuildingsPopup(null)}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {(buildingsPopup?.items || []).map((item, idx) => (
                <View key={idx} style={styles.popupItem}>
                  <Icon name="business-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.popupItemText}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Filter Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[commonStyles.header, { backgroundColor: colors.primary }]}>
              <IconButton icon="close" onPress={() => setShowFilterModal(false)} variant="white" />
              <Text style={commonStyles.headerTitle}>Filter Directory</Text>
              {activeFilterCount > 0 ? (
                <TouchableOpacity onPress={() => { setFilterSupplyTypes([]); setFilterWarehouses([]); setFilterBuildings([]); }}
                  style={{ paddingHorizontal: spacing.sm }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Clear all</Text>
                </TouchableOpacity>
              ) : <View style={{ width: 60 }} />}
            </View>

            <ScrollView style={commonStyles.content}>
              {/* Type of Supply */}
              <Text style={styles.fieldLabel}>Type of Supply</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
                {SUPPLY_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.filterModalChip, filterSupplyTypes.includes(t) && styles.filterModalChipActive]}
                    onPress={() => toggleFilter(filterSupplyTypes, setFilterSupplyTypes, t)}
                  >
                    <Text style={[styles.filterModalChipText, filterSupplyTypes.includes(t) && styles.filterModalChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Warehouse */}
              <Text style={styles.fieldLabel}>Warehouse</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
                {WAREHOUSES.map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.filterModalChip, filterWarehouses.includes(w) && styles.filterModalChipActive]}
                    onPress={() => toggleFilter(filterWarehouses, setFilterWarehouses, w)}
                  >
                    <Text style={[styles.filterModalChipText, filterWarehouses.includes(w) && styles.filterModalChipTextActive]}>
                      {w}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Associated Buildings */}
              {allBuildings.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Associated Buildings</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
                    {allBuildings.map(b => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.filterModalChip, filterBuildings.includes(b) && styles.filterModalChipActive]}
                        onPress={() => toggleFilter(filterBuildings, setFilterBuildings, b)}
                      >
                        <Text style={[styles.filterModalChipText, filterBuildings.includes(b) && styles.filterModalChipTextActive]}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Button
                title="Apply Filters"
                onPress={() => setShowFilterModal(false)}
                variant="primary"
                style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[commonStyles.header, { backgroundColor: colors.primary }]}>
              <IconButton icon="close" onPress={() => setShowEditModal(false)} variant="white" />
              <Text style={commonStyles.headerTitle}>Edit Item</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={commonStyles.content}>
              <Text style={[typography.caption, { color: colors.warning, marginBottom: spacing.md, backgroundColor: colors.warning + '15', padding: spacing.sm, borderRadius: 8 }]}>
                Changes apply to this item across ALL warehouses.
              </Text>

              {/* Photo */}
              {renderImagePicker(
                editForm.image_url,
                v => setEditForm(f => ({ ...f, image_url: v })),
                uploadingImage,
                setUploadingImage,
              )}

              <Text style={styles.fieldLabel}>Item Name *</Text>
              <TextInput
                style={commonStyles.textInput}
                value={editForm.name}
                onChangeText={v => setEditForm(f => ({ ...f, name: v }))}
                placeholder="Item name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Item Number</Text>
              <TextInput
                style={commonStyles.textInput}
                value={editForm.item_number}
                onChangeText={v => setEditForm(f => ({ ...f, item_number: v }))}
                placeholder="e.g. CLN-001"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Barcode</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  style={[commonStyles.textInput, { flex: 1 }]}
                  value={editForm.barcode}
                  onChangeText={v => setEditForm(f => ({ ...f, barcode: v }))}
                  placeholder="Enter barcode number"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: spacing.md,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => { setBarcodeScanTarget('edit'); setShowBarcodeScanner(true); }}
                >
                  <Icon name="barcode-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Supply type */}
              {renderSupplyTypePicker(
                editForm.supply_type,
                v => setEditForm(f => ({ ...f, supply_type: v })),
              )}

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
                {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.segBtn, editForm.category === cat.key && styles.segBtnActive]}
                    onPress={() => setEditForm(f => ({ ...f, category: cat.key as CategoryFilter }))}
                  >
                    <Text style={[styles.segBtnText, editForm.category === cat.key && styles.segBtnTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput
                style={commonStyles.textInput}
                value={editForm.unit}
                onChangeText={v => setEditForm(f => ({ ...f, unit: v }))}
                placeholder="e.g. bottle, roll, pack"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Supplier</Text>
              <TextInput
                style={commonStyles.textInput}
                value={editForm.supplier}
                onChangeText={v => setEditForm(f => ({ ...f, supplier: v }))}
                placeholder="Supplier name"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Associated Buildings */}
              <Text style={styles.fieldLabel}>Associated Buildings</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                Select buildings that regularly use this item
              </Text>

              {/* Warehouse tab selector — shown only when item is in multiple warehouses */}
              {editingEntry && editingEntry.by_warehouse.length > 1 && (
                <View style={styles.whTabRow}>
                  {editingEntry.by_warehouse.map(ws => {
                    const label = ws.warehouse === 'Sparks Warehouse' ? 'Sparks Warehouse' : 'Regular Warehouse';
                    const count = (editBuildingsByWarehouse[ws.item_id] || []).length;
                    const active = editWarehouseTab === ws.item_id;
                    return (
                      <TouchableOpacity
                        key={ws.item_id}
                        style={[styles.whTab, active && styles.whTabActive]}
                        onPress={() => { setEditWarehouseTab(ws.item_id); setBuildingSearchQuery(''); }}
                      >
                        <Text style={[styles.whTabText, active && styles.whTabTextActive]}>{label}</Text>
                        {count > 0 && (
                          <View style={[styles.whTabBadge, active && styles.whTabBadgeActive]}>
                            <Text style={[styles.whTabBadgeText, active && styles.whTabBadgeTextActive]}>{count}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Buildings for the active warehouse tab */}
              {(() => {
                const activeBuildings = editBuildingsByWarehouse[editWarehouseTab] || [];
                const setActiveBuildings = (list: string[]) =>
                  setEditBuildingsByWarehouse(prev => ({ ...prev, [editWarehouseTab]: list }));
                return (
                  <>
                    {activeBuildings.length > 0 && (
                      <View style={styles.editBuildingChips}>
                        {activeBuildings.map(dest => (
                          <TouchableOpacity
                            key={dest}
                            style={styles.editBuildingChip}
                            onPress={() => setActiveBuildings(activeBuildings.filter(b => b !== dest))}
                          >
                            <Text style={styles.editBuildingChipText}>{dest}</Text>
                            <Icon name="close-circle" size={15} color={colors.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <TextInput
                      style={commonStyles.textInput}
                      placeholder="Search buildings…"
                      placeholderTextColor={colors.textSecondary}
                      value={buildingSearchQuery}
                      onChangeText={setBuildingSearchQuery}
                    />
                    <View style={styles.editBuildingList}>
                      <ScrollView nestedScrollEnabled>
                        {availableBuildings
                          .filter(b => !activeBuildings.includes(b.destination))
                          .filter(b => !buildingSearchQuery || b.destination.toLowerCase().includes(buildingSearchQuery.toLowerCase()))
                          .map(b => (
                            <TouchableOpacity
                              key={b.destination}
                              style={styles.editBuildingListItem}
                              onPress={() => {
                                setActiveBuildings([...activeBuildings, b.destination]);
                                setBuildingSearchQuery('');
                              }}
                            >
                              <Icon name="add-circle-outline" size={18} color={colors.primary} />
                              <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                <Text style={styles.editBuildingName}>{b.buildingName}</Text>
                                <Text style={styles.editBuildingClient}>{b.clientName}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  </>
                );
              })()}

              <Button
                title={saving ? 'Saving…' : 'Save Changes'}
                onPress={saveEdit}
                disabled={saving || uploadingImage}
                variant="primary"
                style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Item Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[commonStyles.header, { backgroundColor: colors.success }]}>
              <IconButton icon="close" onPress={() => setShowAddModal(false)} variant="white" />
              <Text style={commonStyles.headerTitle}>New Catalog Item</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={commonStyles.content}>
              {/* Photo */}
              {renderImagePicker(
                addForm.image_url,
                v => setAddForm(f => ({ ...f, image_url: v })),
                uploadingAddImage,
                setUploadingAddImage,
              )}

              <Text style={styles.fieldLabel}>Item Name *</Text>
              <TextInput
                style={commonStyles.textInput}
                value={addForm.name}
                onChangeText={v => setAddForm(f => ({ ...f, name: v }))}
                placeholder="e.g. All-Purpose Cleaner"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Item Number</Text>
              <TextInput
                style={commonStyles.textInput}
                value={addForm.item_number}
                onChangeText={v => setAddForm(f => ({ ...f, item_number: v }))}
                placeholder="e.g. CLN-001"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Barcode</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  style={[commonStyles.textInput, { flex: 1 }]}
                  value={addForm.barcode}
                  onChangeText={v => setAddForm(f => ({ ...f, barcode: v }))}
                  placeholder="Enter barcode number"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: spacing.md,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => { setBarcodeScanTarget('add'); setShowBarcodeScanner(true); }}
                >
                  <Icon name="barcode-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Supply type */}
              {renderSupplyTypePicker(
                addForm.supply_type,
                v => setAddForm(f => ({ ...f, supply_type: v })),
              )}

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
                {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.segBtn, addForm.category === cat.key && styles.segBtnActive]}
                    onPress={() => setAddForm(f => ({ ...f, category: cat.key as CategoryFilter }))}
                  >
                    <Text style={[styles.segBtnText, addForm.category === cat.key && styles.segBtnTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput
                style={commonStyles.textInput}
                value={addForm.unit}
                onChangeText={v => setAddForm(f => ({ ...f, unit: v }))}
                placeholder="bottle, roll, pack, unit…"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Supplier</Text>
              <TextInput
                style={commonStyles.textInput}
                value={addForm.supplier}
                onChangeText={v => setAddForm(f => ({ ...f, supplier: v }))}
                placeholder="Supplier name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Default Cost (per unit)</Text>
              <View style={[commonStyles.row, { alignItems: 'center' }]}>
                <Text style={[typography.body, { color: colors.text, marginRight: spacing.xs }]}>$</Text>
                <TextInput
                  style={[commonStyles.textInput, { flex: 1 }]}
                  value={addForm.cost}
                  onChangeText={v => setAddForm(f => ({ ...f, cost: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={styles.fieldLabel}>Minimum Stock Level</Text>
              <TextInput
                style={commonStyles.textInput}
                value={addForm.min_stock}
                onChangeText={v => setAddForm(f => ({ ...f, min_stock: v.replace(/[^0-9]/g, '') }))}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Add to Warehouse</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                {WAREHOUSES.map(wh => (
                  <TouchableOpacity
                    key={wh}
                    style={[styles.segBtn, { flex: 1 }, addForm.warehouse === wh && styles.segBtnActive]}
                    onPress={() => setAddForm(f => ({ ...f, warehouse: wh }))}
                  >
                    <Text style={[styles.segBtnText, addForm.warehouse === wh && styles.segBtnTextActive]} numberOfLines={1}>
                      {wh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={adding ? 'Adding…' : 'Add to Directory'}
                onPress={handleAdd}
                disabled={adding || !addForm.name.trim() || uploadingAddImage}
                variant="primary"
                style={{ marginTop: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.success }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(code) => {
          setShowBarcodeScanner(false);
          if (barcodeScanTarget === 'edit') {
            setEditForm(f => ({ ...f, barcode: code }));
          } else {
            setAddForm(f => ({ ...f, barcode: code }));
          }
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.background, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  addBtnText: { color: colors.background, fontWeight: '600', fontSize: 14 },
  statsBar: {
    flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary + '15', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: spacing.sm,
  },
  statText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  // Filter bar
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary + '12', borderRadius: 8,
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 2,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15', borderRadius: 12,
    paddingVertical: 3, paddingHorizontal: spacing.sm,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  activeChipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  clearChip: {
    borderRadius: 12, paddingVertical: 3, paddingHorizontal: spacing.sm,
    backgroundColor: colors.danger + '12', borderWidth: 1, borderColor: colors.danger + '30',
  },
  clearChipText: { fontSize: 11, color: colors.danger, fontWeight: '600' },
  resultCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', minWidth: 50, textAlign: 'right' },

  // Table
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#F0F2F6',
    borderBottomWidth: 2, borderBottomColor: '#D1D5DB',
  },
  headerCell: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
  },
  headerText: {
    fontSize: 11, fontWeight: '700', color: '#374151',
    textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 1,
  },
  sortIcon: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },
  sortIconActive: { color: colors.primary },

  tableRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  tableRowLow: { borderLeftWidth: 3, borderLeftColor: colors.warning },

  cell: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: '#F3F4F6',
  },

  // Cell content
  cellThumb: { width: 38, height: 38, borderRadius: 6 },
  cellThumbPlaceholder: {
    width: 38, height: 38, borderRadius: 6,
    backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  lowDot: {
    position: 'absolute', top: 4, left: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.warning, borderWidth: 1, borderColor: '#fff',
  },
  cellItemNum: { fontSize: 13, fontWeight: '700', color: colors.primary },
  cellName: { fontSize: 13, fontWeight: '600', color: colors.text },
  cellText: { fontSize: 12, color: colors.text, lineHeight: 18 },
  cellCost: { fontSize: 13, fontWeight: '700', color: '#0891B2' },
  cellMuted: { fontSize: 12, color: colors.textSecondary },
  lowBadge: {
    marginTop: 3, alignSelf: 'flex-start',
    backgroundColor: colors.warning, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  lowBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Edit button
  editBtn: {
    flexDirection: 'column', alignItems: 'center', gap: 1,
    paddingVertical: 4, paddingHorizontal: spacing.xs,
  },
  editBtnText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  // Filter modal chips
  filterModalChip: {
    paddingVertical: spacing.xs + 1, paddingHorizontal: spacing.sm + 2,
    borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterModalChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterModalChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterModalChipTextActive: { color: '#fff', fontWeight: '700' },

  // Image picker
  imagePicker: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  imagePreview: { width: 80, height: 80 },
  imagePlaceholder: {
    width: 80, height: 80, borderRadius: 10,
    backgroundColor: colors.backgroundAlt, borderWidth: 2,
    borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholderText: { fontSize: 10, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
  imageOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10,
  },

  // Supply type picker
  typeChipBtn: {
    paddingVertical: spacing.xs + 1, paddingHorizontal: spacing.sm + 2,
    borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  typeChipBtnActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  typeChipBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  typeChipBtnTextActive: { color: '#fff', fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : 20,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : 20,
    maxHeight: '92%',
    ...(Platform.OS === 'ios' ? { flex: 1 } : {}),
  },

  // Form
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  segBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center',
  },
  segBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  segBtnTextActive: { color: colors.background, fontWeight: '700' },

  // +N more chip in table cells
  moreChip: {
    backgroundColor: colors.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
    marginLeft: 4,
  },
  moreChipText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  // Buildings popup modal
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  popupSheet: {
    backgroundColor: colors.background,
    borderRadius: 14,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  popupTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    gap: spacing.xs,
  },
  popupItemText: { fontSize: 13, color: colors.text, flex: 1 },

  // Warehouse tab switcher (inside edit modal buildings section)
  whTabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  whTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  whTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  whTabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  whTabTextActive: { color: colors.primary },
  whTabBadge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  whTabBadgeActive: { backgroundColor: colors.primary },
  whTabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  whTabBadgeTextActive: { color: '#fff' },

  // Edit modal — buildings section
  editBuildingChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  editBuildingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: 20,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    marginRight: spacing.xs, marginBottom: spacing.xs,
  },
  editBuildingChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  editBuildingList: { maxHeight: 180, marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  editBuildingListItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border + '40',
  },
  editBuildingName: { fontSize: 13, color: colors.text, fontWeight: '600' },
  editBuildingClient: { fontSize: 11, color: colors.textSecondary },
});
