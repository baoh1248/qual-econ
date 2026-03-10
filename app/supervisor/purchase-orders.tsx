
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Platform, Alert,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type POStatus = 'draft' | 'submitted' | 'partial' | 'fulfilled' | 'cancelled';

interface POItem {
  id: string;
  po_id: string;
  item_id: string;
  item_name: string;
  item_number?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  tax_per_unit: number;
  unit: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  status: POStatus;
  warehouse: string;
  expected_delivery?: string;
  notes?: string;
  invoice_number?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: POItem[];
}

interface InventoryItem {
  id: string;
  name: string;
  item_number?: string;
  unit: string;
  cost?: number;
  location?: string;
  current_stock: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WAREHOUSES = ['Sparks Warehouse', 'Regular Warehouse'];

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',      color: colors.textSecondary, bg: colors.backgroundAlt },
  submitted: { label: 'Submitted',  color: colors.primary,       bg: colors.primary + '18' },
  partial:   { label: 'Partial',    color: colors.warning,       bg: colors.warning + '18' },
  fulfilled: { label: 'Fulfilled',  color: colors.success,       bg: colors.success + '18' },
  cancelled: { label: 'Cancelled',  color: colors.danger,        bg: colors.danger + '15' },
};

const generatePoNumber = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `PO-${yy}${mm}-${rnd}`;
};

const remaining = (item: POItem) => Math.max(0, item.quantity_ordered - item.quantity_received);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const { toastVisible, toastMessage, toastType, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tab, setTab] = useState<'open' | 'all'>('open');

  // Create PO state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPO, setNewPO] = useState({
    po_number: '',
    supplier: '',
    warehouse: WAREHOUSES[0],
    expected_delivery: '',
    notes: '',
  });
  const [newPOItems, setNewPOItems] = useState<{ itemId: string; name: string; item_number: string; unit: string; qty: string; unitCost: string }[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);

  // Detail / Receive state
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiveTaxRate, setReceiveTaxRate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiving, setReceiving] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: pos, error: poErr }, { data: poItems, error: itemErr }, { data: inv }] = await Promise.all([
        supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('purchase_order_items').select('*'),
        supabase.from('inventory_items').select('id,name,item_number,unit,cost,location,current_stock'),
      ]);

      if (poErr) throw poErr;

      // Attach items to each PO
      const enriched: PurchaseOrder[] = (pos || []).map(po => ({
        ...po,
        items: (poItems || []).filter(i => i.po_id === po.id),
      }));

      setOrders(enriched);
      setInventory(inv || []);
    } catch (err: any) {
      // If table doesn't exist yet, show helpful message
      if (err?.message?.includes('does not exist') || err?.code === '42P01') {
        showToast('Run the PO schema SQL in Supabase to enable this feature', 'error');
      } else {
        showToast('Failed to load purchase orders', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { loadOrders(); }, [loadOrders]));

  // ── Create PO ─────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setNewPO({ po_number: generatePoNumber(), supplier: '', warehouse: WAREHOUSES[0], expected_delivery: '', notes: '' });
    setNewPOItems([]);
    setShowCreateModal(true);
  };

  const addItemToPO = (item: InventoryItem) => {
    if (newPOItems.some(i => i.itemId === item.id)) return;
    setNewPOItems(prev => [...prev, {
      itemId: item.id,
      name: item.name,
      item_number: item.item_number || '',
      unit: item.unit,
      qty: '1',
      unitCost: item.cost ? item.cost.toFixed(2) : '0.00',
    }]);
    setItemSearch('');
    setShowItemSearch(false);
  };

  const removeItemFromPO = (itemId: string) =>
    setNewPOItems(prev => prev.filter(i => i.itemId !== itemId));

  const submitCreatePO = async () => {
    if (!newPO.supplier.trim()) { showToast('Supplier name required', 'error'); return; }
    if (newPOItems.length === 0) { showToast('Add at least one item', 'error'); return; }
    try {
      setCreating(true);
      const poId = uuid.v4() as string;
      const total = newPOItems.reduce((s, i) => s + parseFloat(i.qty || '0') * parseFloat(i.unitCost || '0'), 0);

      const { error: poErr } = await supabase.from('purchase_orders').insert({
        id: poId,
        po_number: newPO.po_number.trim(),
        supplier: newPO.supplier.trim(),
        status: 'draft',
        warehouse: newPO.warehouse,
        expected_delivery: newPO.expected_delivery || null,
        notes: newPO.notes.trim() || null,
        total_amount: total,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (poErr) throw poErr;

      const itemRows = newPOItems.map(i => ({
        id: uuid.v4() as string,
        po_id: poId,
        item_id: i.itemId,
        item_name: i.name,
        item_number: i.item_number || null,
        quantity_ordered: parseFloat(i.qty) || 1,
        quantity_received: 0,
        unit_cost: parseFloat(i.unitCost) || 0,
        tax_per_unit: 0,
        unit: i.unit,
      }));
      const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemRows);
      if (itemsErr) throw itemsErr;

      showToast(`${newPO.po_number} created`, 'success');
      setShowCreateModal(false);
      loadOrders();
    } catch (err) {
      console.error(err);
      showToast('Failed to create purchase order', 'error');
    } finally {
      setCreating(false);
    }
  };

  // ── Status transitions ────────────────────────────────────────────────────

  const markSubmitted = async (po: PurchaseOrder) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('id', po.id);
    if (error) { showToast('Failed to update status', 'error'); return; }
    showToast(`${po.po_number} marked as Submitted`, 'success');
    loadOrders();
    setSelectedPO(prev => prev ? { ...prev, status: 'submitted' } : null);
  };

  const cancelPO = async (po: PurchaseOrder) => {
    Alert.alert('Cancel PO', `Cancel ${po.po_number}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel PO', style: 'destructive', onPress: async () => {
          const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', po.id);
          if (error) { showToast('Failed to cancel', 'error'); return; }
          showToast(`${po.po_number} cancelled`, 'success');
          setShowDetailModal(false);
          loadOrders();
        },
      },
    ]);
  };

  // ── Receive against PO ───────────────────────────────────────────────────

  const openReceive = (po: PurchaseOrder) => {
    setReceivePO(po);
    // Default qty = remaining for each item
    const defaults: Record<string, string> = {};
    (po.items || []).forEach(item => {
      defaults[item.id] = String(remaining(item));
    });
    setReceiveQtys(defaults);
    setReceiveTaxRate('');
    setInvoiceNumber('');
    setShowReceiveModal(true);
  };

  const confirmReceive = async () => {
    if (!receivePO) return;
    try {
      setReceiving(true);
      const taxRateVal = parseFloat(receiveTaxRate) || 0;

      // Calculate subtotal for proportional tax distribution
      const itemsToReceive = (receivePO.items || []).filter(item => {
        const qty = parseFloat(receiveQtys[item.id] || '0');
        return qty > 0;
      });

      if (itemsToReceive.length === 0) {
        showToast('Enter quantity for at least one item', 'error');
        return;
      }

      const subtotal = itemsToReceive.reduce((s, item) => {
        const qty = parseFloat(receiveQtys[item.id] || '0');
        return s + qty * item.unit_cost;
      }, 0);
      const totalTax = subtotal * taxRateVal / 100;

      for (const poItem of itemsToReceive) {
        const qtyReceived = parseFloat(receiveQtys[poItem.id] || '0');
        const itemSubtotal = qtyReceived * poItem.unit_cost;
        const itemTax = subtotal > 0 ? totalTax * itemSubtotal / subtotal : 0;
        const taxPerUnit = qtyReceived > 0 ? itemTax / qtyReceived : 0;
        const landedCost = poItem.unit_cost + taxPerUnit;

        // ── Update inventory stock (WAC) ──────────────────────────────
        const { data: invRow } = await supabase
          .from('inventory_items')
          .select('current_stock,cost')
          .eq('id', poItem.item_id)
          .single();

        if (invRow) {
          const oldStock = invRow.current_stock || 0;
          const oldCost = invRow.cost || 0;
          const newStock = oldStock + qtyReceived;
          const newWAC = newStock > 0
            ? (oldStock * oldCost + qtyReceived * landedCost) / newStock
            : landedCost;

          await supabase.from('inventory_items').update({
            current_stock: newStock,
            cost: newWAC,
            updated_at: new Date().toISOString(),
          }).eq('id', poItem.item_id);
        }

        // ── Update PO item received quantity ──────────────────────────
        const newTotalReceived = poItem.quantity_received + qtyReceived;
        await supabase.from('purchase_order_items').update({
          quantity_received: newTotalReceived,
          tax_per_unit: taxPerUnit,
        }).eq('id', poItem.id);
      }

      // ── Update PO status ──────────────────────────────────────────
      const allItems = receivePO.items || [];
      const updatedItems = allItems.map(item => {
        const qtyR = parseFloat(receiveQtys[item.id] || '0');
        return { ...item, quantity_received: item.quantity_received + qtyR };
      });
      const allFulfilled = updatedItems.every(i => i.quantity_received >= i.quantity_ordered);
      const anyReceived = updatedItems.some(i => i.quantity_received > 0);
      const newStatus: POStatus = allFulfilled ? 'fulfilled' : anyReceived ? 'partial' : receivePO.status;

      await supabase.from('purchase_orders').update({
        status: newStatus,
        invoice_number: invoiceNumber.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', receivePO.id);

      showToast(
        allFulfilled
          ? `${receivePO.po_number} fully received — inventory updated`
          : `Partial delivery recorded for ${receivePO.po_number}`,
        'success',
      );
      setShowReceiveModal(false);
      setShowDetailModal(false);
      loadOrders();
    } catch (err) {
      console.error(err);
      showToast('Failed to record receipt', 'error');
    } finally {
      setReceiving(false);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────

  const OPEN_STATUSES: POStatus[] = ['draft', 'submitted', 'partial'];
  const displayed = tab === 'open'
    ? orders.filter(o => OPEN_STATUSES.includes(o.status))
    : orders;

  const filteredInventory = inventory.filter(item => {
    const q = itemSearch.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
      (item.item_number || '').toLowerCase().includes(q);
  }).filter(item => item.location === newPO.warehouse || !item.location);

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderStatusChip = (status: POStatus) => {
    const cfg = STATUS_CONFIG[status];
    return (
      <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

      {/* Header */}
      <View style={styles.header}>
        <View style={commonStyles.row}>
          <IconButton icon="arrow-back" onPress={() => router.back()} variant="white" />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={styles.headerTitle}>Purchase Orders</Text>
            <Text style={styles.headerSub}>
              {orders.filter(o => OPEN_STATUSES.includes(o.status)).length} open · {orders.length} total
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newPOBtn} onPress={openCreateModal}>
          <Icon name="add" size={18} color={colors.background} />
          <Text style={styles.newPOBtnText}>New PO</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['open', 'all'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'open' ? 'Open POs' : 'All POs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <LoadingSpinner /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {displayed.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="document-text" size={48} style={{ color: colors.textSecondary }} />
              <Text style={styles.emptyText}>
                {tab === 'open' ? 'No open purchase orders' : 'No purchase orders yet'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                Tap "New PO" to create your first purchase order
              </Text>
            </View>
          ) : (
            displayed.map(po => (
              <TouchableOpacity
                key={po.id}
                style={styles.card}
                onPress={() => { setSelectedPO(po); setShowDetailModal(true); }}
                activeOpacity={0.8}
              >
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                  <Text style={styles.poNumber}>{po.po_number}</Text>
                  {renderStatusChip(po.status)}
                </View>
                <Text style={styles.supplierName}>{po.supplier}</Text>
                <View style={[commonStyles.row, { gap: spacing.lg, marginTop: spacing.sm, flexWrap: 'wrap' }]}>
                  <View style={commonStyles.row}>
                    <Icon name="business" size={13} style={{ color: colors.textSecondary, marginRight: 4 }} />
                    <Text style={styles.metaText}>{po.warehouse}</Text>
                  </View>
                  {po.expected_delivery && (
                    <View style={commonStyles.row}>
                      <Icon name="calendar" size={13} style={{ color: colors.textSecondary, marginRight: 4 }} />
                      <Text style={styles.metaText}>{po.expected_delivery}</Text>
                    </View>
                  )}
                  <View style={commonStyles.row}>
                    <Icon name="cube" size={13} style={{ color: colors.textSecondary, marginRight: 4 }} />
                    <Text style={styles.metaText}>{(po.items || []).length} items</Text>
                  </View>
                  <Text style={[styles.metaText, { color: colors.success, fontWeight: '700' }]}>
                    {formatCurrency(po.total_amount)}
                  </Text>
                </View>
                {/* Progress bar for partial */}
                {po.status === 'partial' && po.items && po.items.length > 0 && (() => {
                  const totalOrdered = po.items.reduce((s, i) => s + i.quantity_ordered, 0);
                  const totalReceived = po.items.reduce((s, i) => s + i.quantity_received, 0);
                  const pct = totalOrdered > 0 ? totalReceived / totalOrdered : 0;
                  return (
                    <View style={{ marginTop: spacing.sm }}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                      </View>
                      <Text style={styles.progressLabel}>{Math.round(pct * 100)}% received</Text>
                    </View>
                  );
                })()}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* ── PO Detail Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selectedPO && (
              <>
                <View style={[commonStyles.header, { backgroundColor: colors.primary }]}>
                  <IconButton icon="close" onPress={() => setShowDetailModal(false)} variant="white" />
                  <Text style={commonStyles.headerTitle}>{selectedPO.po_number}</Text>
                  {renderStatusChip(selectedPO.status)}
                </View>

                <ScrollView style={commonStyles.content}>
                  {/* Meta */}
                  <View style={styles.detailMeta}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Supplier</Text>
                      <Text style={styles.detailValue}>{selectedPO.supplier}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Warehouse</Text>
                      <Text style={styles.detailValue}>{selectedPO.warehouse}</Text>
                    </View>
                    {selectedPO.expected_delivery && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Expected</Text>
                        <Text style={styles.detailValue}>{selectedPO.expected_delivery}</Text>
                      </View>
                    )}
                    {selectedPO.invoice_number && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Invoice #</Text>
                        <Text style={styles.detailValue}>{selectedPO.invoice_number}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={[styles.detailValue, { color: colors.success, fontWeight: '700' }]}>
                        {formatCurrency(selectedPO.total_amount)}
                      </Text>
                    </View>
                  </View>

                  {/* Items table */}
                  <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>
                    Items ({(selectedPO.items || []).length})
                  </Text>
                  {(selectedPO.items || []).map(item => {
                    const rem = remaining(item);
                    const done = rem === 0;
                    return (
                      <View key={item.id} style={[styles.poItemRow, done && styles.poItemDone]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.poItemName}>{item.item_name}</Text>
                          {item.item_number && <Text style={styles.metaText}>#{item.item_number}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.poItemQty}>
                            <Text style={{ color: done ? colors.success : colors.warning, fontWeight: '700' }}>
                              {item.quantity_received}
                            </Text>
                            <Text style={styles.metaText}>/{item.quantity_ordered} {item.unit}</Text>
                          </Text>
                          <Text style={styles.metaText}>{formatCurrency(item.unit_cost)}/{item.unit}</Text>
                        </View>
                        {done && <Icon name="checkmark-circle" size={18} color={colors.success} style={{ marginLeft: spacing.sm }} />}
                      </View>
                    );
                  })}

                  {selectedPO.notes && (
                    <View style={[styles.notesBox, { marginTop: spacing.md }]}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{selectedPO.notes}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionGroup}>
                    {selectedPO.status === 'draft' && (
                      <Button
                        title="Mark as Submitted →"
                        onPress={() => markSubmitted(selectedPO)}
                        variant="primary"
                        style={{ marginBottom: spacing.sm }}
                      />
                    )}
                    {(selectedPO.status === 'submitted' || selectedPO.status === 'partial') && (
                      <Button
                        title="Receive Delivery"
                        onPress={() => openReceive(selectedPO)}
                        variant="primary"
                        style={{ backgroundColor: colors.success, marginBottom: spacing.sm }}
                      />
                    )}
                    {selectedPO.status !== 'fulfilled' && selectedPO.status !== 'cancelled' && (
                      <Button
                        title="Cancel PO"
                        onPress={() => cancelPO(selectedPO)}
                        variant="secondary"
                        style={{ borderColor: colors.danger }}
                      />
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Receive Delivery Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showReceiveModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowReceiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {receivePO && (
              <>
                <View style={[commonStyles.header, { backgroundColor: colors.success }]}>
                  <IconButton icon="close" onPress={() => setShowReceiveModal(false)} variant="white" />
                  <Text style={commonStyles.headerTitle}>Receive Delivery</Text>
                  <View style={{ width: 44 }} />
                </View>

                <ScrollView style={commonStyles.content}>
                  <View style={styles.poBanner}>
                    <Icon name="document-text" size={16} color={colors.primary} />
                    <Text style={styles.poBannerText}>{receivePO.po_number} · {receivePO.supplier}</Text>
                  </View>

                  <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                    Adjust quantities received. Items with 0 qty will be skipped.
                  </Text>

                  {(receivePO.items || []).map(item => {
                    const rem = remaining(item);
                    return (
                      <View key={item.id} style={[styles.receiveItemCard, rem === 0 && styles.receiveItemFulfilled]}>
                        <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.poItemName}>{item.item_name}</Text>
                            <Text style={styles.metaText}>
                              {formatCurrency(item.unit_cost)}/{item.unit} ·
                              Remaining: {rem} {item.unit}
                            </Text>
                          </View>
                          {rem === 0 && (
                            <View style={[styles.statusChip, { backgroundColor: colors.success + '18' }]}>
                              <Text style={[styles.statusText, { color: colors.success }]}>Done</Text>
                            </View>
                          )}
                        </View>
                        <View style={[commonStyles.row, { alignItems: 'center', gap: spacing.sm }]}>
                          <Text style={[typography.caption, { color: colors.textSecondary, width: 60 }]}>Qty recv:</Text>
                          <TouchableOpacity
                            onPress={() => setReceiveQtys(prev => ({
                              ...prev,
                              [item.id]: String(Math.max(0, parseFloat(prev[item.id] || '0') - 1)),
                            }))}
                            style={styles.qtyBtn}
                          >
                            <Icon name="remove" size={14} color={colors.text} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.qtyInput}
                            value={receiveQtys[item.id] ?? String(rem)}
                            onChangeText={v => setReceiveQtys(prev => ({
                              ...prev,
                              [item.id]: v.replace(/[^0-9.]/g, ''),
                            }))}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                          />
                          <TouchableOpacity
                            onPress={() => setReceiveQtys(prev => ({
                              ...prev,
                              [item.id]: String(parseFloat(prev[item.id] || '0') + 1),
                            }))}
                            style={styles.qtyBtn}
                          >
                            <Icon name="add" size={14} color={colors.text} />
                          </TouchableOpacity>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.unit}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Tax rate */}
                  <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Tax Rate (Optional)</Text>
                  <View style={[commonStyles.row, { alignItems: 'center', marginBottom: spacing.md }]}>
                    <TextInput
                      style={[commonStyles.textInput, { flex: 1 }]}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      value={receiveTaxRate}
                      onChangeText={v => setReceiveTaxRate(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[typography.body, { marginLeft: spacing.xs, color: colors.text }]}>%</Text>
                  </View>

                  <Text style={styles.fieldLabel}>Supplier Invoice # (Optional)</Text>
                  <TextInput
                    style={[commonStyles.textInput, { marginBottom: spacing.lg }]}
                    placeholder="e.g. INV-2026-001"
                    placeholderTextColor={colors.textSecondary}
                    value={invoiceNumber}
                    onChangeText={setInvoiceNumber}
                  />

                  {/* Summary */}
                  {(() => {
                    const items = receivePO.items || [];
                    const subtotal = items.reduce((s, item) => {
                      const qty = parseFloat(receiveQtys[item.id] || '0');
                      return s + qty * item.unit_cost;
                    }, 0);
                    const taxRate = parseFloat(receiveTaxRate) || 0;
                    const tax = subtotal * taxRate / 100;
                    return (
                      <View style={styles.summaryCard}>
                        <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                          <Text style={[typography.body, { color: colors.text }]}>Subtotal:</Text>
                          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{formatCurrency(subtotal)}</Text>
                        </View>
                        {tax > 0 && (
                          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                            <Text style={[typography.body, { color: colors.warning }]}>Tax ({taxRate}%):</Text>
                            <Text style={[typography.body, { color: colors.warning, fontWeight: '600' }]}>+{formatCurrency(tax)}</Text>
                          </View>
                        )}
                        <View style={[commonStyles.row, commonStyles.spaceBetween, { borderTopWidth: 1, borderTopColor: colors.success, paddingTop: spacing.sm }]}>
                          <Text style={[typography.h3, { color: colors.text }]}>Total:</Text>
                          <Text style={[typography.h2, { color: colors.success }]}>{formatCurrency(subtotal + tax)}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  <Button
                    title={receiving ? 'Recording...' : 'Confirm Receipt & Update Inventory'}
                    onPress={confirmReceive}
                    disabled={receiving}
                    variant="primary"
                    style={{ backgroundColor: colors.success, marginBottom: spacing.lg }}
                  />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Create PO Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[commonStyles.header, { backgroundColor: colors.primary }]}>
              <IconButton icon="close" onPress={() => setShowCreateModal(false)} variant="white" />
              <Text style={commonStyles.headerTitle}>New Purchase Order</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={commonStyles.content}>
              {/* PO Number */}
              <Text style={styles.fieldLabel}>PO Number</Text>
              <View style={[commonStyles.row, { gap: spacing.sm, marginBottom: spacing.md }]}>
                <TextInput
                  style={[commonStyles.textInput, { flex: 1 }]}
                  value={newPO.po_number}
                  onChangeText={v => setNewPO(f => ({ ...f, po_number: v }))}
                  placeholder="PO-202601-0001"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={() => setNewPO(f => ({ ...f, po_number: generatePoNumber() }))}
                >
                  <Icon name="refresh" size={18} color={colors.background} />
                </TouchableOpacity>
              </View>

              {/* Supplier */}
              <Text style={styles.fieldLabel}>Supplier *</Text>
              <TextInput
                style={[commonStyles.textInput, { marginBottom: spacing.md }]}
                value={newPO.supplier}
                onChangeText={v => setNewPO(f => ({ ...f, supplier: v }))}
                placeholder="Supplier company name"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Warehouse */}
              <Text style={styles.fieldLabel}>Deliver to Warehouse *</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                {WAREHOUSES.map(wh => (
                  <TouchableOpacity
                    key={wh}
                    style={[styles.segBtn, { flex: 1 }, newPO.warehouse === wh && styles.segBtnActive]}
                    onPress={() => setNewPO(f => ({ ...f, warehouse: wh }))}
                  >
                    <Text style={[styles.segBtnText, newPO.warehouse === wh && styles.segBtnTextActive]} numberOfLines={1}>
                      {wh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Expected Delivery */}
              <Text style={styles.fieldLabel}>Expected Delivery (Optional)</Text>
              <TextInput
                style={[commonStyles.textInput, { marginBottom: spacing.md }]}
                value={newPO.expected_delivery}
                onChangeText={v => setNewPO(f => ({ ...f, expected_delivery: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Items */}
              <Text style={[styles.fieldLabel, { marginBottom: spacing.sm }]}>
                Items ({newPOItems.length})
              </Text>

              {newPOItems.map((item, idx) => (
                <View key={item.itemId} style={styles.createItemRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.poItemName} numberOfLines={1}>{item.name}</Text>
                    {item.item_number ? <Text style={styles.metaText}>#{item.item_number}</Text> : null}
                  </View>
                  <TextInput
                    style={styles.smallInput}
                    value={item.qty}
                    onChangeText={v => setNewPOItems(prev => prev.map((i, j) => j === idx ? { ...i, qty: v.replace(/[^0-9.]/g, '') } : i))}
                    keyboardType="decimal-pad"
                    placeholder="Qty"
                    selectTextOnFocus
                  />
                  <Text style={styles.metaText}>{item.unit}</Text>
                  <Text style={[styles.metaText, { marginHorizontal: 4 }]}>@$</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={item.unitCost}
                    onChangeText={v => setNewPOItems(prev => prev.map((i, j) => j === idx ? { ...i, unitCost: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') } : i))}
                    keyboardType="decimal-pad"
                    placeholder="Cost"
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => removeItemFromPO(item.itemId)} style={{ padding: 4 }}>
                    <Icon name="close-circle" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add item search */}
              <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowItemSearch(!showItemSearch)}>
                <Icon name="add-circle" size={22} color={colors.primary} />
                <Text style={[styles.addItemBtnText, { color: colors.primary }]}>Add Item from Inventory</Text>
              </TouchableOpacity>

              {showItemSearch && (
                <View style={{ marginTop: spacing.sm }}>
                  <TextInput
                    style={commonStyles.textInput}
                    placeholder="Search items..."
                    placeholderTextColor={colors.textSecondary}
                    value={itemSearch}
                    onChangeText={setItemSearch}
                    autoFocus
                  />
                  <ScrollView style={{ maxHeight: 220, marginTop: spacing.sm }}>
                    {filteredInventory.slice(0, 20).map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[commonStyles.card, { marginBottom: spacing.xs }]}
                        onPress={() => addItemToPO(item)}
                      >
                        <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                          <View>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{item.name}</Text>
                            <Text style={[typography.caption, { color: colors.textSecondary }]}>
                              Stock: {item.current_stock} {item.unit}
                              {item.cost ? ` · WAC: ${formatCurrency(item.cost)}` : ''}
                            </Text>
                          </View>
                          <Icon name="add-circle" size={24} color={colors.primary} />
                        </View>
                      </TouchableOpacity>
                    ))}
                    {filteredInventory.length === 0 && itemSearch.trim() && (
                      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                        No items found
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Notes */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Notes (Optional)</Text>
              <TextInput
                style={[commonStyles.textInput, { height: 72, textAlignVertical: 'top', marginBottom: spacing.md }]}
                value={newPO.notes}
                onChangeText={v => setNewPO(f => ({ ...f, notes: v }))}
                placeholder="Add notes..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              {/* Total preview */}
              {newPOItems.length > 0 && (
                <View style={styles.summaryCard}>
                  <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                    <Text style={[typography.body, { color: colors.text }]}>Estimated Total:</Text>
                    <Text style={[typography.h3, { color: colors.success }]}>
                      {formatCurrency(newPOItems.reduce((s, i) => s + parseFloat(i.qty || '0') * parseFloat(i.unitCost || '0'), 0))}
                    </Text>
                  </View>
                </View>
              )}

              <Button
                title={creating ? 'Creating...' : 'Create Purchase Order'}
                onPress={submitCreatePO}
                disabled={creating || !newPO.supplier.trim() || newPOItems.length === 0}
                variant="primary"
                style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
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
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  newPOBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  newPOBtnText: { color: colors.background, fontWeight: '600', fontSize: 14 },
  tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  poNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  supplierName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.success, borderRadius: 2 },
  progressLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
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
  detailMeta: {
    backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs, borderBottomWidth: 1, borderColor: colors.border + '50',
  },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '600' },
  notesBox: {
    backgroundColor: colors.backgroundAlt, borderRadius: 8, padding: spacing.md,
  },
  poItemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border + '40',
  },
  poItemDone: { opacity: 0.6 },
  poItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  poItemQty: { fontSize: 13, color: colors.text },
  actionGroup: { marginTop: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
  poBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary + '15', borderRadius: 8,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  poBannerText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  receiveItemCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: spacing.sm,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  receiveItemFulfilled: { opacity: 0.55 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 6, backgroundColor: colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4,
    width: 60, textAlign: 'center', fontSize: 14, color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.success + '12', borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.success,
  },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  createItemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10, padding: spacing.sm,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  smallInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 6, paddingHorizontal: spacing.xs, paddingVertical: 4,
    width: 52, textAlign: 'center', fontSize: 13, color: colors.text,
    marginHorizontal: 4,
  },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 2, borderColor: colors.primary,
    borderStyle: 'dashed', borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addItemBtnText: { fontSize: 14, fontWeight: '600' },
  segBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center',
  },
  segBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  segBtnTextActive: { color: colors.background, fontWeight: '700' },
});
