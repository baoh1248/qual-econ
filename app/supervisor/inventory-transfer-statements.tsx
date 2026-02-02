
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import { getInventoryTransferLogs, formatCurrency, type InventoryTransfer } from '../../utils/inventoryTracking';

type ViewMode = 'item' | 'building';

interface ItemTransaction {
  date: string;
  type: 'incoming' | 'outgoing';
  quantity: number;
  location: string; // client name or supplier name
  sentFrom?: string;
  transferId: string;
  transferredBy: string;
  notes?: string;
}

interface ItemLedger {
  itemName: string;
  unit: string;
  beginningBalance: number;
  transactions: ItemTransaction[];
  endingBalance: number;
  totalIncoming: number;
  totalOutgoing: number;
}

interface MonthlyInventoryStatement {
  month: string;
  year: number;
  itemLedgers: ItemLedger[];
}

interface BuildingTransfer {
  id: string;
  date: string;
  timestamp: string;
  items: { name: string; quantity: number; unit: string; unitCost?: number; totalCost?: number }[];
  transferredBy: string;
  notes?: string;
  sentFrom?: string;
  type: 'incoming' | 'outgoing';
  totalValue?: number;
}

interface BuildingItemBalance {
  itemName: string;
  unit: string;
  quantity: number;
}

interface BuildingMonthData {
  month: string;
  transfers: BuildingTransfer[];
  itemBeginningBalances: BuildingItemBalance[];
  itemEndingBalances: BuildingItemBalance[];
  totalValue: number;
}

interface BuildingLedger {
  buildingName: string;
  clientName: string;
  months: BuildingMonthData[];
  totalTransfers: number;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  monthCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  monthTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  itemLedgerCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold as any,
  },
  balanceValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  transactionsTable: {
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '20',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tableHeaderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    textTransform: 'uppercase',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  transactionDate: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    width: 55,
  },
  transactionLocation: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.semibold as any,
    flex: 1,
  },
  transactionType: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    width: 75,
  },
  transactionQuantity: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    width: 50,
    textAlign: 'right',
  },
  quantityIncoming: {
    color: colors.success,
  },
  quantityOutgoing: {
    color: colors.error,
  },
  endingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '15',
    borderRadius: 6,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  endingBalanceLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  endingBalanceValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
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
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
  },
  yearButton: {
    padding: spacing.sm,
  },
  yearText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  noTransactions: {
    padding: spacing.md,
    alignItems: 'center',
  },
  noTransactionsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.md,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.textSecondary,
  },
  viewToggleTextActive: {
    color: colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterDropdownText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    flex: 1,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.textSecondary,
  },
  buildingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buildingMonthSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  buildingMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  buildingMonthTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    flex: 1,
  },
  balanceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  balanceItemName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  balanceItemValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  buildingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  buildingName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    flex: 1,
  },
  buildingClient: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transferCount: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold as any,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  transferCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  transferCardIncoming: {
    borderLeftColor: colors.success,
  },
  transferDate: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: 4,
  },
  transferItems: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  transferBy: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  transferItemsContainer: {
    marginTop: spacing.xs,
  },
  transferItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  transferItemName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  transferItemDetails: {
    alignItems: 'flex-end',
  },
  transferItemQty: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  transferItemCost: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  transferItemTotal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary,
  },
  transferTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  transferTotalLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  transferTotalValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  modalOptionText: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  modalOptionSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold as any,
  },
});

export default function InventoryTransferStatementsScreen() {
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config } = useDatabase();

  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyInventoryStatement[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('item');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());

  const loadTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading inventory transfers for statements...');

      const logs = await getInventoryTransferLogs();
      console.log(`✅ Loaded ${logs.length} transfer logs`);

      // Ensure all transfers have a type (default to 'outgoing' for backward compatibility)
      const normalizedLogs = logs.map(transfer => ({
        ...transfer,
        type: transfer.type || 'outgoing' as 'outgoing' | 'incoming',
      }));

      setTransfers(normalizedLogs);
    } catch (error) {
      console.error('❌ Failed to load transfers:', error);
      showToast('Failed to load transfer history', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Reload transfers every time the screen comes into focus (not just on mount)
  useFocusEffect(
    useCallback(() => {
      loadTransfers();
    }, [loadTransfers])
  );

  useEffect(() => {
    // Build monthly inventory statements with item ledgers
    const statementsByMonth: { [key: string]: MonthlyInventoryStatement } = {};
    const itemBalances: { [itemName: string]: number } = {}; // Track running balances across months

    // Sort transfers chronologically to calculate balances correctly
    const sortedTransfers = [...transfers]
      .filter(t => new Date(t.timestamp).getFullYear() === selectedYear)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Group transfers by month
    const transfersByMonth: { [key: string]: InventoryTransfer[] } = {};
    sortedTransfers.forEach(transfer => {
      const date = new Date(transfer.timestamp);
      const month = date.toLocaleString('default', { month: 'long' });
      const key = `${selectedYear}-${month}`;

      if (!transfersByMonth[key]) {
        transfersByMonth[key] = [];
      }
      transfersByMonth[key].push(transfer);
    });

    // Process each month in order
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    monthOrder.forEach(month => {
      const key = `${selectedYear}-${month}`;
      const monthTransfers = transfersByMonth[key] || [];

      if (monthTransfers.length === 0) return;

      // Build item ledgers for this month
      const itemLedgersMap: { [itemName: string]: ItemLedger } = {};

      monthTransfers.forEach(transfer => {
        transfer.items.forEach(item => {
          if (!itemLedgersMap[item.name]) {
            itemLedgersMap[item.name] = {
              itemName: item.name,
              unit: item.unit,
              beginningBalance: itemBalances[item.name] || 0,
              transactions: [],
              endingBalance: 0,
              totalIncoming: 0,
              totalOutgoing: 0,
            };
          }

          const transaction: ItemTransaction = {
            date: new Date(transfer.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            type: transfer.type,
            quantity: item.quantity,
            location: transfer.type === 'incoming' ? (transfer.source || 'Supplier') : transfer.destination,
            sentFrom: transfer.sentFrom,
            transferId: transfer.id,
            transferredBy: transfer.transferredBy,
            notes: transfer.notes,
          };

          itemLedgersMap[item.name].transactions.push(transaction);

          if (transfer.type === 'incoming') {
            itemLedgersMap[item.name].totalIncoming += item.quantity;
          } else {
            itemLedgersMap[item.name].totalOutgoing += item.quantity;
          }
        });
      });

      // Calculate ending balances and update running balances
      Object.values(itemLedgersMap).forEach(ledger => {
        ledger.endingBalance = ledger.beginningBalance + ledger.totalIncoming - ledger.totalOutgoing;
        itemBalances[ledger.itemName] = ledger.endingBalance;

        // Sort transactions by date
        ledger.transactions.sort((a, b) => {
          const dateA = monthTransfers.find(t => t.id === a.transferId)?.timestamp || '';
          const dateB = monthTransfers.find(t => t.id === b.transferId)?.timestamp || '';
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
      });

      statementsByMonth[key] = {
        month,
        year: selectedYear,
        itemLedgers: Object.values(itemLedgersMap).sort((a, b) => a.itemName.localeCompare(b.itemName)),
      };
    });

    // Convert to array and sort by month
    const statements = monthOrder
      .map(month => statementsByMonth[`${selectedYear}-${month}`])
      .filter(Boolean);

    setMonthlyStatements(statements);
  }, [transfers, selectedYear]);

  const availableYears = Array.from(
    new Set(transfers.map(t => new Date(t.timestamp).getFullYear()))
  ).sort((a, b) => b - a);

  // Extract unique buildings from outgoing transfers
  const uniqueBuildings = useMemo(() => {
    const buildings = new Map<string, { buildingName: string; clientName: string }>();

    transfers
      .filter(t => t.type === 'outgoing' && new Date(t.timestamp).getFullYear() === selectedYear)
      .forEach(t => {
        // Parse destination format: "ClientName - BuildingName" or "ClientName - GroupName (X buildings)"
        const destination = t.destination;
        if (!destination) return;

        const dashIndex = destination.indexOf(' - ');
        if (dashIndex > 0) {
          const clientName = destination.substring(0, dashIndex);
          let buildingName = destination.substring(dashIndex + 3);

          // Remove "(X buildings)" suffix if present (building groups)
          const groupMatch = buildingName.match(/^(.+?)\s*\(\d+\s*buildings?\)$/i);
          if (groupMatch) {
            buildingName = groupMatch[1].trim();
          }

          const key = `${clientName}|${buildingName}`;
          if (!buildings.has(key)) {
            buildings.set(key, { buildingName, clientName });
          }
        }
      });

    return Array.from(buildings.values()).sort((a, b) => {
      const clientCompare = a.clientName.localeCompare(b.clientName);
      if (clientCompare !== 0) return clientCompare;
      return a.buildingName.localeCompare(b.buildingName);
    });
  }, [transfers, selectedYear]);

  // Build building ledgers for building view (with monthly breakdown and balances)
  const buildingLedgers = useMemo(() => {
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const parseDestination = (dest: string) => {
      const dashIndex = dest.indexOf(' - ');
      if (dashIndex <= 0) return { clientName: 'Unknown', buildingName: dest, key: `Unknown|${dest}` };
      const clientName = dest.substring(0, dashIndex);
      let buildingName = dest.substring(dashIndex + 3);
      const groupMatch = buildingName.match(/^(.+?)\s*\(\d+\s*buildings?\)$/i);
      if (groupMatch) buildingName = groupMatch[1].trim();
      return { clientName, buildingName, key: `${clientName}|${buildingName}` };
    };

    // Group ALL outgoing transfers by building (all years, for balance calculation)
    const buildingGroups = new Map<string, {
      buildingName: string;
      clientName: string;
      transfers: InventoryTransfer[];
    }>();

    transfers
      .filter(t => t.type === 'outgoing')
      .filter(t => {
        if (selectedBuilding === 'all') return true;
        const { key } = parseDestination(t.destination || '');
        return key === selectedBuilding;
      })
      .forEach(t => {
        const { clientName, buildingName, key } = parseDestination(t.destination || 'Unknown');
        if (!buildingGroups.has(key)) {
          buildingGroups.set(key, { buildingName, clientName, transfers: [] });
        }
        buildingGroups.get(key)!.transfers.push(t);
      });

    const result: BuildingLedger[] = [];

    buildingGroups.forEach(({ buildingName, clientName, transfers: bTransfers }) => {
      // Sort chronologically for running balance
      const sorted = [...bTransfers].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Running per-item balances
      const runningBalances = new Map<string, { quantity: number; unit: string }>();

      // Process all transfers BEFORE selected year to get opening balances
      sorted
        .filter(t => new Date(t.timestamp).getFullYear() < selectedYear)
        .forEach(t => {
          t.items.forEach(item => {
            const cur = runningBalances.get(item.name) || { quantity: 0, unit: item.unit };
            cur.quantity += item.quantity;
            runningBalances.set(item.name, { ...cur });
          });
        });

      // Process each month of the selected year
      const yearTransfers = sorted.filter(t =>
        new Date(t.timestamp).getFullYear() === selectedYear
      );

      const months: BuildingMonthData[] = [];
      let totalTransfers = 0;

      monthOrder.forEach(monthName => {
        const monthTransfers = yearTransfers.filter(t =>
          new Date(t.timestamp).toLocaleString('default', { month: 'long' }) === monthName
        );
        if (monthTransfers.length === 0) return;

        totalTransfers += monthTransfers.length;

        // Snapshot beginning balances
        const beginningBalances = Array.from(runningBalances.entries())
          .map(([name, { quantity, unit }]) => ({ itemName: name, unit, quantity }))
          .sort((a, b) => a.itemName.localeCompare(b.itemName));

        // Process transfers and update running balances
        const converted: BuildingTransfer[] = [];
        monthTransfers.forEach(t => {
          t.items.forEach(item => {
            const cur = runningBalances.get(item.name) || { quantity: 0, unit: item.unit };
            cur.quantity += item.quantity;
            runningBalances.set(item.name, { ...cur });
          });
          converted.push({
            id: t.id,
            date: new Date(t.timestamp).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }),
            timestamp: t.timestamp,
            items: t.items.map(item => ({
              name: item.name, quantity: item.quantity, unit: item.unit,
              unitCost: item.unitCost, totalCost: item.totalCost,
            })),
            transferredBy: t.transferredBy,
            notes: t.notes,
            sentFrom: t.sentFrom,
            type: t.type,
            totalValue: t.totalValue,
          });
        });

        // Snapshot ending balances
        const endingBalances = Array.from(runningBalances.entries())
          .map(([name, { quantity, unit }]) => ({ itemName: name, unit, quantity }))
          .sort((a, b) => a.itemName.localeCompare(b.itemName));

        months.push({
          month: monthName,
          transfers: converted,
          itemBeginningBalances: beginningBalances,
          itemEndingBalances: endingBalances,
          totalValue: monthTransfers.reduce((sum, t) => sum + (t.totalValue || 0), 0),
        });
      });

      if (totalTransfers > 0) {
        result.push({ buildingName, clientName, months, totalTransfers });
      }
    });

    return result.sort((a, b) => {
      const cc = a.clientName.localeCompare(b.clientName);
      if (cc !== 0) return cc;
      return a.buildingName.localeCompare(b.buildingName);
    });
  }, [transfers, selectedYear, selectedBuilding]);

  const toggleMonth = (index: number) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMonths(newExpanded);
  };

  const toggleBuilding = (key: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedBuildings(newExpanded);
  };

  const getSelectedBuildingLabel = () => {
    if (selectedBuilding === 'all') return 'All Buildings';
    const [clientName, buildingName] = selectedBuilding.split('|');
    return `${buildingName} (${clientName})`;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <CompanyLogo />
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={{ fontSize: typography.sizes.xl, fontWeight: typography.weights.bold as any, marginBottom: spacing.md }}>
          Monthly Inventory Statements
        </Text>

        {/* Year Selector */}
        {availableYears.length > 0 && (
          <View style={styles.yearSelector}>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => {
                const currentIndex = availableYears.indexOf(selectedYear);
                if (currentIndex < availableYears.length - 1) {
                  setSelectedYear(availableYears[currentIndex + 1]);
                }
              }}
              disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
            >
              <Icon
                name="chevron-back"
                size={24}
                color={availableYears.indexOf(selectedYear) === availableYears.length - 1 ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>

            <Text style={styles.yearText}>{selectedYear}</Text>

            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => {
                const currentIndex = availableYears.indexOf(selectedYear);
                if (currentIndex > 0) {
                  setSelectedYear(availableYears[currentIndex - 1]);
                }
              }}
              disabled={availableYears.indexOf(selectedYear) === 0}
            >
              <Icon
                name="chevron-forward"
                size={24}
                color={availableYears.indexOf(selectedYear) === 0 ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* View Toggle */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'item' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('item')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'item' && styles.viewToggleTextActive]}>
              Item View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'building' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('building')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'building' && styles.viewToggleTextActive]}>
              Building View
            </Text>
          </TouchableOpacity>
        </View>

        {/* Building Filter (only in building view) */}
        {viewMode === 'building' && uniqueBuildings.length > 0 && (
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter:</Text>
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => setShowBuildingPicker(true)}
            >
              <Text style={styles.filterDropdownText} numberOfLines={1}>
                {getSelectedBuildingLabel()}
              </Text>
              <Icon name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Item View */}
        {viewMode === 'item' && (
          <>
            {monthlyStatements.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="document-text-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>
                  No inventory activity for {selectedYear}
                </Text>
              </View>
            ) : (
              monthlyStatements.map((statement, index) => {
                const isExpanded = expandedMonths.has(index);
                return (
                  <AnimatedCard key={index} style={styles.monthCard}>
                    <TouchableOpacity onPress={() => toggleMonth(index)}>
                      <View style={styles.monthHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.monthTitle}>
                            {statement.month} {statement.year}
                          </Text>
                          <Text style={{ fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: 4 }}>
                            {statement.itemLedgers.length} {statement.itemLedgers.length === 1 ? 'item' : 'items'}
                          </Text>
                        </View>
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={28}
                          color={colors.primary}
                        />
                      </View>
                    </TouchableOpacity>

                  {isExpanded && statement.itemLedgers.map((ledger, ledgerIndex) => (
                    <View key={ledgerIndex} style={styles.itemLedgerCard}>
                      <View style={styles.itemHeader}>
                        <View>
                          <Text style={styles.itemName}>{ledger.itemName}</Text>
                          <Text style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                            Unit: {ledger.unit}
                          </Text>
                        </View>
                      </View>

                      {/* Beginning Balance */}
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLabel}>Beginning Balance</Text>
                        <Text style={styles.balanceValue}>{ledger.beginningBalance} {ledger.unit}</Text>
                      </View>

                      {/* Transactions */}
                      {ledger.transactions.length > 0 ? (
                        <View style={styles.transactionsTable}>
                          {/* Table Header */}
                          <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { width: 55 }]}>Date</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>From</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>To</Text>
                            <Text style={[styles.tableHeaderText, { width: 55 }]}>Type</Text>
                            <Text style={[styles.tableHeaderText, { width: 40, textAlign: 'right' }]}>Qty</Text>
                          </View>
                          {/* Table Rows */}
                          {ledger.transactions.map((transaction, txIndex) => (
                            <View key={txIndex} style={styles.transactionRow}>
                              <Text style={styles.transactionDate}>{transaction.date}</Text>
                              <Text style={[styles.transactionLocation, { flex: 1 }]} numberOfLines={1}>
                                {transaction.sentFrom || '-'}
                              </Text>
                              <Text style={[styles.transactionLocation, { flex: 1 }]} numberOfLines={1}>
                                {transaction.location}
                              </Text>
                              <Text style={[styles.transactionType, { width: 55 }]}>
                                {transaction.type === 'incoming' ? 'In' : 'Out'}
                              </Text>
                              <Text style={[
                                styles.transactionQuantity,
                                { width: 40 },
                                transaction.type === 'incoming' ? styles.quantityIncoming : styles.quantityOutgoing
                              ]}>
                                {transaction.type === 'incoming' ? '+' : '-'}{transaction.quantity}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.noTransactions}>
                          <Text style={styles.noTransactionsText}>No transactions this month</Text>
                        </View>
                      )}

                      {/* Summary */}
                      <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Total Received:</Text>
                          <Text style={[styles.summaryValue, { color: colors.success }]}>+{ledger.totalIncoming} {ledger.unit}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Total Sent:</Text>
                          <Text style={[styles.summaryValue, { color: colors.error }]}>-{ledger.totalOutgoing} {ledger.unit}</Text>
                        </View>
                      </View>

                      {/* Ending Balance */}
                      <View style={styles.endingBalanceRow}>
                        <Text style={styles.endingBalanceLabel}>Ending Balance</Text>
                        <Text style={styles.endingBalanceValue}>{ledger.endingBalance} {ledger.unit}</Text>
                      </View>
                    </View>
                  ))}
                </AnimatedCard>
                );
              })
            )}
          </>
        )}

        {/* Building View */}
        {viewMode === 'building' && (
          <>
            {buildingLedgers.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="business-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>
                  No outgoing transfers for {selectedYear}
                </Text>
              </View>
            ) : (
              buildingLedgers.map((ledger, index) => {
                const key = `${ledger.clientName}|${ledger.buildingName}`;
                const isExpanded = expandedBuildings.has(key);
                return (
                  <AnimatedCard key={key} style={styles.buildingCard}>
                    <TouchableOpacity onPress={() => toggleBuilding(key)}>
                      <View style={styles.buildingHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.buildingName}>{ledger.buildingName}</Text>
                          <Text style={styles.buildingClient}>{ledger.clientName}</Text>
                        </View>
                        <Text style={styles.transferCount}>
                          {ledger.totalTransfers} {ledger.totalTransfers === 1 ? 'transfer' : 'transfers'}
                        </Text>
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={24}
                          color={colors.primary}
                          style={{ marginLeft: spacing.sm }}
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ marginTop: spacing.sm }}>
                        {ledger.months.map((monthData) => (
                          <View key={monthData.month} style={styles.buildingMonthSection}>
                            {/* Month Header */}
                            <View style={styles.buildingMonthHeader}>
                              <Icon name="calendar" size={16} color={colors.primary} />
                              <Text style={styles.buildingMonthTitle}>{monthData.month}</Text>
                              <Text style={styles.transferCount}>
                                {monthData.transfers.length} {monthData.transfers.length === 1 ? 'transfer' : 'transfers'}
                              </Text>
                            </View>

                            {/* Beginning Balance */}
                            <View style={styles.balanceRow}>
                              <Text style={styles.balanceLabel}>Beginning Balance</Text>
                            </View>
                            {monthData.itemBeginningBalances.length > 0 ? (
                              monthData.itemBeginningBalances.map((b, i) => (
                                <View key={i} style={styles.balanceItemRow}>
                                  <Text style={styles.balanceItemName}>{b.itemName}</Text>
                                  <Text style={styles.balanceItemValue}>{b.quantity} {b.unit}</Text>
                                </View>
                              ))
                            ) : (
                              <View style={styles.balanceItemRow}>
                                <Text style={[styles.balanceItemName, { fontStyle: 'italic', color: colors.textSecondary }]}>No previous items</Text>
                              </View>
                            )}

                            {/* Transfers */}
                            {monthData.transfers.map((transfer) => (
                              <View
                                key={transfer.id}
                                style={[
                                  styles.transferCard,
                                  transfer.type === 'incoming' && styles.transferCardIncoming
                                ]}
                              >
                                <Text style={styles.transferDate}>{transfer.date}</Text>
                                {transfer.sentFrom && (
                                  <Text style={[styles.transferBy, { marginTop: 0, marginBottom: 4, fontStyle: 'normal', color: colors.primary }]}>
                                    From: {transfer.sentFrom}
                                  </Text>
                                )}
                                <View style={styles.transferItemsContainer}>
                                  {transfer.items.map((item, itemIdx) => (
                                    <View key={itemIdx} style={styles.transferItemRow}>
                                      <Text style={styles.transferItemName}>{item.name}</Text>
                                      <View style={styles.transferItemDetails}>
                                        <Text style={styles.transferItemQty}>
                                          {item.quantity} {item.unit}
                                        </Text>
                                        {item.unitCost !== undefined && item.unitCost > 0 && (
                                          <Text style={styles.transferItemCost}>
                                            @ {formatCurrency(item.unitCost)}/{item.unit}
                                          </Text>
                                        )}
                                        {item.totalCost !== undefined && item.totalCost > 0 && (
                                          <Text style={styles.transferItemTotal}>
                                            {formatCurrency(item.totalCost)}
                                          </Text>
                                        )}
                                      </View>
                                    </View>
                                  ))}
                                </View>
                                {transfer.totalValue !== undefined && transfer.totalValue > 0 && (
                                  <View style={styles.transferTotalRow}>
                                    <Text style={styles.transferTotalLabel}>Total Value:</Text>
                                    <Text style={styles.transferTotalValue}>
                                      {formatCurrency(transfer.totalValue)}
                                    </Text>
                                  </View>
                                )}
                                {transfer.notes && (
                                  <Text style={[styles.transferItems, { marginTop: spacing.sm, fontStyle: 'italic' }]}>
                                    Note: {transfer.notes}
                                  </Text>
                                )}
                                <Text style={styles.transferBy}>
                                  By: {transfer.transferredBy}
                                </Text>
                              </View>
                            ))}

                            {/* Month Total Value */}
                            {monthData.totalValue > 0 && (
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Month Total Value:</Text>
                                <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(monthData.totalValue)}</Text>
                              </View>
                            )}

                            {/* Ending Balance */}
                            <View style={styles.endingBalanceRow}>
                              <Text style={styles.endingBalanceLabel}>Ending Balance</Text>
                            </View>
                            {monthData.itemEndingBalances.map((b, i) => (
                              <View key={i} style={styles.balanceItemRow}>
                                <Text style={[styles.balanceItemName, { fontWeight: typography.weights.semibold as any }]}>{b.itemName}</Text>
                                <Text style={[styles.balanceItemValue, { color: colors.primary, fontWeight: typography.weights.bold as any }]}>
                                  {b.quantity} {b.unit}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </AnimatedCard>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* Building Picker Modal */}
      <Modal
        visible={showBuildingPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBuildingPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBuildingPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Building</Text>
              <TouchableOpacity onPress={() => setShowBuildingPicker(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setSelectedBuilding('all');
                  setShowBuildingPicker(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedBuilding === 'all' && styles.modalOptionSelected
                ]}>
                  All Buildings
                </Text>
                {selectedBuilding === 'all' && (
                  <Icon name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {uniqueBuildings.map((building, index) => {
                const key = `${building.clientName}|${building.buildingName}`;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.modalOption}
                    onPress={() => {
                      setSelectedBuilding(key);
                      setShowBuildingPicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.modalOptionText,
                        selectedBuilding === key && styles.modalOptionSelected
                      ]}>
                        {building.buildingName}
                      </Text>
                      <Text style={{ fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                        {building.clientName}
                      </Text>
                    </View>
                    {selectedBuilding === key && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
