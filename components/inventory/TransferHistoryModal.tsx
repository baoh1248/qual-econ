
import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import { getInventoryTransferLogs, deleteInventoryTransferLog, updateInventoryTransferLog, formatCurrency, type InventoryTransfer, type InventoryTransferItem } from '../../utils/inventoryTracking';
import PropTypes from 'prop-types';

interface TransferHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const toDateString = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const toTimeString = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Parse a YYYY-MM-DD string into a Date object at midnight local time, or null */
const parseLocalDate = (s: string): Date | null => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ─── component ──────────────────────────────────────────────────────────────

const TransferHistoryModal = memo<TransferHistoryModalProps>(({ visible, onClose, onRefresh }) => {
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'outgoing' | 'incoming'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Delete confirm
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<InventoryTransfer | null>(null);

  // Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<InventoryTransfer | null>(null);
  const [editDestination, setEditDestination] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSentFrom, setEditSentFrom] = useState('');
  const [editItems, setEditItems] = useState<InventoryTransferItem[]>([]);

  useEffect(() => {
    if (visible) loadTransfers();
  }, [visible]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const logs = await getInventoryTransferLogs();
      setTransfers(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) {
      console.error('Failed to load transfer history:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const uniqueClients = useMemo(() => {
    const s = new Set<string>();
    transfers.forEach(t => {
      const p = t.destination.split(' - ');
      if (p.length > 1) s.add(p[0]);
    });
    return Array.from(s).sort();
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    const dateFrom = parseLocalDate(filterDateFrom);
    const dateTo = parseLocalDate(filterDateTo);

    return transfers.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;

      if (filterClient && !t.destination.toLowerCase().includes(filterClient.toLowerCase())) return false;

      if (dateFrom) {
        const d = new Date(t.timestamp);
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = new Date(t.timestamp);
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (d > toEnd) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          t.destination.toLowerCase().includes(q) ||
          (t.source || '').toLowerCase().includes(q) ||
          (t.sentFrom || '').toLowerCase().includes(q) ||
          t.items.some(i => i.name.toLowerCase().includes(q)) ||
          t.transferredBy.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [transfers, filterType, filterClient, filterDateFrom, filterDateTo, searchQuery]);

  const hasActiveFilters = filterType !== 'all' || filterClient !== '' || filterDateFrom !== '' || filterDateTo !== '' || searchQuery !== '';

  const clearFilters = () => {
    setFilterType('all');
    setFilterClient('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: transfers.length,
      todayCount: transfers.filter(t => new Date(t.timestamp).toDateString() === today).length,
      totalValue: transfers.reduce((s, t) => s + (t.totalValue || 0), 0),
      outgoing: transfers.filter(t => t.type === 'outgoing').length,
      incoming: transfers.filter(t => t.type === 'incoming').length,
    };
  }, [transfers]);

  // Group by date
  const groupedTransfers = useMemo(() => {
    const groups: Record<string, InventoryTransfer[]> = {};
    filteredTransfers.forEach(t => {
      const key = new Date(t.timestamp).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTransfers]);

  // ── delete ────────────────────────────────────────────────────────────────

  const handleDeleteTransfer = (transfer: InventoryTransfer) => {
    if (Platform.OS === 'web') {
      setTransferToDelete(transfer);
      setShowDeleteModal(true);
    } else {
      Alert.alert('Delete Transfer Record', 'Are you sure you want to delete this transfer record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(transfer.id) },
      ]);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteInventoryTransferLog(id);
      await loadTransfers();
      onRefresh?.();
    } catch (e) {
      console.error('Failed to delete transfer:', e);
    } finally {
      setShowDeleteModal(false);
      setTransferToDelete(null);
    }
  };

  // ── edit ──────────────────────────────────────────────────────────────────

  const openEdit = (t: InventoryTransfer) => {
    setEditingTransfer(t);
    setEditDestination(t.destination);
    setEditSource(t.source || '');
    setEditOrderNumber(t.orderNumber || '');
    setEditNotes(t.notes || '');
    setEditSentFrom(t.sentFrom || '');
    setEditItems(t.items.map(i => ({ ...i })));
    setShowEditModal(true);
  };

  const updateEditItem = (index: number, field: keyof InventoryTransferItem, value: any) => {
    const arr = [...editItems];
    arr[index] = { ...arr[index], [field]: value };
    if (field === 'quantity' || field === 'unitCost') {
      arr[index].totalCost = (arr[index].quantity || 0) * (arr[index].unitCost || 0);
    }
    setEditItems(arr);
  };

  const handleSaveEdit = async () => {
    if (!editingTransfer) return;
    try {
      const updates: Partial<Omit<InventoryTransfer, 'id'>> = {
        items: editItems,
        destination: editDestination,
        notes: editNotes || undefined,
        sentFrom: editSentFrom || undefined,
        orderNumber: editOrderNumber || undefined,
      };
      if (editingTransfer.type === 'incoming') updates.source = editSource;
      await updateInventoryTransferLog(editingTransfer.id, updates);
      await loadTransfers();
      onRefresh?.();
      setShowEditModal(false);
      setEditingTransfer(null);
    } catch (e) {
      console.error('Failed to update transfer:', e);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  const activeFilterCount = [
    filterType !== 'all',
    filterClient !== '',
    filterDateFrom !== '',
    filterDateTo !== '',
  ].filter(Boolean).length;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={onClose}
      >
        <View style={[
          styles.backdrop,
          Platform.OS === 'ios' && { backgroundColor: colors.background },
          Platform.OS === 'web' && styles.webBackdrop,
        ]}>
          {Platform.OS !== 'ios' && (
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
          )}

          <View style={[styles.sheet, Platform.OS === 'ios' && styles.sheetIos]}>
            {/* ── Header ── */}
            <View style={styles.header}>
              <IconButton icon="close" onPress={onClose} variant="white" />
              <View style={styles.headerCenter}>
                <Icon name="swap-horizontal" size={18} style={{ color: '#fff', marginRight: 6 }} />
                <Text style={styles.headerTitle}>Transfer History</Text>
              </View>
              <IconButton icon="refresh" onPress={loadTransfers} variant="white" />
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.primary }]}>{stats.total}</Text>
                <Text style={styles.statLbl}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.success }]}>{stats.todayCount}</Text>
                <Text style={styles.statLbl}>Today</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: '#E67E22' }]}>{stats.outgoing}</Text>
                <Text style={styles.statLbl}>Outgoing</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.info }]}>{stats.incoming}</Text>
                <Text style={styles.statLbl}>Incoming</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.success, fontSize: 13 }]}>{formatCurrency(stats.totalValue)}</Text>
                <Text style={styles.statLbl}>Value</Text>
              </View>
            </View>

            <View style={styles.body}>
              {/* ── Search bar ── */}
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Icon name="search" size={18} style={{ color: colors.textSecondary, marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search transfers, items, destinations…"
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Icon name="close-circle" size={18} style={{ color: colors.textSecondary }} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
                  onPress={() => setShowFilters(v => !v)}
                >
                  <Icon name="options" size={18} style={{ color: showFilters ? '#fff' : colors.primary }} />
                  {activeFilterCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {hasActiveFilters && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                    <Icon name="close" size={16} style={{ color: colors.danger }} />
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Filter panel ── */}
              {showFilters && (
                <View style={styles.filterPanel}>
                  {/* Type chips */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Type</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, flex: 1 }}>
                      {(['all', 'outgoing', 'incoming'] as const).map(t => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.chip, filterType === t && styles.chipActive]}
                          onPress={() => setFilterType(t)}
                        >
                          <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Client filter */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Client</Text>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.filterInput}
                        placeholder="Filter by client name…"
                        placeholderTextColor={colors.textSecondary}
                        value={filterClient}
                        onChangeText={setFilterClient}
                      />
                      {uniqueClients.length > 0 && !filterClient && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                          {uniqueClients.map(c => (
                            <TouchableOpacity key={c} style={[styles.chip, { marginRight: 6 }]} onPress={() => setFilterClient(c)}>
                              <Text style={styles.chipText}>{c}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>

                  {/* Date range */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Date</Text>
                    <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.filterSubLabel}>From</Text>
                        <TextInput
                          style={styles.filterInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.textSecondary}
                          value={filterDateFrom}
                          onChangeText={setFilterDateFrom}
                          maxLength={10}
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.filterSubLabel}>To</Text>
                        <TextInput
                          style={styles.filterInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.textSecondary}
                          value={filterDateTo}
                          onChangeText={setFilterDateTo}
                          maxLength={10}
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ── Results label ── */}
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  {filteredTransfers.length} {filteredTransfers.length === 1 ? 'record' : 'records'}
                  {hasActiveFilters ? ' (filtered)' : ''}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={[styles.resultsText, { color: colors.danger }]}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Transfer list ── */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {Object.keys(groupedTransfers).length === 0 ? (
                  <View style={styles.empty}>
                    <Icon name="archive-outline" size={52} style={{ color: colors.border }} />
                    <Text style={styles.emptyTitle}>
                      {hasActiveFilters ? 'No Matching Transfers' : 'No Transfer History'}
                    </Text>
                    <Text style={styles.emptyText}>
                      {hasActiveFilters ? 'Try adjusting your filters.' : 'Transfer records will appear here.'}
                    </Text>
                  </View>
                ) : (
                  Object.entries(groupedTransfers).map(([dateStr, group]) => (
                    <View key={dateStr} style={styles.dateGroup}>
                      <View style={styles.dateHeader}>
                        <Icon name="calendar-outline" size={14} style={{ color: colors.primary }} />
                        <Text style={styles.dateHeaderText}>{toDateString(group[0].timestamp)}</Text>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateBadgeText}>{group.length}</Text>
                        </View>
                      </View>

                      {group.map(transfer => (
                        <TransferCard
                          key={transfer.id}
                          transfer={transfer}
                          onEdit={() => openEdit(transfer)}
                          onDelete={() => handleDeleteTransfer(transfer)}
                        />
                      ))}
                    </View>
                  ))
                )}
                <View style={{ height: spacing.xl }} />
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete confirm modal ── */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.overlayCenter}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, { backgroundColor: colors.danger + '20' }]}>
              <Icon name="trash" size={28} style={{ color: colors.danger }} />
            </View>
            <Text style={styles.confirmTitle}>Delete Transfer?</Text>
            <Text style={styles.confirmText}>
              This will permanently remove the transfer record to "{transferToDelete?.destination}".
            </Text>
            <View style={styles.confirmActions}>
              <Button text="Cancel" onPress={() => { setShowDeleteModal(false); setTransferToDelete(null); }} style={{ flex: 1 }} variant="secondary" />
              <Button text="Delete" onPress={() => transferToDelete && confirmDelete(transferToDelete.id)} style={{ flex: 1 }} variant="danger" />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal visible={showEditModal} animationType="fade" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.overlayCenter}>
          <View style={styles.editCard}>
            <View style={styles.editHeader}>
              <Icon name="create-outline" size={22} style={{ color: colors.primary }} />
              <Text style={styles.editTitle}>
                Edit {editingTransfer?.type === 'incoming' ? 'Supply Received' : 'Transfer'}
              </Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingTransfer(null); }}>
                <Icon name="close" size={22} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Details</Text>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Sent From</Text>
                  <TextInput style={styles.editInput} value={editSentFrom} onChangeText={setEditSentFrom} placeholder="Warehouse or location" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Destination</Text>
                  <TextInput style={styles.editInput} value={editDestination} onChangeText={setEditDestination} placeholder="Destination" placeholderTextColor={colors.textSecondary} />
                </View>
                {editingTransfer?.type === 'incoming' && (
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Supplier / Source</Text>
                    <TextInput style={styles.editInput} value={editSource} onChangeText={setEditSource} placeholder="Supplier name" placeholderTextColor={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Order / Invoice #</Text>
                  <TextInput style={styles.editInput} value={editOrderNumber} onChangeText={setEditOrderNumber} placeholder="Order number" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Notes</Text>
                  <TextInput style={[styles.editInput, { minHeight: 70, textAlignVertical: 'top' }]} value={editNotes} onChangeText={setEditNotes} placeholder="Optional notes" placeholderTextColor={colors.textSecondary} multiline />
                </View>
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Items</Text>
                {editItems.map((item, idx) => (
                  <View key={idx} style={styles.editItemCard}>
                    <TextInput
                      style={[styles.editInput, { marginBottom: spacing.sm }]}
                      value={item.name}
                      onChangeText={v => updateEditItem(idx, 'name', v)}
                      placeholder="Item name"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editFieldLabel}>Qty</Text>
                        <TextInput
                          style={styles.editInput}
                          value={item.quantity.toString()}
                          onChangeText={v => updateEditItem(idx, 'quantity', parseInt(v) || 0)}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editFieldLabel}>Unit</Text>
                        <TextInput
                          style={styles.editInput}
                          value={item.unit}
                          onChangeText={v => updateEditItem(idx, 'unit', v)}
                          placeholder="units"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editFieldLabel}>Unit Cost $</Text>
                        <TextInput
                          style={styles.editInput}
                          value={(item.unitCost || 0).toString()}
                          onChangeText={v => updateEditItem(idx, 'unitCost', parseFloat(v) || 0)}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                    <View style={styles.editItemTotal}>
                      <Text style={styles.editFieldLabel}>Total:</Text>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>
                        {formatCurrency((item.quantity || 0) * (item.unitCost || 0))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.editActions}>
              <Button text="Cancel" onPress={() => { setShowEditModal(false); setEditingTransfer(null); }} style={{ flex: 1 }} variant="secondary" />
              <Button text="Save Changes" onPress={handleSaveEdit} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

// ─── TransferCard sub-component ─────────────────────────────────────────────

interface TransferCardProps {
  transfer: InventoryTransfer;
  onEdit: () => void;
  onDelete: () => void;
}

const TransferCard = memo<TransferCardProps>(({ transfer, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const isIncoming = transfer.type === 'incoming';
  const accentColor = isIncoming ? colors.success : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded(v => !v)}
      style={[styles.card, { borderLeftColor: accentColor }]}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.cardTypeDot, { backgroundColor: accentColor + '20' }]}>
          <Icon name={isIncoming ? 'download' : 'send'} size={16} style={{ color: accentColor }} />
        </View>

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.cardDest} numberOfLines={1}>{transfer.destination}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
            <Icon name="time-outline" size={12} style={{ color: colors.textSecondary }} />
            <Text style={styles.cardMeta}>{toTimeString(transfer.timestamp)}</Text>
            {transfer.sentFrom && (
              <>
                <Text style={styles.cardMetaDot}>·</Text>
                <Icon name="location-outline" size={12} style={{ color: colors.textSecondary }} />
                <Text style={styles.cardMeta} numberOfLines={1}>{transfer.sentFrom}</Text>
              </>
            )}
          </View>
          {transfer.orderNumber && (
            <Text style={[styles.cardMeta, { color: colors.info, marginTop: 2 }]}>#{transfer.orderNumber}</Text>
          )}
        </View>

        <View style={styles.cardRight}>
          {transfer.totalValue !== undefined && transfer.totalValue > 0 && (
            <Text style={[styles.cardValue, { color: accentColor }]}>{formatCurrency(transfer.totalValue)}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={e => { e.stopPropagation?.(); onEdit(); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="create-outline" size={15} style={{ color: colors.primary }} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.danger + '15' }]}
              onPress={e => { e.stopPropagation?.(); onDelete(); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="trash-outline" size={15} style={{ color: colors.danger }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Item summary (always visible) */}
      <View style={styles.cardItems}>
        {transfer.items.slice(0, expanded ? undefined : 2).map((item, i) => (
          <View key={i} style={styles.cardItem}>
            <View style={[styles.cardItemDot, { backgroundColor: accentColor }]} />
            <Text style={styles.cardItemText}>
              <Text style={{ fontWeight: '700', color: accentColor }}>{item.quantity} {item.unit}</Text>
              {' '}{item.name}
            </Text>
            {item.totalCost !== undefined && (
              <Text style={styles.cardItemCost}>{formatCurrency(item.totalCost)}</Text>
            )}
          </View>
        ))}
        {!expanded && transfer.items.length > 2 && (
          <Text style={[styles.cardMeta, { color: colors.primary, marginTop: 2 }]}>
            +{transfer.items.length - 2} more — tap to expand
          </Text>
        )}
      </View>

      {/* Expanded: notes */}
      {expanded && transfer.notes && (
        <View style={styles.cardNotes}>
          <Icon name="document-text-outline" size={13} style={{ color: colors.textSecondary, marginRight: 4 }} />
          <Text style={styles.cardNotesText}>{transfer.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

TransferCard.displayName = 'TransferCard';

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webBackdrop: {
    position: 'fixed' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  sheet: {
    width: Platform.OS === 'ios' ? '100%' : '92%',
    maxWidth: 700,
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && { zIndex: 10000, position: 'relative' as any }),
  },
  sheetIos: {
    width: '100%',
    maxWidth: undefined,
    maxHeight: '100%',
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  statLbl: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  filterToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 46,
    marginTop: 8,
  },
  filterSubLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
  },
  filterInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: '#fff',
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  dateBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  // Transfer card
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTypeDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDest: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardMetaDot: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItems: {
    gap: spacing.xs,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardItemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  cardItemText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  cardItemCost: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.sm,
  },
  cardNotesText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  // Overlay modals
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  confirmText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  editCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  editScroll: {
    flex: 1,
    padding: spacing.lg,
  },
  editSection: {
    marginBottom: spacing.lg,
  },
  editSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  editField: {
    marginBottom: spacing.md,
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  editInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editItemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editItemTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
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
