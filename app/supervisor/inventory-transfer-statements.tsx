
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
import { supabase } from '../integrations/supabase/client';

type ViewMode = 'item' | 'building';

interface ItemTransaction {
  date: string;
  type: 'incoming' | 'outgoing';
  quantity: number;
  location: string; // client name or supplier name
  sentFrom?: string;
  orderNumber?: string;
  transferId: string;
  transferredBy: string;
  notes?: string;
  unitCost?: number;
  totalCost?: number;
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
  orderNumber?: string;
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
  printButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  printButtonText: {
    color: colors.background,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
  },
  expandAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandAllButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  buildingYearTotal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  monthSection: {
    marginBottom: spacing.lg,
  },
  monthSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  monthSectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  monthTotalBadge: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  summaryTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  summaryTableHeaderCell: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  summaryTableCell: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  summaryTableTotalRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  summaryTableTotalLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  summaryTableTotalValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  transferDatesRef: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  yearGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  yearGrandTotalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  yearGrandTotalValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
});

export default function InventoryTransferStatementsScreen() {
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config } = useDatabase();

  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [inventoryStock, setInventoryStock] = useState<{ [itemName: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyInventoryStatement[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('item');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());


  const handlePrint = useCallback(() => {
    if (Platform.OS !== 'web') return;

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;');
    const fmtCost = (v?: number) => v && v > 0 ? `$${v.toFixed(2)}` : '-';
    const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let tableHtml = '';

    if (viewMode === 'item') {
      // Item View: one table per month, each row is a transaction with item name
      monthlyStatements.forEach(statement => {
        tableHtml += `<h3 style="margin:18px 0 6px;border-bottom:2px solid #333;padding-bottom:4px;">${esc(statement.month)} ${statement.year}</h3>`;
        tableHtml += `<table><thead><tr>
          <th>Date</th><th>Order #</th><th>Item</th><th>Qty</th>
          <th>Type</th><th>From</th><th>To</th>
          <th>Notes</th><th>Price/Unit</th><th>Total</th>
        </tr></thead><tbody>`;

        statement.itemLedgers.forEach(ledger => {
          ledger.transactions.forEach(tx => {
            const typeLabel = tx.type === 'incoming' ? 'Received' : 'Sent Out';
            const typeClass = tx.type === 'incoming' ? 'received' : 'sent';
            tableHtml += `<tr>
              <td>${esc(tx.date)}</td>
              <td>${esc(tx.orderNumber || '-')}</td>
              <td><strong>${esc(ledger.itemName)}</strong></td>
              <td class="text-right">${tx.type === 'incoming' ? '+' : '-'}${tx.quantity}</td>
              <td class="${typeClass}">${typeLabel}</td>
              <td>${esc(tx.sentFrom || '-')}</td>
              <td>${esc(tx.location)}</td>
              <td class="notes">${esc(tx.notes || '-')}</td>
              <td class="text-right">${fmtCost(tx.unitCost)}</td>
              <td class="text-right">${fmtCost(tx.totalCost)}</td>
            </tr>`;
          });
        });

        tableHtml += '</tbody></table>';

        // Item summary below the table
        tableHtml += '<table style="width:auto;margin-bottom:20px;"><tbody>';
        statement.itemLedgers.forEach(ledger => {
          tableHtml += `<tr>
            <td style="padding-right:24px;"><strong>${esc(ledger.itemName)}</strong></td>
            <td style="padding-right:16px;">Begin: ${ledger.beginningBalance} ${esc(ledger.unit)}</td>
            <td style="padding-right:16px;color:green;">+${ledger.totalIncoming}</td>
            <td style="padding-right:16px;color:red;">-${ledger.totalOutgoing}</td>
            <td><strong>End: ${ledger.endingBalance} ${esc(ledger.unit)}</strong></td>
          </tr>`;
        });
        tableHtml += '</tbody></table>';
      });
    } else {
      // Building View: one section per building, one table per month
      buildingLedgers.forEach(ledger => {
        const yearTotal = ledger.months.reduce((sum, m) => m.totalValue + sum, 0);
        tableHtml += `<h3 style="margin:18px 0 2px;">${esc(ledger.buildingName)}</h3>`;
        tableHtml += `<p style="margin:0 0 8px;color:#666;font-size:9pt;">${esc(ledger.clientName)} &mdash; ${ledger.totalTransfers} transfer${ledger.totalTransfers !== 1 ? 's' : ''}${yearTotal > 0 ? ` &mdash; Year Total: $${yearTotal.toFixed(2)}` : ''}</p>`;

        ledger.months.forEach(monthData => {
          tableHtml += `<h4 style="margin:12px 0 4px;border-bottom:1px solid #999;padding-bottom:2px;">${esc(monthData.month)}</h4>`;
          tableHtml += `<table><thead><tr>
            <th>Date</th><th>Order #</th><th>Item</th><th>Qty</th>
            <th>Type</th><th>From</th><th>To</th>
            <th>Notes</th><th>Price/Unit</th><th>Total</th>
          </tr></thead><tbody>`;

          monthData.transfers.forEach(transfer => {
            const typeLabel = transfer.type === 'incoming' ? 'Received' : 'Sent Out';
            const typeClass = transfer.type === 'incoming' ? 'received' : 'sent';
            // Extract destination from the building context
            const to = transfer.type === 'incoming'
              ? `${ledger.clientName} - ${ledger.buildingName}`
              : `${ledger.clientName} - ${ledger.buildingName}`;
            const from = transfer.sentFrom || (transfer.type === 'incoming' ? 'Supplier' : '-');

            transfer.items.forEach(item => {
              tableHtml += `<tr>
                <td>${esc(transfer.date)}</td>
                <td>${esc(transfer.orderNumber || '-')}</td>
                <td><strong>${esc(item.name)}</strong></td>
                <td class="text-right">${item.quantity} ${esc(item.unit)}</td>
                <td class="${typeClass}">${typeLabel}</td>
                <td>${esc(from)}</td>
                <td>${esc(to)}</td>
                <td class="notes">${esc(transfer.notes || '-')}</td>
                <td class="text-right">${fmtCost(item.unitCost)}</td>
                <td class="text-right">${fmtCost(item.totalCost)}</td>
              </tr>`;
            });
          });

          const monthTotal = monthData.transfers.reduce((sum, t) =>
            sum + t.items.reduce((s, i) => s + (i.totalCost || 0), 0), 0);
          if (monthTotal > 0) {
            tableHtml += `<tr class="total-row">
              <td colspan="9" class="text-right"><strong>Monthly Total</strong></td>
              <td class="text-right"><strong>$${monthTotal.toFixed(2)}</strong></td>
            </tr>`;
          }
          tableHtml += '</tbody></table>';
        });
      });
    }

    const viewLabel = viewMode === 'item' ? 'Item View' : 'Building View';
    const html = `<!DOCTYPE html><html><head>
      <title>Inventory Statement - ${selectedYear}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; margin: 24px; color: #222; }
        h2 { margin: 0 0 4px; font-size: 16pt; }
        h3 { font-size: 13pt; }
        h4 { font-size: 11pt; }
        .meta { color: #666; font-size: 9pt; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; page-break-inside: auto; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #bbb; padding: 3px 6px; text-align: left; font-size: 9pt; }
        th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.3px; }
        .text-right { text-align: right; }
        .notes { max-width: 140px; font-style: italic; color: #555; }
        .received { color: #16a34a; font-weight: 600; }
        .sent { color: #dc2626; font-weight: 600; }
        .total-row td { background: #f5f5f5; border-top: 2px solid #333; }
        @media print {
          body { margin: 12px; }
          h3 { page-break-before: auto; }
        }
      </style>
    </head><body>
      <h2>Monthly Inventory Statement &mdash; ${selectedYear}</h2>
      <p class="meta">${viewLabel} &bull; Generated ${esc(generated)}</p>
      ${tableHtml}
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }, [viewMode, selectedYear, monthlyStatements, buildingLedgers]);

  const loadTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading inventory transfers for statements...');

      const [logs, inventoryResult] = await Promise.all([
        getInventoryTransferLogs(),
        supabase.from('inventory_items').select('name, current_stock'),
      ]);
      console.log(`✅ Loaded ${logs.length} transfer logs`);

      // Build current stock map from inventory items
      const stockMap: { [itemName: string]: number } = {};
      if (inventoryResult.data) {
        inventoryResult.data.forEach((item: any) => {
          stockMap[item.name] = item.current_stock || 0;
        });
      }
      setInventoryStock(stockMap);

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

    // Calculate initial balances by reverse-calculating from current inventory stock:
    // initial_balance = current_stock - total_incoming + total_outgoing
    // This gives us what stock was before any transfers were recorded.
    const itemTotals: { [itemName: string]: { incoming: number; outgoing: number } } = {};
    transfers.forEach(transfer => {
      transfer.items.forEach(item => {
        if (!itemTotals[item.name]) {
          itemTotals[item.name] = { incoming: 0, outgoing: 0 };
        }
        if (transfer.type === 'incoming') {
          itemTotals[item.name].incoming += item.quantity;
        } else {
          itemTotals[item.name].outgoing += item.quantity;
        }
      });
    });

    const itemBalances: { [itemName: string]: number } = {};
    Object.keys(itemTotals).forEach(itemName => {
      const currentStock = inventoryStock[itemName] || 0;
      const { incoming, outgoing } = itemTotals[itemName];
      itemBalances[itemName] = currentStock - incoming + outgoing;
    });

    // For the selected year, also account for transfers from prior years
    // by processing them against the initial balance
    const priorYearTransfers = [...transfers]
      .filter(t => new Date(t.timestamp).getFullYear() < selectedYear)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    priorYearTransfers.forEach(transfer => {
      transfer.items.forEach(item => {
        if (itemBalances[item.name] === undefined) return;
        if (transfer.type === 'incoming') {
          itemBalances[item.name] += item.quantity;
        } else {
          itemBalances[item.name] -= item.quantity;
        }
      });
    });

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
            location: transfer.destination,
            sentFrom: transfer.type === 'incoming' ? (transfer.source || 'Supplier') : transfer.sentFrom,
            orderNumber: transfer.orderNumber,
            transferId: transfer.id,
            transferredBy: transfer.transferredBy,
            notes: transfer.notes,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
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
  }, [transfers, selectedYear, inventoryStock]);

  const availableYears = Array.from(
    new Set(transfers.map(t => new Date(t.timestamp).getFullYear()))
  ).sort((a, b) => b - a);

  // Extract unique buildings/locations from all transfers
  const uniqueBuildings = useMemo(() => {
    const buildings = new Map<string, { buildingName: string; clientName: string }>();

    transfers
      .filter(t => new Date(t.timestamp).getFullYear() === selectedYear)
      .forEach(t => {
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
        } else {
          // Warehouse destination (incoming supplies)
          const key = `Incoming Supplies|${destination}`;
          if (!buildings.has(key)) {
            buildings.set(key, { buildingName: destination, clientName: 'Incoming Supplies' });
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
      if (dashIndex <= 0) {
        // Warehouse destination (incoming supplies)
        return { clientName: 'Incoming Supplies', buildingName: dest, key: `Incoming Supplies|${dest}` };
      }
      const clientName = dest.substring(0, dashIndex);
      let buildingName = dest.substring(dashIndex + 3);
      const groupMatch = buildingName.match(/^(.+?)\s*\(\d+\s*buildings?\)$/i);
      if (groupMatch) buildingName = groupMatch[1].trim();
      return { clientName, buildingName, key: `${clientName}|${buildingName}` };
    };

    // Group ALL transfers by building/location (all years, for balance calculation)
    const buildingGroups = new Map<string, {
      buildingName: string;
      clientName: string;
      transfers: InventoryTransfer[];
    }>();

    transfers
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

      // Calculate initial balances from inventory stock (same as item view):
      // initial = current_stock - total_incoming + total_outgoing (across ALL transfers, not just this building)
      const runningBalances = new Map<string, { quantity: number; unit: string }>();

      // Collect all item names that appear in this building's transfers
      const buildingItemNames = new Set<string>();
      sorted.forEach(t => t.items.forEach(item => buildingItemNames.add(item.name)));

      // For each item, calculate the initial balance from inventory stock
      // using all transfers across all buildings (not just this building)
      const allItemTotals: { [itemName: string]: { incoming: number; outgoing: number; unit: string } } = {};
      transfers.forEach(transfer => {
        transfer.items.forEach(item => {
          if (!buildingItemNames.has(item.name)) return;
          if (!allItemTotals[item.name]) {
            allItemTotals[item.name] = { incoming: 0, outgoing: 0, unit: item.unit };
          }
          if (transfer.type === 'incoming') {
            allItemTotals[item.name].incoming += item.quantity;
          } else {
            allItemTotals[item.name].outgoing += item.quantity;
          }
        });
      });

      // Set initial balances: current_stock - total_incoming + total_outgoing
      Object.entries(allItemTotals).forEach(([itemName, { incoming, outgoing, unit }]) => {
        const currentStock = inventoryStock[itemName] || 0;
        runningBalances.set(itemName, { quantity: currentStock - incoming + outgoing, unit });
      });

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
            orderNumber: t.orderNumber,
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
  }, [transfers, selectedYear, selectedBuilding, inventoryStock]);

  const expandAllBuildings = useCallback(() => {
    const allKeys = new Set(
      buildingLedgers.map(l => `${l.clientName}|${l.buildingName}`)
    );
    setExpandedBuildings(allKeys);
  }, [buildingLedgers]);

  const collapseAllBuildings = useCallback(() => {
    setExpandedBuildings(new Set());
  }, []);

  const allBuildingsExpanded = buildingLedgers.length > 0 &&
    buildingLedgers.every(l => expandedBuildings.has(`${l.clientName}|${l.buildingName}`));

  const expandAllMonths = useCallback(() => {
    const allIndexes = new Set(monthlyStatements.map((_: any, i: number) => i));
    setExpandedMonths(allIndexes);
  }, [monthlyStatements]);

  const collapseAllMonths = useCallback(() => {
    setExpandedMonths(new Set());
  }, []);

  const allMonthsExpanded = monthlyStatements.length > 0 &&
    monthlyStatements.every((_: any, i: number) => expandedMonths.has(i));

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
      <View style={styles.header} nativeID="no-print-header">
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
        <View style={styles.viewToggleContainer} nativeID="no-print-toggle">
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
          <View style={styles.filterContainer} nativeID="no-print-filter">
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
            {/* Print & Expand Controls */}
            {monthlyStatements.length > 0 && (
              <View style={styles.printButtonRow} nativeID="no-print-actions-item">
                <TouchableOpacity
                  style={styles.expandAllButton}
                  onPress={allMonthsExpanded ? collapseAllMonths : expandAllMonths}
                >
                  <Icon name={allMonthsExpanded ? "contract" : "expand"} size={18} color={colors.text} />
                  <Text style={styles.expandAllButtonText}>
                    {allMonthsExpanded ? 'Collapse All' : 'Expand All'}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'web' && (
                  <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                    <Icon name="print" size={18} color={colors.background} />
                    <Text style={styles.printButtonText}>Print Statement</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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
                            <Text style={[styles.tableHeaderText, { width: 70 }]}>Order #</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>From</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>To</Text>
                            <Text style={[styles.tableHeaderText, { width: 65 }]}>Type</Text>
                            <Text style={[styles.tableHeaderText, { width: 40, textAlign: 'right' }]}>Qty</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1, marginLeft: spacing.md }]}>Notes</Text>
                          </View>
                          {/* Table Rows */}
                          {ledger.transactions.map((transaction, txIndex) => (
                            <View key={txIndex} style={styles.transactionRow}>
                              <Text style={styles.transactionDate}>{transaction.date}</Text>
                              <Text style={[styles.transactionType, { width: 70 }]} numberOfLines={1}>
                                {transaction.orderNumber || '-'}
                              </Text>
                              <Text style={[styles.transactionLocation, { flex: 1 }]} numberOfLines={1}>
                                {transaction.sentFrom || '-'}
                              </Text>
                              <Text style={[styles.transactionLocation, { flex: 1 }]} numberOfLines={1}>
                                {transaction.location}
                              </Text>
                              <Text style={[styles.transactionType, { width: 65 }]}>
                                {transaction.type === 'incoming' ? 'Received' : 'Sent Out'}
                              </Text>
                              <Text style={[
                                styles.transactionQuantity,
                                { width: 40 },
                                transaction.type === 'incoming' ? styles.quantityIncoming : styles.quantityOutgoing
                              ]}>
                                {transaction.type === 'incoming' ? '+' : '-'}{transaction.quantity}
                              </Text>
                              <Text style={[styles.transactionLocation, { flex: 1, fontStyle: 'italic', marginLeft: spacing.md }]} numberOfLines={2}>
                                {transaction.notes || '-'}
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
            {/* Print & Expand Controls */}
            {buildingLedgers.length > 0 && (
              <View style={styles.printButtonRow} nativeID="no-print-actions">
                <TouchableOpacity
                  style={styles.expandAllButton}
                  onPress={allBuildingsExpanded ? collapseAllBuildings : expandAllBuildings}
                >
                  <Icon name={allBuildingsExpanded ? "contract" : "expand"} size={18} color={colors.text} />
                  <Text style={styles.expandAllButtonText}>
                    {allBuildingsExpanded ? 'Collapse All' : 'Expand All'}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'web' && (
                  <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                    <Icon name="print" size={18} color={colors.background} />
                    <Text style={styles.printButtonText}>Print Statement</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {buildingLedgers.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="business-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>
                  No outgoing transfers for {selectedYear}
                </Text>
              </View>
            ) : (
              buildingLedgers.map((ledger) => {
                const key = `${ledger.clientName}|${ledger.buildingName}`;
                const isExpanded = expandedBuildings.has(key);
                const yearTotal = ledger.months.reduce((sum, m) => sum + m.totalValue, 0);

                return (
                  <View key={key} style={styles.buildingCard}>
                    {/* Building Header */}
                    <TouchableOpacity onPress={() => toggleBuilding(key)}>
                      <View style={styles.buildingHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.buildingName}>{ledger.buildingName}</Text>
                          <Text style={styles.buildingClient}>{ledger.clientName}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: spacing.sm }}>
                          {yearTotal > 0 && (
                            <Text style={styles.buildingYearTotal}>{formatCurrency(yearTotal)}</Text>
                          )}
                          <Text style={styles.transferCount}>
                            {ledger.totalTransfers} {ledger.totalTransfers === 1 ? 'transfer' : 'transfers'}
                          </Text>
                        </View>
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={24}
                          color={colors.primary}
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ marginTop: spacing.md }}>
                        {ledger.months.map((monthData) => {
                          // Aggregate items across all transfers in this month, grouped by name + type
                          const itemSummary = new Map<string, { name: string; type: 'incoming' | 'outgoing'; totalQty: number; unit: string; totalCost: number }>();
                          monthData.transfers.forEach(transfer => {
                            transfer.items.forEach(item => {
                              const mapKey = `${item.name}|${transfer.type}`;
                              const existing = itemSummary.get(mapKey);
                              if (existing) {
                                existing.totalQty += item.quantity;
                                existing.totalCost += (item.totalCost || 0);
                              } else {
                                itemSummary.set(mapKey, {
                                  name: item.name,
                                  type: transfer.type as 'incoming' | 'outgoing',
                                  totalQty: item.quantity,
                                  unit: item.unit,
                                  totalCost: item.totalCost || 0,
                                });
                              }
                            });
                          });

                          const aggregatedItems = Array.from(itemSummary.values())
                            .sort((a, b) => {
                              // Sort: outgoing first, then incoming; within same type sort by name
                              if (a.type !== b.type) return a.type === 'outgoing' ? -1 : 1;
                              return a.name.localeCompare(b.name);
                            });
                          const monthTotal = aggregatedItems.reduce((sum, item) => sum + item.totalCost, 0);
                          const transferDates = monthData.transfers
                            .map(t => t.date)
                            .join('  |  ');

                          return (
                            <View key={monthData.month} style={styles.monthSection}>
                              {/* Month Header */}
                              <View style={styles.monthSectionHeader}>
                                <Text style={styles.monthSectionTitle}>{monthData.month}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                  <Text style={styles.transferCount}>
                                    {monthData.transfers.length} {monthData.transfers.length === 1 ? 'transfer' : 'transfers'}
                                  </Text>
                                  {monthTotal > 0 && (
                                    <Text style={styles.monthTotalBadge}>{formatCurrency(monthTotal)}</Text>
                                  )}
                                </View>
                              </View>

                              {/* Summary Table */}
                              <View style={styles.summaryTable}>
                                {/* Table Header */}
                                <View style={styles.summaryTableHeaderRow}>
                                  <Text style={[styles.summaryTableHeaderCell, { flex: 3 }]}>Item</Text>
                                  <Text style={[styles.summaryTableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Type</Text>
                                  <Text style={[styles.summaryTableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                                  <Text style={[styles.summaryTableHeaderCell, { flex: 1, textAlign: 'center' }]}>Unit</Text>
                                  <Text style={[styles.summaryTableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
                                </View>

                                {/* Item Rows */}
                                {aggregatedItems.map((item, idx) => (
                                  <View
                                    key={`${item.name}-${item.type}`}
                                    style={[
                                      styles.summaryTableRow,
                                      idx % 2 === 0 && { backgroundColor: colors.backgroundAlt },
                                    ]}
                                  >
                                    <Text style={[styles.summaryTableCell, { flex: 3 }]}>{item.name}</Text>
                                    <Text style={[
                                      styles.summaryTableCell,
                                      {
                                        flex: 1.2,
                                        textAlign: 'center',
                                        fontWeight: typography.weights.semibold as any,
                                        color: item.type === 'incoming' ? colors.success : colors.error,
                                      },
                                    ]}>
                                      {item.type === 'incoming' ? 'Received' : 'Sent'}
                                    </Text>
                                    <Text style={[styles.summaryTableCell, { flex: 1, textAlign: 'center', fontWeight: typography.weights.semibold as any }]}>
                                      {item.totalQty}
                                    </Text>
                                    <Text style={[styles.summaryTableCell, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>
                                      {item.unit}
                                    </Text>
                                    <Text style={[styles.summaryTableCell, { flex: 1.5, textAlign: 'right', fontWeight: typography.weights.semibold as any }]}>
                                      {item.totalCost > 0 ? formatCurrency(item.totalCost) : '-'}
                                    </Text>
                                  </View>
                                ))}

                                {/* Monthly Total Row */}
                                {monthTotal > 0 && (
                                  <View style={styles.summaryTableTotalRow}>
                                    <Text style={[styles.summaryTableTotalLabel, { flex: 3 }]}>Monthly Total</Text>
                                    <Text style={{ flex: 1.2 }} />
                                    <Text style={{ flex: 1 }} />
                                    <Text style={{ flex: 1 }} />
                                    <Text style={[styles.summaryTableTotalValue, { flex: 1.5, textAlign: 'right' }]}>
                                      {formatCurrency(monthTotal)}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Transfer Dates Reference */}
                              <Text style={styles.transferDatesRef}>
                                Transfers on: {transferDates}
                              </Text>
                            </View>
                          );
                        })}

                        {/* Year Grand Total */}
                        {yearTotal > 0 && (
                          <View style={styles.yearGrandTotalRow}>
                            <Text style={styles.yearGrandTotalLabel}>{selectedYear} Total</Text>
                            <Text style={styles.yearGrandTotalValue}>{formatCurrency(yearTotal)}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
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
