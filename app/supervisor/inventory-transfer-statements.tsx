
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import { getInventoryTransferLogs, type InventoryTransfer } from '../../utils/inventoryTracking';

interface ItemTransaction {
  date: string;
  destination: string;
  quantity: number;
  timestamp: string;
}

interface ItemLedger {
  itemName: string;
  unit: string;
  beginningBalance: number;
  transactions: ItemTransaction[];
  totalReceived: number;
  totalSent: number;
  endingBalance: number;
}

interface MonthlyStatement {
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
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  monthStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary,
  },
  itemLedgerCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  itemUnit: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    marginVertical: spacing.xs,
    borderRadius: 4,
  },
  balanceLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  tableCell: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  tableCellDate: {
    flex: 1.5,
  },
  tableCellDestination: {
    flex: 3,
  },
  tableCellQuantity: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    borderRadius: 4,
  },
  totalsLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  totalsValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  positiveValue: {
    color: colors.success || '#10b981',
  },
  negativeValue: {
    color: colors.error || '#ef4444',
  },
  endingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + '15',
    marginTop: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  endingBalanceLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  endingBalanceValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
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
});

export default function InventoryTransferStatementsScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyStatement[]>([]);

  const loadTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading inventory transfers for statements...');

      const logs = await getInventoryTransferLogs();
      console.log(`✅ Loaded ${logs.length} transfer logs`);
      setTransfers(logs);
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
    // Process transfers into monthly statements with item ledgers
    const statements: { [key: string]: MonthlyStatement } = {};

    // First pass: organize transfers by month
    transfers.forEach(transfer => {
      const date = new Date(transfer.timestamp);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      const key = `${year}-${month}`;

      if (year !== selectedYear) return;

      if (!statements[key]) {
        statements[key] = {
          month,
          year,
          itemLedgers: [],
        };
      }

      // Process each item in the transfer
      transfer.items.forEach(item => {
        const transaction: ItemTransaction = {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          destination: transfer.destination,
          quantity: -item.quantity, // Negative because it's being sent out
          timestamp: transfer.timestamp,
        };

        // Find or create item ledger
        let itemLedger = statements[key].itemLedgers.find(
          ledger => ledger.itemName === item.name && ledger.unit === item.unit
        );

        if (!itemLedger) {
          itemLedger = {
            itemName: item.name,
            unit: item.unit,
            beginningBalance: 0,
            transactions: [],
            totalReceived: 0,
            totalSent: 0,
            endingBalance: 0,
          };
          statements[key].itemLedgers.push(itemLedger);
        }

        itemLedger.transactions.push(transaction);
        itemLedger.totalSent += item.quantity;
      });
    });

    // Second pass: calculate balances for each item ledger
    Object.values(statements).forEach(statement => {
      statement.itemLedgers.forEach(ledger => {
        // Sort transactions by timestamp
        ledger.transactions.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Calculate ending balance
        ledger.endingBalance = ledger.beginningBalance + ledger.totalReceived - ledger.totalSent;
      });

      // Sort item ledgers alphabetically by name
      statement.itemLedgers.sort((a, b) => a.itemName.localeCompare(b.itemName));
    });

    // Convert to array and sort by month (most recent first)
    const monthOrder = [
      'December', 'November', 'October', 'September', 'August', 'July',
      'June', 'May', 'April', 'March', 'February', 'January'
    ];

    const sortedStatements = Object.values(statements).sort((a, b) => {
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

    setMonthlyStatements(sortedStatements);
  }, [transfers, selectedYear]);

  const availableYears = Array.from(
    new Set(transfers.map(t => new Date(t.timestamp).getFullYear()))
  ).sort((a, b) => b - a);

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
          Monthly Transfer Statements
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
              No transfers found for {selectedYear}
            </Text>
          </View>
        ) : (
          monthlyStatements.map((statement, statementIndex) => (
            <AnimatedCard key={statementIndex} style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>
                  {statement.month} {statement.year}
                </Text>
                <View style={styles.monthStats}>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>
                      {statement.itemLedgers.length} {statement.itemLedgers.length === 1 ? 'Item' : 'Items'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Item Ledgers */}
              {statement.itemLedgers.map((ledger, ledgerIndex) => (
                <View key={ledgerIndex} style={styles.itemLedgerCard}>
                  {/* Item Header */}
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{ledger.itemName}</Text>
                    <Text style={styles.itemUnit}>Unit: {ledger.unit}</Text>
                  </View>

                  {/* Beginning Balance */}
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Beginning Balance</Text>
                    <Text style={styles.balanceValue}>
                      {ledger.beginningBalance} {ledger.unit}
                    </Text>
                  </View>

                  {/* Transactions Table */}
                  {ledger.transactions.length > 0 && (
                    <View style={styles.tableContainer}>
                      {/* Table Header */}
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.tableCellDate]}>DATE</Text>
                        <Text style={[styles.tableHeaderText, styles.tableCellDestination]}>TRANSACTION</Text>
                        <Text style={[styles.tableHeaderText, styles.tableCellQuantity]}>QTY</Text>
                      </View>

                      {/* Table Rows */}
                      {ledger.transactions.map((transaction, transactionIndex) => (
                        <View key={transactionIndex} style={styles.tableRow}>
                          <Text style={[styles.tableCell, styles.tableCellDate]}>{transaction.date}</Text>
                          <Text style={[styles.tableCell, styles.tableCellDestination]}>
                            {transaction.destination}
                          </Text>
                          <Text
                            style={[
                              styles.tableCell,
                              styles.tableCellQuantity,
                              transaction.quantity < 0 ? styles.negativeValue : styles.positiveValue,
                            ]}
                          >
                            {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Totals */}
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Total Received:</Text>
                    <Text style={[styles.totalsValue, styles.positiveValue]}>
                      +{ledger.totalReceived} {ledger.unit}
                    </Text>
                  </View>

                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Total Sent:</Text>
                    <Text style={[styles.totalsValue, styles.negativeValue]}>
                      -{ledger.totalSent} {ledger.unit}
                    </Text>
                  </View>

                  {/* Ending Balance */}
                  <View style={styles.endingBalanceRow}>
                    <Text style={styles.endingBalanceLabel}>Ending Balance</Text>
                    <Text style={styles.endingBalanceValue}>
                      {ledger.endingBalance} {ledger.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      <Toast />
    </View>
  );
}
