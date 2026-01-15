
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
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

interface ItemTransaction {
  date: string;
  type: 'incoming' | 'outgoing';
  quantity: number;
  location: string; // client name or supplier name
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
});

export default function InventoryTransferStatementsScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyInventoryStatement[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

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

  const toggleMonth = (index: number) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMonths(newExpanded);
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
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Location</Text>
                        <Text style={[styles.tableHeaderText, { width: 75 }]}>Type</Text>
                        <Text style={[styles.tableHeaderText, { width: 50, textAlign: 'right' }]}>Qty</Text>
                      </View>
                      {/* Table Rows */}
                      {ledger.transactions.map((transaction, txIndex) => (
                        <View key={txIndex} style={styles.transactionRow}>
                          <Text style={styles.transactionDate}>{transaction.date}</Text>
                          <Text style={styles.transactionLocation} numberOfLines={1}>
                            {transaction.location}
                          </Text>
                          <Text style={styles.transactionType}>
                            {transaction.type === 'incoming' ? 'Received' : 'Sent'}
                          </Text>
                          <Text style={[
                            styles.transactionQuantity,
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
      </ScrollView>

      <Toast />
    </View>
  );
}
