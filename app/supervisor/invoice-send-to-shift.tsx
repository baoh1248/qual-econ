
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../integrations/supabase/client';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

interface ScheduleEntry {
  id: string;
  client_name: string;
  building_name: string;
  date: string;
  day: string;
  address?: string;
}

interface ClientBuilding {
  id: string;
  client_name: string;
  building_name: string;
  address?: string;
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  invoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  invoiceNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  lineItemsList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  lineItemText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
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
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    height: 100,
    textAlignVertical: 'top',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.background,
    fontWeight: typography.weights.bold as any,
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold as any,
  },
});

type LocationFilter = 'shifts' | 'all';

export default function InvoiceSendToShiftScreen() {
  const { invoiceId } = useLocalSearchParams();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [shifts, setShifts] = useState<ScheduleEntry[]>([]);
  const [allBuildings, setAllBuildings] = useState<ClientBuilding[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<(ScheduleEntry | ClientBuilding)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<ScheduleEntry | ClientBuilding | null>(null);
  const [notes, setNotes] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('shifts');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [searchQuery, shifts, allBuildings, locationFilter, dateFilter]);

  const loadData = async () => {
    if (!invoiceId) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading invoice and locations data...');

      // Load invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        console.error('❌ Error loading invoice:', invoiceError);
        throw invoiceError;
      }

      setInvoice(invoiceData);

      // Load line items
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('line_number', { ascending: true });

      if (lineItemsError) {
        console.error('❌ Error loading line items:', lineItemsError);
        throw lineItemsError;
      }

      setLineItems(lineItemsData || []);

      // Load upcoming shifts (next 30 days)
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      const { data: shiftsData, error: shiftsError } = await supabase
        .from('schedule_entries')
        .select('*')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', futureDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (shiftsError) {
        console.error('❌ Error loading shifts:', shiftsError);
        throw shiftsError;
      }

      setShifts(shiftsData || []);

      // Load all buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('client_buildings')
        .select('*')
        .order('building_name', { ascending: true });

      if (buildingsError) {
        console.error('❌ Error loading buildings:', buildingsError);
        throw buildingsError;
      }

      setAllBuildings(buildingsData || []);

      console.log('✅ Data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLocations = () => {
    let locations: (ScheduleEntry | ClientBuilding)[] = [];

    if (locationFilter === 'shifts') {
      locations = shifts;
    } else {
      locations = allBuildings;
    }

    // Apply date filter for shifts
    if (dateFilter && locationFilter === 'shifts') {
      locations = (locations as ScheduleEntry[]).filter(shift => 
        shift.date === dateFilter
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      locations = locations.filter(location => {
        const buildingName = location.building_name.toLowerCase();
        const clientName = location.client_name.toLowerCase();
        const address = location.address?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();

        return buildingName.includes(query) || 
               clientName.includes(query) || 
               address.includes(query);
      });
    }

    setFilteredLocations(locations);
  };

  const isShift = (location: ScheduleEntry | ClientBuilding): location is ScheduleEntry => {
    return 'date' in location && 'day' in location;
  };

  const handleSendToLocation = async () => {
    if (!invoice || !selectedLocation) {
      showToast('Please select a location', 'error');
      return;
    }

    try {
      console.log('🔄 Sending invoice to location...');

      const assignmentId = uuid.v4() as string;
      const isScheduledShift = isShift(selectedLocation);

      // Create invoice shift assignment
      const { error: assignmentError } = await supabase
        .from('invoice_shift_assignments')
        .insert({
          id: assignmentId,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          shift_id: isScheduledShift ? selectedLocation.id : null,
          shift_date: isScheduledShift ? selectedLocation.date : null,
          building_name: selectedLocation.building_name,
          client_name: selectedLocation.client_name,
          location_address: selectedLocation.address || '',
          assigned_by: 'Supervisor',
          notes: notes.trim() || null,
          status: 'pending',
        });

      if (assignmentError) {
        console.error('❌ Error creating assignment:', assignmentError);
        throw assignmentError;
      }

      // Create inventory transactions for each line item
      for (const item of lineItems) {
        if (item.id) {
          await supabase
            .from('inventory_transactions')
            .insert({
              id: uuid.v4() as string,
              item_id: item.id,
              item_name: item.description,
              transaction_type: 'out',
              quantity: item.quantity,
              previous_stock: 0,
              new_stock: 0,
              reason: `Sent to ${selectedLocation.building_name} - Invoice ${invoice.invoice_number}`,
              performed_by: 'Supervisor',
            });
        }
      }

      console.log('✅ Invoice sent to location successfully');
      showToast(
        `Invoice ${invoice.invoice_number} sent to ${selectedLocation.building_name}`, 
        'success'
      );
      router.back();
    } catch (error) {
      console.error('❌ Failed to send invoice to location:', error);
      showToast('Failed to send invoice to location', 'error');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} color={colors.background} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Invoice to Location</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <AnimatedCard style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceNumber}>Invoice {invoice.invoice_number}</Text>
            </View>
            <Text style={[typography.body, { marginBottom: spacing.sm }]}>
              Customer: {invoice.customer_name}
            </Text>
            <Text style={[typography.body, { marginBottom: spacing.sm }]}>
              Total: ${invoice.total_amount.toFixed(2)}
            </Text>

            <View style={styles.lineItemsList}>
              <Text style={[typography.caption, { fontWeight: 'bold', marginBottom: spacing.xs }]}>
                Supplies in this invoice:
              </Text>
              {lineItems.map((item, index) => (
                <View key={index} style={styles.lineItemRow}>
                  <Text style={styles.lineItemText}>{item.description}</Text>
                  <Text style={styles.lineItemText}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          </AnimatedCard>
        </View>

        {/* Location Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Location Type</Text>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                locationFilter === 'shifts' && styles.filterButtonActive,
              ]}
              onPress={() => setLocationFilter('shifts')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  locationFilter === 'shifts' && styles.filterButtonTextActive,
                ]}
              >
                Scheduled Shifts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                locationFilter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setLocationFilter('all')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  locationFilter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                All Buildings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Filter (only for shifts) */}
        {locationFilter === 'shifts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filter by Date (Optional)</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={dateFilter}
              onChangeText={setDateFilter}
            />
          </View>
        )}

        {/* Search Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locationFilter === 'shifts' ? 'Search Shifts' : 'Search Buildings'}
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by building, client, or address..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Locations List */}
        <View style={styles.section}>
          {filteredLocations.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="location-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                {searchQuery || dateFilter
                  ? 'No locations found'
                  : locationFilter === 'shifts'
                  ? 'No upcoming shifts'
                  : 'No buildings available'}
              </Text>
            </View>
          ) : (
            filteredLocations.map((location) => {
              const isScheduledShift = isShift(location);
              return (
                <TouchableOpacity
                  key={location.id}
                  onPress={() => setSelectedLocation(location)}
                >
                  <AnimatedCard
                    style={[
                      styles.locationCard,
                      selectedLocation?.id === location.id && {
                        borderColor: colors.primary,
                        borderWidth: 2,
                        backgroundColor: colors.primary + '10',
                      },
                    ]}
                  >
                    <View style={styles.locationHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.locationName}>{location.building_name}</Text>
                        {!isScheduledShift && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>No scheduled shift</Text>
                          </View>
                        )}
                      </View>
                      {selectedLocation?.id === location.id && (
                        <Icon name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </View>

                    <View style={styles.locationInfo}>
                      <View style={styles.infoItem}>
                        <Icon name="business" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>{location.client_name}</Text>
                      </View>
                      {isScheduledShift && (
                        <View style={styles.infoItem}>
                          <Icon name="calendar" size={16} color={colors.textSecondary} />
                          <Text style={styles.infoText}>
                            {new Date(location.date).toLocaleDateString()} ({location.day})
                          </Text>
                        </View>
                      )}
                      {location.address && (
                        <View style={styles.infoItem}>
                          <Icon name="location" size={16} color={colors.textSecondary} />
                          <Text style={styles.infoText}>{location.address}</Text>
                        </View>
                      )}
                    </View>
                  </AnimatedCard>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Notes */}
        {selectedLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this delivery..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        )}

        {/* Send Button */}
        {selectedLocation && (
          <Button
            title={`Send Invoice ${invoice.invoice_number} to ${selectedLocation.building_name}`}
            onPress={handleSendToLocation}
            style={{ marginBottom: spacing.xl }}
          />
        )}
      </ScrollView>

      <Toast />
    </View>
  );
}
