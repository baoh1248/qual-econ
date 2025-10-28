
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface LaborItem {
  id: string;
  laborer_name: string;
  hours: number;
  wage: number;
}

interface EquipmentItem {
  id: string;
  equipment_name: string;
  hours: number;
  cost_per_hour: number;
}

interface VehicleItem {
  id: string;
  vehicle_name: string;
  miles: number;
  cost_per_mile: number;
}

interface SupplyItem {
  id: string;
  supply_name: string;
  quantity: number;
  cost_per_item: number;
}

interface ProfitOption {
  id: number;
  multiplier: number;
}

interface PricingCalculatorProps {
  themeColor: string;
  onPriceCalculated?: (totalPrice: number, selectedOption: number) => void;
  onBaseFeeCalculated?: (laborBaseFee: number, equipmentBaseFee: number) => void;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({ 
  themeColor, 
  onPriceCalculated,
  onBaseFeeCalculated 
}) => {
  // Resource items
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [vehicleItems, setVehicleItems] = useState<VehicleItem[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);

  // Burden multipliers (editable)
  const [laborBurdenMultiplier, setLaborBurdenMultiplier] = useState(1.52);
  const [equipmentBurdenMultiplier, setEquipmentBurdenMultiplier] = useState(1.3);

  // Profit multipliers (editable)
  const [profitOptions, setProfitOptions] = useState<ProfitOption[]>([
    { id: 1, multiplier: 1.2 },
    { id: 2, multiplier: 1.3 },
    { id: 3, multiplier: 1.4 },
    { id: 4, multiplier: 1.5 },
  ]);

  // Selected profit option
  const [selectedOption, setSelectedOption] = useState<number>(2);

  // Edit mode states
  const [editingLaborBurden, setEditingLaborBurden] = useState(false);
  const [editingEquipmentBurden, setEditingEquipmentBurden] = useState(false);
  const [editingProfitOption, setEditingProfitOption] = useState<number | null>(null);

  // Calculate base fees from resources
  const calculateLaborBaseFee = (): number => {
    return laborItems.reduce((total, item) => total + (item.hours * item.wage), 0);
  };

  const calculateEquipmentBaseFee = (): number => {
    const equipmentTotal = equipmentItems.reduce((total, item) => total + (item.hours * item.cost_per_hour), 0);
    const vehicleTotal = vehicleItems.reduce((total, item) => total + (item.miles * item.cost_per_mile), 0);
    const supplyTotal = supplyItems.reduce((total, item) => total + (item.quantity * item.cost_per_item), 0);
    return equipmentTotal + vehicleTotal + supplyTotal;
  };

  const laborBaseFee = calculateLaborBaseFee();
  const equipmentBaseFee = calculateEquipmentBaseFee();

  // Calculate break-even cost
  const calculateBreakEven = (baseFee: number, burdenMultiplier: number): number => {
    return baseFee * burdenMultiplier;
  };

  // Calculate final price with profit
  const calculateFinalPrice = (breakEven: number, profitMultiplier: number): number => {
    return breakEven * profitMultiplier;
  };

  // Get break-even costs
  const laborBreakEven = calculateBreakEven(laborBaseFee, laborBurdenMultiplier);
  const equipmentBreakEven = calculateBreakEven(equipmentBaseFee, equipmentBurdenMultiplier);
  const totalBreakEven = laborBreakEven + equipmentBreakEven;

  // Calculate final prices for all profit options
  const laborFinalPrices = profitOptions.map(option => ({
    id: option.id,
    price: calculateFinalPrice(laborBreakEven, option.multiplier),
  }));

  const equipmentFinalPrices = profitOptions.map(option => ({
    id: option.id,
    price: calculateFinalPrice(equipmentBreakEven, option.multiplier),
  }));

  const grandTotals = profitOptions.map(option => ({
    id: option.id,
    total: calculateFinalPrice(totalBreakEven, option.multiplier),
  }));

  // Get selected grand total
  const selectedGrandTotal = grandTotals.find(gt => gt.id === selectedOption)?.total || 0;

  // Notify parent component when price changes
  useEffect(() => {
    if (onPriceCalculated) {
      onPriceCalculated(selectedGrandTotal, selectedOption);
    }
  }, [selectedGrandTotal, selectedOption, onPriceCalculated]);

  // Notify parent component when base fees change
  useEffect(() => {
    if (onBaseFeeCalculated) {
      onBaseFeeCalculated(laborBaseFee, equipmentBaseFee);
    }
  }, [laborBaseFee, equipmentBaseFee, onBaseFeeCalculated]);

  // Add/Remove functions
  const addLaborItem = () => {
    setLaborItems([...laborItems, { 
      id: `labor-${Date.now()}`, 
      laborer_name: '', 
      hours: 0, 
      wage: 15 
    }]);
  };

  const removeLaborItem = (id: string) => {
    setLaborItems(laborItems.filter(item => item.id !== id));
  };

  const updateLaborItem = (id: string, field: keyof LaborItem, value: any) => {
    setLaborItems(laborItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addEquipmentItem = () => {
    setEquipmentItems([...equipmentItems, { 
      id: `equipment-${Date.now()}`, 
      equipment_name: '', 
      hours: 0, 
      cost_per_hour: 0 
    }]);
  };

  const removeEquipmentItem = (id: string) => {
    setEquipmentItems(equipmentItems.filter(item => item.id !== id));
  };

  const updateEquipmentItem = (id: string, field: keyof EquipmentItem, value: any) => {
    setEquipmentItems(equipmentItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addVehicleItem = () => {
    setVehicleItems([...vehicleItems, { 
      id: `vehicle-${Date.now()}`, 
      vehicle_name: '', 
      miles: 0, 
      cost_per_mile: 0 
    }]);
  };

  const removeVehicleItem = (id: string) => {
    setVehicleItems(vehicleItems.filter(item => item.id !== id));
  };

  const updateVehicleItem = (id: string, field: keyof VehicleItem, value: any) => {
    setVehicleItems(vehicleItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addSupplyItem = () => {
    setSupplyItems([...supplyItems, { 
      id: `supply-${Date.now()}`, 
      supply_name: '', 
      quantity: 0, 
      cost_per_item: 0 
    }]);
  };

  const removeSupplyItem = (id: string) => {
    setSupplyItems(supplyItems.filter(item => item.id !== id));
  };

  const updateSupplyItem = (id: string, field: keyof SupplyItem, value: any) => {
    setSupplyItems(supplyItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      padding: spacing.lg,
      marginVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
    },
    subtitle: {
      ...typography.small,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitleText: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: themeColor,
      borderRadius: 6,
    },
    addButtonText: {
      ...typography.small,
      color: colors.background,
      fontWeight: '600',
    },
    resourceCard: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resourceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    removeButton: {
      padding: spacing.xs,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    inputLabel: {
      ...typography.small,
      color: colors.textSecondary,
      minWidth: 60,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputSmall: {
      minWidth: 80,
    },
    calculatedTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.xs,
    },
    calculatedLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    calculatedValue: {
      ...typography.body,
      color: themeColor,
      fontWeight: '700',
    },
    categoryCard: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    categoryName: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    burdenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    burdenLabel: {
      ...typography.small,
      color: colors.textSecondary,
      flex: 1,
    },
    burdenValue: {
      ...typography.body,
      color: colors.text,
      fontWeight: '500',
    },
    burdenInput: {
      borderWidth: 1,
      borderColor: themeColor,
      borderRadius: 6,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
      minWidth: 80,
      textAlign: 'right',
    },
    editButton: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
    breakEvenRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.xs,
    },
    breakEvenLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    breakEvenValue: {
      ...typography.body,
      color: themeColor,
      fontWeight: '700',
    },
    profitOptionsContainer: {
      marginBottom: spacing.lg,
    },
    profitOptionCard: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.sm,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    profitOptionCardSelected: {
      borderColor: themeColor,
      borderWidth: 2,
      backgroundColor: themeColor + '10',
    },
    profitOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profitOptionNumber: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '700',
      marginRight: spacing.sm,
      minWidth: 30,
    },
    profitOptionNumberSelected: {
      color: themeColor,
    },
    profitMultiplier: {
      ...typography.body,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    profitMultiplierSelected: {
      color: themeColor,
      fontWeight: '600',
    },
    resultsTable: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: themeColor,
      paddingBottom: spacing.sm,
      marginBottom: spacing.sm,
    },
    tableHeaderCell: {
      ...typography.small,
      color: colors.text,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableCell: {
      ...typography.small,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    tableCellBold: {
      fontWeight: '600',
    },
    tableCellHighlight: {
      color: themeColor,
      fontWeight: '700',
    },
    grandTotalCard: {
      backgroundColor: themeColor + '15',
      borderRadius: 8,
      padding: spacing.md,
      marginTop: spacing.md,
      borderWidth: 2,
      borderColor: themeColor,
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    grandTotalLabel: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
    },
    grandTotalValue: {
      ...typography.h2,
      color: themeColor,
      fontWeight: '700',
    },
    grandTotalSubtext: {
      ...typography.small,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    emptyState: {
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyStateText: {
      ...typography.small,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: spacing.xs,
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>💰 Pricing Calculator</Text>
          <Text style={styles.subtitle}>Calculate base fees from detailed resource inputs</Text>
        </View>
      </View>

      {/* Labor Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>💼 Labor</Text>
          <TouchableOpacity style={styles.addButton} onPress={addLaborItem}>
            <Icon name="add" size={16} style={{ color: colors.background }} />
            <Text style={styles.addButtonText}>Add Laborer</Text>
          </TouchableOpacity>
        </View>

        {laborItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={32} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No labor items added yet</Text>
          </View>
        ) : (
          laborItems.map((item) => (
            <View key={item.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <Text style={styles.categoryName}>Laborer</Text>
                <TouchableOpacity 
                  style={styles.removeButton} 
                  onPress={() => removeLaborItem(item.id)}
                >
                  <Icon name="trash" size={18} style={{ color: colors.danger }} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name:</Text>
                <TextInput
                  style={styles.input}
                  value={item.laborer_name}
                  onChangeText={(text) => updateLaborItem(item.id, 'laborer_name', text)}
                  placeholder="Enter laborer name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Hours:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.hours.toString()}
                  onChangeText={(text) => updateLaborItem(item.id, 'hours', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>Wage/hr:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.wage.toString()}
                  onChangeText={(text) => updateLaborItem(item.id, 'wage', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.calculatedTotal}>
                <Text style={styles.calculatedLabel}>Total:</Text>
                <Text style={styles.calculatedValue}>${(item.hours * item.wage).toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}

        {laborItems.length > 0 && (
          <View style={[styles.categoryCard, { backgroundColor: themeColor + '10', borderColor: themeColor }]}>
            <View style={styles.breakEvenRow}>
              <Text style={[styles.breakEvenLabel, { fontSize: 16 }]}>Labor Base Fee:</Text>
              <Text style={[styles.breakEvenValue, { fontSize: 18 }]}>${laborBaseFee.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Equipment Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>🔧 Equipment</Text>
          <TouchableOpacity style={styles.addButton} onPress={addEquipmentItem}>
            <Icon name="add" size={16} style={{ color: colors.background }} />
            <Text style={styles.addButtonText}>Add Equipment</Text>
          </TouchableOpacity>
        </View>

        {equipmentItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="construct-outline" size={32} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No equipment items added yet</Text>
          </View>
        ) : (
          equipmentItems.map((item) => (
            <View key={item.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <Text style={styles.categoryName}>Equipment</Text>
                <TouchableOpacity 
                  style={styles.removeButton} 
                  onPress={() => removeEquipmentItem(item.id)}
                >
                  <Icon name="trash" size={18} style={{ color: colors.danger }} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name:</Text>
                <TextInput
                  style={styles.input}
                  value={item.equipment_name}
                  onChangeText={(text) => updateEquipmentItem(item.id, 'equipment_name', text)}
                  placeholder="Enter equipment name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Hours:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.hours.toString()}
                  onChangeText={(text) => updateEquipmentItem(item.id, 'hours', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>$/hr:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.cost_per_hour.toString()}
                  onChangeText={(text) => updateEquipmentItem(item.id, 'cost_per_hour', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.calculatedTotal}>
                <Text style={styles.calculatedLabel}>Total:</Text>
                <Text style={styles.calculatedValue}>${(item.hours * item.cost_per_hour).toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Vehicle Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>🚗 Vehicles</Text>
          <TouchableOpacity style={styles.addButton} onPress={addVehicleItem}>
            <Icon name="add" size={16} style={{ color: colors.background }} />
            <Text style={styles.addButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {vehicleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="car-outline" size={32} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No vehicle items added yet</Text>
          </View>
        ) : (
          vehicleItems.map((item) => (
            <View key={item.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <Text style={styles.categoryName}>Vehicle</Text>
                <TouchableOpacity 
                  style={styles.removeButton} 
                  onPress={() => removeVehicleItem(item.id)}
                >
                  <Icon name="trash" size={18} style={{ color: colors.danger }} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name:</Text>
                <TextInput
                  style={styles.input}
                  value={item.vehicle_name}
                  onChangeText={(text) => updateVehicleItem(item.id, 'vehicle_name', text)}
                  placeholder="Enter vehicle name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Miles:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.miles.toString()}
                  onChangeText={(text) => updateVehicleItem(item.id, 'miles', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>$/mile:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.cost_per_mile.toString()}
                  onChangeText={(text) => updateVehicleItem(item.id, 'cost_per_mile', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.calculatedTotal}>
                <Text style={styles.calculatedLabel}>Total:</Text>
                <Text style={styles.calculatedValue}>${(item.miles * item.cost_per_mile).toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Supply Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>📦 Supplies</Text>
          <TouchableOpacity style={styles.addButton} onPress={addSupplyItem}>
            <Icon name="add" size={16} style={{ color: colors.background }} />
            <Text style={styles.addButtonText}>Add Supply</Text>
          </TouchableOpacity>
        </View>

        {supplyItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="cube-outline" size={32} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No supply items added yet</Text>
          </View>
        ) : (
          supplyItems.map((item) => (
            <View key={item.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <Text style={styles.categoryName}>Supply</Text>
                <TouchableOpacity 
                  style={styles.removeButton} 
                  onPress={() => removeSupplyItem(item.id)}
                >
                  <Icon name="trash" size={18} style={{ color: colors.danger }} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name:</Text>
                <TextInput
                  style={styles.input}
                  value={item.supply_name}
                  onChangeText={(text) => updateSupplyItem(item.id, 'supply_name', text)}
                  placeholder="Enter supply name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Qty:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateSupplyItem(item.id, 'quantity', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>$/item:</Text>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  value={item.cost_per_item.toString()}
                  onChangeText={(text) => updateSupplyItem(item.id, 'cost_per_item', parseFloat(text) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.calculatedTotal}>
                <Text style={styles.calculatedLabel}>Total:</Text>
                <Text style={styles.calculatedValue}>${(item.quantity * item.cost_per_item).toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Combined Equipment/Vehicle/Supply Base Fee */}
      {(equipmentItems.length > 0 || vehicleItems.length > 0 || supplyItems.length > 0) && (
        <View style={[styles.categoryCard, { backgroundColor: themeColor + '10', borderColor: themeColor }]}>
          <View style={styles.breakEvenRow}>
            <Text style={[styles.breakEvenLabel, { fontSize: 16 }]}>Equipment/Vehicle/Supply Base Fee:</Text>
            <Text style={[styles.breakEvenValue, { fontSize: 18 }]}>${equipmentBaseFee.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Burden Multipliers & Break-Even */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleText}>📊 Burden Multipliers & Break-Even</Text>
        
        {/* Labor Burden */}
        <View style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>💼 Labor</Text>
          </View>
          
          <View style={styles.burdenRow}>
            <Text style={styles.burdenLabel}>Base Fee:</Text>
            <Text style={styles.burdenValue}>${laborBaseFee.toFixed(2)}</Text>
          </View>
          
          <View style={styles.burdenRow}>
            <Text style={styles.burdenLabel}>Burden Multiplier:</Text>
            {editingLaborBurden ? (
              <>
                <TextInput
                  style={styles.burdenInput}
                  value={laborBurdenMultiplier.toString()}
                  onChangeText={(text) => setLaborBurdenMultiplier(parseFloat(text) || 1)}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  autoFocus
                  onBlur={() => setEditingLaborBurden(false)}
                />
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingLaborBurden(false)}
                >
                  <Icon name="checkmark-circle" size={20} style={{ color: colors.success }} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.burdenValue}>{laborBurdenMultiplier.toFixed(2)}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingLaborBurden(true)}
                >
                  <Icon name="create" size={18} style={{ color: themeColor }} />
                </TouchableOpacity>
              </>
            )}
          </View>
          
          <View style={styles.breakEvenRow}>
            <Text style={styles.breakEvenLabel}>Break-Even Cost:</Text>
            <Text style={styles.breakEvenValue}>${laborBreakEven.toFixed(2)}</Text>
          </View>
        </View>

        {/* Equipment Burden */}
        <View style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>🚗 Equipment/Vehicle/Supply</Text>
          </View>
          
          <View style={styles.burdenRow}>
            <Text style={styles.burdenLabel}>Base Fee:</Text>
            <Text style={styles.burdenValue}>${equipmentBaseFee.toFixed(2)}</Text>
          </View>
          
          <View style={styles.burdenRow}>
            <Text style={styles.burdenLabel}>Burden Multiplier:</Text>
            {editingEquipmentBurden ? (
              <>
                <TextInput
                  style={styles.burdenInput}
                  value={equipmentBurdenMultiplier.toString()}
                  onChangeText={(text) => setEquipmentBurdenMultiplier(parseFloat(text) || 1)}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  autoFocus
                  onBlur={() => setEditingEquipmentBurden(false)}
                />
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingEquipmentBurden(false)}
                >
                  <Icon name="checkmark-circle" size={20} style={{ color: colors.success }} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.burdenValue}>{equipmentBurdenMultiplier.toFixed(2)}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingEquipmentBurden(true)}
                >
                  <Icon name="create" size={18} style={{ color: themeColor }} />
                </TouchableOpacity>
              </>
            )}
          </View>
          
          <View style={styles.breakEvenRow}>
            <Text style={styles.breakEvenLabel}>Break-Even Cost:</Text>
            <Text style={styles.breakEvenValue}>${equipmentBreakEven.toFixed(2)}</Text>
          </View>
        </View>

        {/* Total Break-Even */}
        <View style={[styles.categoryCard, { backgroundColor: themeColor + '10', borderColor: themeColor }]}>
          <View style={styles.breakEvenRow}>
            <Text style={[styles.breakEvenLabel, { fontSize: 16 }]}>Total Break-Even:</Text>
            <Text style={[styles.breakEvenValue, { fontSize: 18 }]}>${totalBreakEven.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Profit Multiplier Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleText}>📈 Select Profit Multiplier</Text>
        
        {profitOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.profitOptionCard,
              selectedOption === option.id && styles.profitOptionCardSelected,
            ]}
            onPress={() => setSelectedOption(option.id)}
          >
            <View style={styles.profitOptionLeft}>
              <Text
                style={[
                  styles.profitOptionNumber,
                  selectedOption === option.id && styles.profitOptionNumberSelected,
                ]}
              >
                {option.id}
              </Text>
              {editingProfitOption === option.id ? (
                <TextInput
                  style={[styles.burdenInput, { minWidth: 60 }]}
                  value={option.multiplier.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 1;
                    setProfitOptions(
                      profitOptions.map((opt) =>
                        opt.id === option.id ? { ...opt, multiplier: value } : opt
                      )
                    );
                  }}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  autoFocus
                  onBlur={() => setEditingProfitOption(null)}
                />
              ) : (
                <Text
                  style={[
                    styles.profitMultiplier,
                    selectedOption === option.id && styles.profitMultiplierSelected,
                  ]}
                >
                  Multiplier: {option.multiplier.toFixed(1)}x
                </Text>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.breakEvenValue,
                  { marginRight: spacing.sm },
                ]}
              >
                ${grandTotals.find(gt => gt.id === option.id)?.total.toFixed(2)}
              </Text>
              {editingProfitOption !== option.id && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingProfitOption(option.id)}
                >
                  <Icon name="create" size={18} style={{ color: themeColor }} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleText}>📋 Pricing Breakdown</Text>
        
        <View style={styles.resultsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'left' }]}>Category</Text>
            <Text style={styles.tableHeaderCell}>Break-Even</Text>
            {profitOptions.map((option) => (
              <Text
                key={option.id}
                style={[
                  styles.tableHeaderCell,
                  selectedOption === option.id && { color: themeColor, fontWeight: '700' },
                ]}
              >
                Opt {option.id}
              </Text>
            ))}
          </View>
          
          {/* Labor Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1.5, textAlign: 'left' }]}>
              Labor
            </Text>
            <Text style={styles.tableCell}>${laborBreakEven.toFixed(2)}</Text>
            {laborFinalPrices.map((price) => (
              <Text
                key={price.id}
                style={[
                  styles.tableCell,
                  selectedOption === price.id && styles.tableCellHighlight,
                ]}
              >
                ${price.price.toFixed(2)}
              </Text>
            ))}
          </View>
          
          {/* Equipment Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1.5, textAlign: 'left' }]}>
              Equipment
            </Text>
            <Text style={styles.tableCell}>${equipmentBreakEven.toFixed(2)}</Text>
            {equipmentFinalPrices.map((price) => (
              <Text
                key={price.id}
                style={[
                  styles.tableCell,
                  selectedOption === price.id && styles.tableCellHighlight,
                ]}
              >
                ${price.price.toFixed(2)}
              </Text>
            ))}
          </View>
          
          {/* Total Row */}
          <View style={[styles.tableRow, { borderBottomWidth: 0, paddingTop: spacing.sm }]}>
            <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1.5, textAlign: 'left', fontSize: 16 }]}>
              Total
            </Text>
            <Text style={[styles.tableCell, styles.tableCellBold]}>${totalBreakEven.toFixed(2)}</Text>
            {grandTotals.map((total) => (
              <Text
                key={total.id}
                style={[
                  styles.tableCell,
                  styles.tableCellBold,
                  selectedOption === total.id && styles.tableCellHighlight,
                  { fontSize: 16 },
                ]}
              >
                ${total.total.toFixed(2)}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Grand Total Display */}
      <View style={styles.grandTotalCard}>
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Customer Price:</Text>
          <Text style={styles.grandTotalValue}>${selectedGrandTotal.toFixed(2)}</Text>
        </View>
        <Text style={styles.grandTotalSubtext}>
          Using Profit Option {selectedOption} ({profitOptions.find(opt => opt.id === selectedOption)?.multiplier.toFixed(1)}x multiplier)
        </Text>
      </View>
    </ScrollView>
  );
};

export default PricingCalculator;
