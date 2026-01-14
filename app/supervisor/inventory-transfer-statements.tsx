
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
import { getInventoryTransferLogs, formatTransferSummary, formatCurrency, type InventoryTransfer } from '../../utils/inventoryTracking';

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
  locationValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary,
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
  detailsHeader: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailsLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailsLocationText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  detailsMonthText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  detailsTransferCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  transferHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.sm,
  },
  transferIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferInfo: {
    flex: 1,
  },
  transferDestination: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  transferMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transferMetaText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  transferItems: {
    marginBottom: spacing.md,
  },
  transferItemsLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  transferItemText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    flex: 1,
  },
  transferItemQuantity: {
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  transferItemName: {
    fontWeight: typography.weights.semibold as any,
  },
  transferItemCost: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginLeft: spacing.sm,
  },
  transferItemUnitCost: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  transferTotalValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  transferTotalValueText: {
    fontSize: typography.sizes.md,
    flex: 1,
    fontWeight: typography.weights.bold as any,
  },
  transferNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  transferNotesText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  transferSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '08',
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  transferSummaryText: {
    fontSize: typography.sizes.sm,
    flex: 1,
    fontWeight: typography.weights.semibold as any,
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
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyStatement[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  const formatCurrencyLocal = (amount: number) => `$${amount.toFixed(2)}`;

  const handleLocationClick = (location: string, month: string, year: number) => {
    setSelectedLocation(location);
    setSelectedMonth(`${month} ${year}`);
    setShowDetailsModal(true);
  };

  const getFilteredTransfersForLocation = () => {
    if (!selectedLocation || !selectedMonth) return [];

    const [month, year] = selectedMonth.split(' ');
    return transfers.filter(transfer => {
      const transferDate = new Date(transfer.timestamp);
      const transferMonth = transferDate.toLocaleString('default', { month: 'long' });
      const transferYear = transferDate.getFullYear();

      return transfer.destination === selectedLocation &&
             transferMonth === month &&
             transferYear === parseInt(year);
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

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
                    <TouchableOpacity
                      key={locationIndex}
                      style={styles.locationRow}
                      onPress={() => handleLocationClick(location, statement.month, statement.year)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.locationName}>{location}:</Text>
                      <View style={styles.locationValueContainer}>
                        <Text style={styles.locationValue}>
                          {formatCurrencyLocal(summary.totalValue)}
                        </Text>
                        <Icon name="chevron-forward" size={20} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrencyLocal(statement.totalValue)}
                </Text>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Transfer Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.5)',
          justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
          alignItems: Platform.OS === 'ios' ? 'stretch' : 'center',
          ...(Platform.OS === 'web' && {
            position: 'fixed' as any,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }),
        }}>
          {Platform.OS !== 'ios' && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              activeOpacity={1}
              onPress={() => setShowDetailsModal(false)}
            />
          )}
          <View style={{
            width: Platform.OS === 'ios' ? '100%' : '90%',
            maxWidth: Platform.OS === 'ios' ? undefined : 700,
            maxHeight: Platform.OS === 'ios' ? '100%' : '85%',
            backgroundColor: colors.background,
            borderRadius: Platform.OS === 'ios' ? 0 : 16,
            overflow: 'hidden',
            ...(Platform.OS === 'web' && {
              zIndex: 10000,
              position: 'relative' as any,
            }),
          }}>
            <View style={commonStyles.header}>
              <IconButton
                icon="close"
                onPress={() => setShowDetailsModal(false)}
                variant="white"
              />
              <Text style={commonStyles.headerTitle}>Transfer Details</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={commonStyles.content}>
              {/* Location and Month Header */}
              <View style={styles.detailsHeader}>
                <View style={styles.detailsLocationContainer}>
                  <Icon name="business" size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsLocationText}>{selectedLocation}</Text>
                    <Text style={styles.detailsMonthText}>{selectedMonth}</Text>
                  </View>
                </View>
              </View>

              {/* Transfer List */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {getFilteredTransfersForLocation().map((transfer, index) => (
                  <View key={transfer.id} style={styles.detailsTransferCard}>
                    <View style={styles.transferHeader}>
                      <View style={styles.transferHeaderLeft}>
                        <View style={[styles.transferIcon, { backgroundColor: colors.primary + '15' }]}>
                          <Icon name="send" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.transferInfo}>
                          <Text style={styles.transferDestination}>{transfer.destination}</Text>
                          <View style={styles.transferMeta}>
                            <Icon name="time" size={14} color={colors.textSecondary} />
                            <Text style={styles.transferMetaText}>
                              {new Date(transfer.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                            <View style={styles.metaDivider} />
                            <Icon name="person" size={14} color={colors.textSecondary} />
                            <Text style={styles.transferMetaText}>{transfer.transferredBy}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.transferItems}>
                      <Text style={styles.transferItemsLabel}>Items Transferred:</Text>
                      {transfer.items.map((item, itemIndex) => (
                        <View key={itemIndex} style={styles.transferItem}>
                          <View style={[styles.itemBullet, { backgroundColor: colors.primary }]} />
                          <View style={{ flex: 1 }}>
                            <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                              <Text style={styles.transferItemText}>
                                <Text style={styles.transferItemQuantity}>{item.quantity} {item.unit}</Text>
                                {' of '}
                                <Text style={styles.transferItemName}>{item.name}</Text>
                              </Text>
                              {item.totalCost !== undefined && (
                                <Text style={[styles.transferItemCost, { color: colors.primary }]}>
                                  {formatCurrency(item.totalCost)}
                                </Text>
                              )}
                            </View>
                            {item.unitCost !== undefined && (
                              <Text style={[styles.transferItemUnitCost, { color: colors.textSecondary }]}>
                                {formatCurrency(item.unitCost)} per {item.unit}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>

                    {transfer.totalValue !== undefined && transfer.totalValue > 0 && (
                      <View style={[styles.transferTotalValue, { backgroundColor: colors.success + '10', borderLeftColor: colors.success }]}>
                        <Icon name="cash" size={16} color={colors.success} />
                        <Text style={[styles.transferTotalValueText, { color: colors.success }]}>
                          Total Value: {formatCurrency(transfer.totalValue)}
                        </Text>
                      </View>
                    )}

                    {transfer.notes && (
                      <View style={styles.transferNotes}>
                        <Icon name="document-text" size={14} color={colors.textSecondary} />
                        <Text style={styles.transferNotesText}>{transfer.notes}</Text>
                      </View>
                    )}

                    <View style={[styles.transferSummary, { borderLeftColor: colors.primary }]}>
                      <Icon name="information-circle" size={16} color={colors.primary} />
                      <Text style={[styles.transferSummaryText, { color: colors.primary }]}>
                        {formatTransferSummary(transfer)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}
