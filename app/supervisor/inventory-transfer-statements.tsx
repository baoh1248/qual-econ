
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

interface MonthlyStatement {
  month: string;
  year: number;
  transfers: InventoryTransfer[];
  locationSummary: {
    [location: string]: {
      totalValue: number;
      transferCount: number;
    };
  };
  totalValue: number;
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
  locationList: {
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  locationName: {
    fontSize: typography.sizes.md,
    color: colors.text,
    flex: 1,
  },
  locationValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.sizes.lg,
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
    // Process transfers into monthly statements
    const statements: { [key: string]: MonthlyStatement } = {};

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
          transfers: [],
          locationSummary: {},
          totalValue: 0,
          totalTransfers: 0,
        };
      }

      statements[key].transfers.push(transfer);
      statements[key].totalTransfers++;
      statements[key].totalValue += transfer.totalValue || 0;

      // Group by location
      const location = transfer.destination;
      if (!statements[key].locationSummary[location]) {
        statements[key].locationSummary[location] = {
          totalValue: 0,
          transferCount: 0,
        };
      }
      statements[key].locationSummary[location].totalValue += transfer.totalValue || 0;
      statements[key].locationSummary[location].transferCount++;
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

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

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
          monthlyStatements.map((statement, index) => (
            <AnimatedCard key={index} style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>
                  {statement.month} {statement.year}
                </Text>
                <View style={styles.monthStats}>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>
                      {statement.totalTransfers} {statement.totalTransfers === 1 ? 'Transfer' : 'Transfers'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.locationList}>
                {Object.entries(statement.locationSummary)
                  .sort((a, b) => b[1].totalValue - a[1].totalValue)
                  .map(([location, summary], locationIndex) => (
                    <View key={locationIndex} style={styles.locationRow}>
                      <Text style={styles.locationName}>{location}:</Text>
                      <Text style={styles.locationValue}>
                        {formatCurrency(summary.totalValue)}
                      </Text>
                    </View>
                  ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(statement.totalValue)}
                </Text>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      <Toast />
    </View>
  );
}
