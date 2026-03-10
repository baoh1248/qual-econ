
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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

const WAREHOUSES = ['Sparks Warehouse', 'Regular Warehouse'];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'cleaning-supplies', label: 'Cleaning' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'safety', label: 'Safety' },
];

interface WarehouseStock {
  warehouse: string;
  current_stock: number;
  min_stock: number;
  item_id: string;
}

interface CatalogEntry {
  // Derived from grouping inventory_items by name
  name: string;
  item_number: string;
  category: string;
  unit: string;
  supplier: string;
  avg_cost: number; // weighted average across all instances
  total_stock: number;
  by_warehouse: WarehouseStock[];
  is_low_stock: boolean;
}

type CategoryFilter = 'all' | 'cleaning-supplies' | 'equipment' | 'safety';

const BLANK_EDIT = {
  name: '',
  item_number: '',
  category: 'cleaning-supplies' as CategoryFilter,
  unit: '',
  supplier: '',
};

export default function InventoryCatalog() {
  const { toastVisible, toastMessage, toastType, showToast, hideToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);
  const [saving, setSaving] = useState(false);

  // Add new item modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    item_number: '',
    category: 'cleaning-supplies' as CategoryFilter,
    unit: 'unit',
    supplier: '',
    cost: '',
    min_stock: '',
    warehouse: WAREHOUSES[0],
  });
  const [adding, setAdding] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;

      // Group items by name (case-insensitive)
      const groups: Record<string, any[]> = {};
      for (const item of data || []) {
        const key = item.name.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      const entries: CatalogEntry[] = Object.values(groups).map(items => {
        const totalStock = items.reduce((s, i) => s + (i.current_stock || 0), 0);
        const totalValue = items.reduce((s, i) => s + (i.current_stock || 0) * (i.cost || 0), 0);
        const avgCost = totalStock > 0 ? totalValue / totalStock : (items[0]?.cost || 0);
        const isLowStock = items.some(i => (i.current_stock || 0) <= (i.min_stock || 0));

        // Use the most recently updated row for master data
        const master = items.sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        )[0];

        return {
          name: master.name,
          item_number: master.item_number || '',
          category: master.category || 'cleaning-supplies',
          unit: master.unit || 'unit',
          supplier: master.supplier || '',
          avg_cost: avgCost,
          total_stock: totalStock,
          is_low_stock: isLowStock,
          by_warehouse: items.map(i => ({
            warehouse: i.location || 'Unknown',
            current_stock: i.current_stock || 0,
            min_stock: i.min_stock || 0,
            item_id: i.id,
          })),
        };
      });

      // Sort: low stock first, then alphabetically
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

  const openEdit = (entry: CatalogEntry) => {
    setEditingEntry(entry);
    setEditForm({
      name: entry.name,
      item_number: entry.item_number,
      category: entry.category as CategoryFilter,
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
      // Update all inventory_items rows that match the original name
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: editForm.name.trim(),
          item_number: editForm.item_number.trim() || null,
          category: editForm.category,
          unit: editForm.unit.trim(),
          supplier: editForm.supplier.trim(),
          updated_at: new Date().toISOString(),
        })
        .ilike('name', editingEntry.name); // match all warehouse rows

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

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    try {
      setAdding(true);
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          id: uuid.v4() as string,
          name: addForm.name.trim(),
          item_number: addForm.item_number.trim() || null,
          category: addForm.category,
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
      setAddForm({
        name: '', item_number: '', category: 'cleaning-supplies',
        unit: 'unit', supplier: '', cost: '', min_stock: '',
        warehouse: WAREHOUSES[0],
      });
      loadCatalog();
    } catch (err) {
      console.error('Failed to add item:', err);
      showToast('Failed to add item', 'error');
    } finally {
      setAdding(false);
    }
  };

  // Filter
  const filtered = catalog.filter(entry => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      entry.name.toLowerCase().includes(q) ||
      entry.item_number.toLowerCase().includes(q) ||
      entry.supplier.toLowerCase().includes(q);
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
              {stats.total} products · {stats.lowStock} low stock
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
          placeholder="Search by name, item number, supplier..."
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
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

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="cube" size={48} style={{ color: colors.textSecondary }} />
              <Text style={styles.emptyText}>
                {searchQuery ? `No items matching "${searchQuery}"` : 'No items in directory'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Items are added via Receive Supply or the New Item button
              </Text>
            </View>
          ) : (
            filtered.map(entry => (
              <View key={entry.name} style={[styles.card, entry.is_low_stock && styles.cardLowStock]}>
                {/* Card header */}
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <View style={{ flex: 1 }}>
                    <View style={[commonStyles.row, { flexWrap: 'wrap', gap: spacing.xs }]}>
                      <Text style={styles.itemName}>{entry.name}</Text>
                      {entry.is_low_stock && (
                        <View style={styles.lowStockBadge}>
                          <Text style={styles.lowStockBadgeText}>LOW</Text>
                        </View>
                      )}
                    </View>
                    <View style={[commonStyles.row, { gap: spacing.sm, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }]}>
                      {entry.item_number ? (
                        <View style={styles.itemNumBadge}>
                          <Text style={styles.itemNumText}>#{entry.item_number}</Text>
                        </View>
                      ) : (
                        <View style={[styles.itemNumBadge, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: 1 }]}>
                          <Text style={[styles.itemNumText, { color: colors.textSecondary }]}>No item #</Text>
                        </View>
                      )}
                      <View style={[styles.categoryChip, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.categoryChipText, { color: colors.primary }]}>
                          {getCategoryLabel(entry.category)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(entry)}>
                    <Icon name="create" size={16} color={colors.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Supplier + WAC cost row */}
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <Text style={styles.metaText}>
                    {entry.supplier ? `Supplier: ${entry.supplier}` : 'No supplier'}
                  </Text>
                  <Text style={styles.metaText}>
                    WAC: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatCurrency(entry.avg_cost)}/{entry.unit}</Text>
                  </Text>
                </View>

                {/* Stock across warehouses */}
                <View style={styles.warehouseRow}>
                  {entry.by_warehouse.map(ws => (
                    <View key={ws.warehouse} style={styles.warehouseChip}>
                      <Text style={styles.warehouseLabel} numberOfLines={1}>{ws.warehouse}</Text>
                      <Text style={[
                        styles.warehouseStock,
                        { color: ws.current_stock <= ws.min_stock ? colors.warning : colors.success }
                      ]}>
                        {ws.current_stock} {entry.unit}
                        {ws.current_stock <= ws.min_stock ? ' ⚠' : ''}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.warehouseChip, styles.totalChip]}>
                    <Text style={styles.warehouseLabel}>Total</Text>
                    <Text style={[styles.warehouseStock, { color: getStockColor(entry), fontWeight: '700' }]}>
                      {entry.total_stock} {entry.unit}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* ── Edit Modal ── */}
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
                Changes will apply to this item across ALL warehouses.
              </Text>

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
                placeholder="e.g. ITM-001"
                placeholderTextColor={colors.textSecondary}
              />

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
                title={saving ? 'Saving...' : 'Save Changes'}
                onPress={saveEdit}
                disabled={saving}
                variant="primary"
                style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Item Modal ── */}
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
                placeholder="bottle, roll, pack, unit..."
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
                    <Text style={[styles.segBtnText, addForm.warehouse === wh && styles.segBtnTextActive]}
                      numberOfLines={1}>
                      {wh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={adding ? 'Adding...' : 'Add to Directory'}
                onPress={handleAdd}
                disabled={adding || !addForm.name.trim()}
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
  headerTitle: {
    fontSize: 20, fontWeight: '700', color: colors.background, letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2,
  },
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
    borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: colors.background, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardLowStock: { borderColor: colors.warning, borderWidth: 1.5 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text },
  lowStockBadge: {
    backgroundColor: colors.warning + '25', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  lowStockBadgeText: { fontSize: 10, fontWeight: '800', color: colors.warning },
  itemNumBadge: {
    backgroundColor: colors.primary + '18', borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  itemNumText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  categoryChip: {
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  categoryChipText: { fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 12, color: colors.textSecondary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15', borderRadius: 8,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
  },
  editBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  warehouseRow: {
    flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  warehouseChip: {
    flex: 1, minWidth: 110, backgroundColor: colors.backgroundAlt,
    borderRadius: 8, padding: spacing.sm, alignItems: 'center',
  },
  totalChip: {
    backgroundColor: colors.primary + '12',
  },
  warehouseLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2, textAlign: 'center' },
  warehouseStock: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : 20,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : 20,
    maxHeight: '90%',
    ...(Platform.OS === 'ios' ? { flex: 1 } : {}),
  },
  fieldLabel: {
    fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  segBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  segBtnTextActive: { color: colors.background, fontWeight: '700' },
});
