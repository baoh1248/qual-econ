
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, Platform, Image,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const WAREHOUSES = ['Sparks Warehouse', 'Regular Warehouse'];

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
}

interface CatalogEntry {
  name: string;
  item_number: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
          .select('destination, items')
          .eq('type', 'outgoing')
          .gte('created_at', ninetyDaysAgo),
      ]);

      if (itemsRes.error) throw itemsRes.error;

      // Build buildings-served map: itemNameLower → { destination: count }
      const buildingMap: Record<string, Record<string, number>> = {};
      for (const t of transfersRes.data || []) {
        const dest = t.destination?.trim();
        if (!dest) continue;
        const items = Array.isArray(t.items) ? t.items : [];
        for (const itm of items) {
          const key = (itm.item_name || '').toLowerCase().trim();
          if (!key) continue;
          if (!buildingMap[key]) buildingMap[key] = {};
          buildingMap[key][dest] = (buildingMap[key][dest] || 0) + 1;
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
        const destCounts = buildingMap[nameKey] || {};
        const buildingsServiced = Object.entries(destCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([dest]) => dest);

        return {
          name: master.name,
          item_number: master.item_number || '',
          category: master.category || 'cleaning-supplies',
          supply_type: master.supply_type || '',
          image_url: master.image_url || '',
          unit: master.unit || 'unit',
          supplier: master.supplier || '',
          avg_cost: avgCost,
          total_stock: totalStock,
          is_low_stock: isLowStock,
          buildings_serviced: buildingsServiced,
          by_warehouse: items.map(i => ({
            warehouse: i.location || 'Unknown',
            current_stock: i.current_stock || 0,
            min_stock: i.min_stock || 0,
            item_id: i.id,
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

  const openEdit = (entry: CatalogEntry) => {
    setEditingEntry(entry);
    setEditForm({
      name: entry.name,
      item_number: entry.item_number,
      category: entry.category as CategoryFilter,
      supply_type: entry.supply_type,
      image_url: entry.image_url,
      unit: entry.unit,
      supplier: entry.supplier,
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingEntry || !editForm.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: editForm.name.trim(),
          item_number: editForm.item_number.trim() || null,
          category: editForm.category,
          supply_type: editForm.supply_type.trim() || null,
          image_url: editForm.image_url.trim() || null,
          unit: editForm.unit.trim(),
          supplier: editForm.supplier.trim(),
          updated_at: new Date().toISOString(),
        })
        .ilike('name', editingEntry.name);

      if (error) throw error;
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
      const { error } = await supabase.from('inventory_items').insert({
        id: uuid.v4() as string,
        name: addForm.name.trim(),
        item_number: addForm.item_number.trim() || null,
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
      });

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

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = catalog.filter(entry => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      entry.name.toLowerCase().includes(q) ||
      entry.item_number.toLowerCase().includes(q) ||
      entry.supplier.toLowerCase().includes(q) ||
      entry.supply_type.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: catalog.length,
    lowStock: catalog.filter(e => e.is_low_stock).length,
    outOfStock: catalog.filter(e => e.total_stock === 0).length,
  };

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find(c => c.key === cat)?.label || cat;

  const getStockColor = (entry: CatalogEntry) => {
    if (entry.total_stock === 0) return colors.danger;
    if (entry.is_low_stock) return colors.warning;
    return colors.success;
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

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterChip, categoryFilter === cat.key && styles.filterChipActive]}
            onPress={() => setCategoryFilter(cat.key as CategoryFilter)}
          >
            <Text style={[styles.filterChipText, categoryFilter === cat.key && styles.filterChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? <LoadingSpinner /> : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="cube" size={48} style={{ color: colors.textSecondary }} />
              <Text style={styles.emptyText}>
                {searchQuery ? `No items matching "${searchQuery}"` : 'No items in directory'}
              </Text>
            </View>
          ) : (
            filtered.map(entry => (
              <View key={entry.name} style={[styles.card, entry.is_low_stock && styles.cardLowStock]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>

                  {/* ── Icon box ── */}
                  <View style={styles.thumbContainer}>
                    {entry.image_url ? (
                      <Image source={{ uri: entry.image_url }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Icon name="cube-outline" size={22} style={{ color: colors.textSecondary }} />
                      </View>
                    )}
                    {entry.is_low_stock && <View style={styles.lowStockDot} />}
                  </View>

                  {/* ── Main content block ── */}
                  <View style={{ flex: 1, minWidth: 0 }}>

                    {/* Line 1: name + LOW badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: 3 }}>
                      <Text style={styles.itemName} numberOfLines={2}>{entry.name}</Text>
                      {entry.is_low_stock && (
                        <View style={styles.lowStockBadge}>
                          <Text style={styles.lowStockBadgeText}>LOW</Text>
                        </View>
                      )}
                      {entry.supply_type ? (
                        <View style={styles.supplyTypeChip}>
                          <Text style={styles.supplyTypeText}>{entry.supply_type}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Line 2: item number (prominent blue text) */}
                    {entry.item_number ? (
                      <Text style={styles.itemNumLine}>#{entry.item_number}</Text>
                    ) : (
                      <Text style={styles.itemNumLineMuted}>No item #</Text>
                    )}

                    {/* Line 3: supplier icon + name + cost */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 5, flexWrap: 'wrap' }}>
                      <Icon name="list" size={13} style={{ color: colors.textSecondary }} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {entry.supplier || 'No supplier'}
                      </Text>
                      <Text style={styles.costText}>
                        {formatCurrency(entry.avg_cost)}/{entry.unit}
                      </Text>
                    </View>

                    {/* Line 4: warehouse stock chips */}
                    <View style={[styles.warehouseRow, { marginTop: spacing.xs }]}>
                      {entry.by_warehouse.map(ws => {
                        const isLow = ws.current_stock <= ws.min_stock && ws.min_stock > 0;
                        return (
                          <View key={ws.warehouse} style={styles.warehouseChip}>
                            <Text style={styles.warehouseLabel} numberOfLines={1}>{ws.warehouse}</Text>
                            <Text style={[styles.warehouseStock, { color: isLow ? colors.warning : colors.success }]}>
                              {ws.current_stock} {entry.unit}{isLow ? ' △' : ''}
                            </Text>
                          </View>
                        );
                      })}
                      <View style={[styles.warehouseChip, styles.totalChip]}>
                        <Text style={styles.warehouseLabel}>Total</Text>
                        <Text style={[styles.warehouseStock, { color: getStockColor(entry), fontWeight: '700' }]}>
                          {entry.total_stock} {entry.unit}
                        </Text>
                      </View>
                    </View>

                    {/* Line 5: buildings serviced */}
                    {entry.buildings_serviced.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }}>
                        <Icon name="location" size={12} style={{ color: colors.textSecondary }} />
                        <Text style={[styles.metaText, { fontWeight: '600' }]}>Sent to:</Text>
                        {entry.buildings_serviced.map(b => (
                          <View key={b} style={styles.buildingChip}>
                            <Text style={styles.buildingChipText} numberOfLines={1}>{b}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* ── Edit button (top-right) ── */}
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(entry)}>
                    <Icon name="create" size={18} color={colors.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                </View>
              </View>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

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
  filterRow: { maxHeight: 44, marginBottom: spacing.sm },
  filterChip: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: colors.background, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  cardLowStock: { borderColor: colors.warning, borderWidth: 2 },

  // Thumbnail
  thumbContainer: { position: 'relative' },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbPlaceholder: {
    backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  lowStockDot: {
    position: 'absolute', top: -2, left: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.warning, borderWidth: 1.5, borderColor: colors.surface,
  },

  // Item name + badges
  itemName: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  lowStockBadge: {
    backgroundColor: colors.warning, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center',
  },
  lowStockBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  supplyTypeChip: {
    backgroundColor: '#EDE9FE', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  supplyTypeText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },

  // Item number lines
  itemNumLine: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 1 },
  itemNumLineMuted: { fontSize: 12, color: colors.textSecondary, marginBottom: 1 },

  // Meta + cost
  metaText: { fontSize: 12, color: colors.textSecondary },
  costText: { fontSize: 13, fontWeight: '700', color: '#0891B2' },

  // Warehouse chips
  warehouseRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  warehouseChip: {
    backgroundColor: '#F8F9FB', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 4, paddingHorizontal: 10, alignItems: 'flex-start',
  },
  totalChip: { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
  warehouseLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '500', marginBottom: 1 },
  warehouseStock: { fontSize: 13, fontWeight: '700' },

  // Edit button
  editBtn: {
    flexDirection: 'column', alignItems: 'center', gap: 2,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  editBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

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

  // Buildings serviced
  buildingChip: {
    backgroundColor: colors.primary + '12', borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
    maxWidth: 140,
  },
  buildingChipText: { fontSize: 11, fontWeight: '600', color: colors.primary },

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
});
