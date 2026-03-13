import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../app/integrations/supabase/client';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';

interface Supplier {
  id: string;
  name: string;
}

interface SupplierPickerProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  inputStyle?: object;
}

const SupplierPicker: React.FC<SupplierPickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Enter supplier name',
  required = false,
  inputStyle,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name');
    if (data) setSuppliers(data);
  };

  const saveSupplier = async () => {
    const name = value.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ name })
      .select('id, name')
      .single();
    if (!error && data) {
      setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const deleteSupplier = async (supplier: Supplier) => {
    await supabase.from('suppliers').delete().eq('id', supplier.id);
    setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
  };

  const isAlreadySaved = suppliers.some(
    s => s.name.toLowerCase() === value.trim().toLowerCase()
  );
  const showSaveChip = value.trim().length > 0 && !isAlreadySaved;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        style={[commonStyles.textInput, inputStyle]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
      />
      {(suppliers.length > 0 || showSaveChip) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {suppliers.map(s => (
            <View key={s.id} style={styles.chip}>
              <TouchableOpacity onPress={() => onChange(s.name)} activeOpacity={0.7}>
                <Text style={styles.chipText}>{s.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteSupplier(s)} style={styles.chipX} activeOpacity={0.6} hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}>
                <Text style={styles.chipXText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {showSaveChip && (
            <TouchableOpacity style={styles.saveChip} onPress={saveSupplier} activeOpacity={0.7}>
              <Text style={styles.saveChipText}>+ Save</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    marginTop: spacing.sm,
  },
  chipsContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryPale,
    borderRadius: 16,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  chipX: {
    marginLeft: 4,
  },
  chipXText: {
    fontSize: 16,
    lineHeight: 18,
    color: colors.primary,
    opacity: 0.6,
  },
  saveChip: {
    backgroundColor: colors.successLight,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.success,
  },
  saveChipText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
});

export default SupplierPicker;
