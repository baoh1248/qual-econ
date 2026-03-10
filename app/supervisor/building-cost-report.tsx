
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import { formatCurrency } from '../../utils/inventoryTracking';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuildingMetrics {
  buildingName: string;
  clientName: string;
  supplyCost: number;          // total cost of outgoing transfers in range
  visitCount: number;          // completed/scheduled entries in range
  costPerVisit: number;        // supplyCost / visitCount
  transferCount: number;       // number of supply deliveries
  topItems: { name: string; cost: number }[];
}

interface ClientGroup {
  clientName: string;
  buildings: BuildingMetrics[];
  totalCost: number;
  totalVisits: number;
}

type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'custom';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  custom: 'Custom',
};

const getDateRange = (range: DateRange, customFrom: string, customTo: string): { from: string; to: string } => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (range === 'custom') {
    return { from: customFrom, to: customTo || fmt(now) };
  }

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = fmt(now);

  switch (range) {
    case 'this_month':
      return { from: fmt(firstOfMonth), to: today };
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: fmt(start), to: today };
    }
    case 'last_6_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from: fmt(start), to: today };
    }
    default:
      return { from: fmt(firstOfMonth), to: today };
  }
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BuildingCostReport() {
  const { toastVisible, toastMessage, toastType, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'cost' | 'visits' | 'efficiency'>('cost');

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange(dateRange, customFrom, customTo);
      const toEnd = to + 'T23:59:59Z';

      // Load outgoing transfers (supply deliveries to buildings)
      const { data: transfers, error: tErr } = await supabase
        .from('inventory_transfers')
        .select('destination, total_value, timestamp, items, type')
        .eq('type', 'outgoing')
        .gte('timestamp', from + 'T00:00:00Z')
        .lte('timestamp', toEnd);

      if (tErr) throw tErr;

      // Load schedule entries (visits) - count by building
      const { data: scheduleEntries, error: sErr } = await supabase
        .from('schedule_entries')
        .select('building_name, client_name, date, status')
        .gte('date', from)
        .lte('date', to);

      if (sErr) {
        console.warn('Could not load schedule entries:', sErr.message);
      }

      // ── Aggregate by building ─────────────────────────────────────────────
      const buildingMap: Record<string, BuildingMetrics> = {};

      // Process transfers
      for (const t of transfers || []) {
        const bname = t.destination || 'Unknown Building';
        if (!buildingMap[bname]) {
          buildingMap[bname] = {
            buildingName: bname,
            clientName: '', // will be filled from schedule
            supplyCost: 0,
            visitCount: 0,
            costPerVisit: 0,
            transferCount: 0,
            topItems: [],
          };
        }
        buildingMap[bname].supplyCost += t.total_value || 0;
        buildingMap[bname].transferCount += 1;

        // Track item costs
        const items: { name: string; totalCost?: number }[] = t.items || [];
        for (const item of items) {
          const existing = buildingMap[bname].topItems.find(i => i.name === item.name);
          if (existing) {
            existing.cost += item.totalCost || 0;
          } else {
            buildingMap[bname].topItems.push({ name: item.name, cost: item.totalCost || 0 });
          }
        }
      }

      // Process schedule entries for visit counts
      for (const entry of scheduleEntries || []) {
        const bname = entry.building_name || 'Unknown Building';
        if (!buildingMap[bname]) {
          buildingMap[bname] = {
            buildingName: bname,
            clientName: entry.client_name || '',
            supplyCost: 0,
            visitCount: 0,
            costPerVisit: 0,
            transferCount: 0,
            topItems: [],
          };
        }
        // Count non-cancelled visits
        if (entry.status !== 'cancelled') {
          buildingMap[bname].visitCount += 1;
        }
        // Use most recent client name
        if (entry.client_name && !buildingMap[bname].clientName) {
          buildingMap[bname].clientName = entry.client_name;
        }
      }

      // Calculate cost per visit and sort top items
      for (const bname of Object.keys(buildingMap)) {
        const b = buildingMap[bname];
        b.costPerVisit = b.visitCount > 0 ? b.supplyCost / b.visitCount : 0;
        b.topItems = b.topItems
          .sort((a, c) => c.cost - a.cost)
          .slice(0, 3);
      }

      // Group by client
      const clientMap: Record<string, ClientGroup> = {};
      for (const b of Object.values(buildingMap)) {
        const clientKey = b.clientName || 'Unassigned';
        if (!clientMap[clientKey]) {
          clientMap[clientKey] = { clientName: clientKey, buildings: [], totalCost: 0, totalVisits: 0 };
        }
        clientMap[clientKey].buildings.push(b);
        clientMap[clientKey].totalCost += b.supplyCost;
        clientMap[clientKey].totalVisits += b.visitCount;
      }

      // Sort buildings within each client by selected metric
      for (const group of Object.values(clientMap)) {
        group.buildings.sort((a, b) => {
          if (sortBy === 'cost') return b.supplyCost - a.supplyCost;
          if (sortBy === 'visits') return b.visitCount - a.visitCount;
          return b.costPerVisit - a.costPerVisit;
        });
      }

      // Sort clients by total cost desc
      const groups = Object.values(clientMap).sort((a, b) => b.totalCost - a.totalCost);
      setClientGroups(groups);

      // Auto-expand the first client
      if (groups.length > 0) {
        setExpandedClients(new Set([groups[0].clientName]));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customFrom, customTo, sortBy, showToast]);

  useFocusEffect(useCallback(() => { loadReport(); }, [loadReport]));

  const toggleClient = (name: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ── Summary stats ──────────────────────────────────────────────────────────

  const totalCost = clientGroups.reduce((s, g) => s + g.totalCost, 0);
  const totalVisits = clientGroups.reduce((s, g) => s + g.totalVisits, 0);
  const overallCostPerVisit = totalVisits > 0 ? totalCost / totalVisits : 0;
  const totalBuildings = clientGroups.reduce((s, g) => s + g.buildings.length, 0);

  const { from, to } = getDateRange(dateRange, customFrom, customTo);

  const getEfficiencyColor = (cPV: number) => {
    if (cPV === 0) return colors.textSecondary;
    if (cPV <= overallCostPerVisit * 0.75) return colors.success;
    if (cPV <= overallCostPerVisit * 1.25) return colors.primary;
    return colors.warning;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

      {/* Header */}
      <View style={styles.header}>
        <View style={commonStyles.row}>
          <IconButton icon="arrow-back" onPress={() => router.back()} variant="white" />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={styles.headerTitle}>Building Cost Report</Text>
            <Text style={styles.headerSub}>{from} → {to}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadReport}>
          <Icon name="refresh" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Date Range Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rangeScroll}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.sm }}
      >
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(range => (
          <TouchableOpacity
            key={range}
            style={[styles.rangeChip, dateRange === range && styles.rangeChipActive]}
            onPress={() => setDateRange(range)}
          >
            <Text style={[styles.rangeChipText, dateRange === range && styles.rangeChipTextActive]}>
              {DATE_RANGE_LABELS[range]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom date inputs */}
      {dateRange === 'custom' && (
        <View style={[commonStyles.row, { paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>From</Text>
            <TextInput
              style={commonStyles.textInput}
              value={customFrom}
              onChangeText={setCustomFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              onBlur={loadReport}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>To</Text>
            <TextInput
              style={commonStyles.textInput}
              value={customTo}
              onChangeText={setCustomTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              onBlur={loadReport}
            />
          </View>
        </View>
      )}

      {/* Sort selector */}
      <View style={[commonStyles.row, { paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm }]}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginRight: spacing.xs }]}>Sort by:</Text>
        {(['cost', 'visits', 'efficiency'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
              {s === 'cost' ? 'Supply Cost' : s === 'visits' ? 'Visits' : 'Cost/Visit'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <LoadingSpinner /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>

          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary }]}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>Total Supply Spend</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(totalCost)}</Text>
              <Text style={styles.summaryMeta}>{totalBuildings} buildings</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.success + '12', borderColor: colors.success }]}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Total Visits</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{totalVisits}</Text>
              <Text style={styles.summaryMeta}>{clientGroups.length} clients</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning }]}>
              <Text style={[styles.summaryLabel, { color: colors.warning }]}>Avg Cost / Visit</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                {totalVisits > 0 ? formatCurrency(overallCostPerVisit) : '—'}
              </Text>
              <Text style={styles.summaryMeta}>across all buildings</Text>
            </View>
          </View>

          {clientGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bar-chart" size={48} style={{ color: colors.textSecondary }} />
              <Text style={styles.emptyText}>No data for this period</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                Supply deliveries and schedule entries will appear here
              </Text>
            </View>
          ) : (
            clientGroups.map(group => {
              const isExpanded = expandedClients.has(group.clientName);
              const groupCostPerVisit = group.totalVisits > 0 ? group.totalCost / group.totalVisits : 0;

              return (
                <View key={group.clientName} style={styles.clientGroup}>
                  {/* Client header */}
                  <TouchableOpacity
                    style={styles.clientHeader}
                    onPress={() => toggleClient(group.clientName)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{group.clientName}</Text>
                      <View style={[commonStyles.row, { gap: spacing.md, marginTop: 3, flexWrap: 'wrap' }]}>
                        <Text style={styles.clientMeta}>
                          {formatCurrency(group.totalCost)} supply
                        </Text>
                        <Text style={styles.clientMeta}>
                          {group.totalVisits} visits
                        </Text>
                        {groupCostPerVisit > 0 && (
                          <Text style={[styles.clientMeta, { color: colors.warning, fontWeight: '600' }]}>
                            {formatCurrency(groupCostPerVisit)}/visit
                          </Text>
                        )}
                        <Text style={styles.clientMeta}>{group.buildings.length} buildings</Text>
                      </View>
                    </View>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      style={{ color: colors.textSecondary }}
                    />
                  </TouchableOpacity>

                  {/* Buildings */}
                  {isExpanded && group.buildings.map(building => (
                    <View key={building.buildingName} style={styles.buildingCard}>
                      {/* Building name + cost per visit */}
                      <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                        <Text style={styles.buildingName} numberOfLines={1} style={{ flex: 1 }}>
                          {building.buildingName}
                        </Text>
                        <View style={[
                          styles.cPVBadge,
                          { backgroundColor: getEfficiencyColor(building.costPerVisit) + '20' }
                        ]}>
                          <Text style={[styles.cPVText, { color: getEfficiencyColor(building.costPerVisit) }]}>
                            {building.visitCount > 0
                              ? `${formatCurrency(building.costPerVisit)}/visit`
                              : 'No visits'}
                          </Text>
                        </View>
                      </View>

                      {/* Metrics row */}
                      <View style={styles.metricsRow}>
                        <View style={styles.metricBox}>
                          <Text style={styles.metricLabel}>Supply Cost</Text>
                          <Text style={[styles.metricValue, { color: colors.primary }]}>
                            {formatCurrency(building.supplyCost)}
                          </Text>
                          <Text style={styles.metricSub}>{building.transferCount} deliveries</Text>
                        </View>
                        <View style={[styles.metricBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
                          <Text style={styles.metricLabel}>Visits</Text>
                          <Text style={[styles.metricValue, { color: colors.success }]}>
                            {building.visitCount}
                          </Text>
                          <Text style={styles.metricSub}>in period</Text>
                        </View>
                        <View style={styles.metricBox}>
                          <Text style={styles.metricLabel}>Cost / Visit</Text>
                          <Text style={[styles.metricValue, { color: getEfficiencyColor(building.costPerVisit) }]}>
                            {building.visitCount > 0 ? formatCurrency(building.costPerVisit) : '—'}
                          </Text>
                          <Text style={styles.metricSub}>
                            {building.visitCount > 0 && overallCostPerVisit > 0
                              ? building.costPerVisit <= overallCostPerVisit
                                ? '↓ below avg'
                                : '↑ above avg'
                              : '—'}
                          </Text>
                        </View>
                      </View>

                      {/* Top items */}
                      {building.topItems.length > 0 && (
                        <View style={styles.topItemsSection}>
                          <Text style={styles.topItemsLabel}>Top supply costs:</Text>
                          <View style={[commonStyles.row, { gap: spacing.sm, flexWrap: 'wrap' }]}>
                            {building.topItems.map(item => (
                              <View key={item.name} style={styles.itemTag}>
                                <Text style={styles.itemTagText} numberOfLines={1}>
                                  {item.name} ({formatCurrency(item.cost)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Callout for billing validation */}
                      {building.visitCount > 0 && (
                        <View style={styles.callout}>
                          <Icon name="information-circle" size={14} color={colors.primary} />
                          <Text style={styles.calloutText} numberOfLines={2}>
                            {building.buildingName} received {formatCurrency(building.supplyCost)} in supplies
                            this period, averaging {formatCurrency(building.costPerVisit)} per cleaning visit.
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
  refreshBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  rangeScroll: { maxHeight: 52 },
  rangeChip: {
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md,
    borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  rangeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  rangeChipTextActive: { color: colors.background, fontWeight: '700' },
  sortChip: {
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    borderRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  sortChipText: { fontSize: 12, color: colors.textSecondary },
  sortChipTextActive: { color: colors.primary, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1, borderRadius: 12, padding: spacing.sm,
    borderWidth: 1, alignItems: 'center',
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  summaryMeta: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  clientGroup: {
    backgroundColor: colors.surface, borderRadius: 14, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  clientHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  clientName: { fontSize: 15, fontWeight: '700', color: colors.text },
  clientMeta: { fontSize: 12, color: colors.textSecondary },
  buildingCard: {
    marginHorizontal: spacing.sm, marginBottom: spacing.sm,
    backgroundColor: colors.background, borderRadius: 10, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  buildingName: { fontSize: 14, fontWeight: '700', color: colors.text },
  cPVBadge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3, marginLeft: spacing.sm },
  cPVText: { fontSize: 12, fontWeight: '700' },
  metricsRow: {
    flexDirection: 'row', marginTop: spacing.sm,
    backgroundColor: colors.backgroundAlt, borderRadius: 8, overflow: 'hidden',
  },
  metricBox: { flex: 1, padding: spacing.sm, alignItems: 'center' },
  metricLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  metricSub: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  topItemsSection: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border + '50' },
  topItemsLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs },
  itemTag: {
    backgroundColor: colors.primary + '12', borderRadius: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  itemTagText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  callout: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: colors.primary + '10', borderRadius: 8,
    padding: spacing.sm, marginTop: spacing.sm,
  },
  calloutText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
});
