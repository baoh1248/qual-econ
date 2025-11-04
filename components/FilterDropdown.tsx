
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface FilterDropdownProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  themeColor?: string;
  allowManualInput?: boolean;
  showCount?: boolean;
  getOptionCount?: (option: string) => number;
}

export default function FilterDropdown({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select or type...',
  themeColor = colors.primary,
  allowManualInput = true,
  showCount = false,
  getOptionCount,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // Filter options based on input
    if (inputValue.trim()) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [inputValue, options]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    if (allowManualInput) {
      onValueChange(text);
    }
    if (!isOpen && text.trim()) {
      setIsOpen(true);
    }
  };

  const handleSelectOption = (option: string) => {
    setInputValue(option);
    onValueChange(option);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onValueChange('');
    setIsOpen(false);
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.inputWrapper,
            isOpen && [styles.inputWrapperActive, { borderColor: themeColor }]
          ]}
          onPress={handleToggleDropdown}
          activeOpacity={1}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              !inputValue && styles.inputPlaceholder
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={handleInputChange}
            onFocus={() => setIsOpen(true)}
          />
          
          <View style={styles.iconContainer}>
            {inputValue ? (
              <TouchableOpacity onPress={handleClear} style={styles.iconButton}>
                <Icon name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={handleToggleDropdown} style={styles.iconButton}>
              <Icon 
                name={isOpen ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdown}>
            <ScrollView 
              style={styles.dropdownScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {/* Show "All" option */}
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  !value && styles.dropdownItemSelected
                ]}
                onPress={() => handleSelectOption('')}
              >
                <Text style={[
                  styles.dropdownItemText,
                  !value && [styles.dropdownItemTextSelected, { color: themeColor }]
                ]}>
                  All {label}
                  {showCount && getOptionCount && ` (${getOptionCount('')})`}
                </Text>
              </TouchableOpacity>

              {/* Show filtered options */}
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownItem,
                      index === filteredOptions.length - 1 && styles.dropdownItemLast,
                      value === option && styles.dropdownItemSelected
                    ]}
                    onPress={() => handleSelectOption(option)}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      value === option && [styles.dropdownItemTextSelected, { color: themeColor }]
                    ]}>
                      {option}
                      {showCount && getOptionCount && ` (${getOptionCount(option)})`}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResults}>
                  <Icon name="search" size={24} color={colors.textSecondary} />
                  <Text style={styles.noResultsText}>
                    No matches found
                  </Text>
                  {allowManualInput && inputValue.trim() && (
                    <Text style={styles.noResultsHint}>
                      Press Enter to use &quot;{inputValue}&quot;
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setIsOpen(false)}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrapperActive: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
  inputPlaceholder: {
    color: colors.textSecondary,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: spacing.xs,
    maxHeight: 250,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 250,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  noResults: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  noResultsHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backdrop: {
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
      default: {
        position: 'absolute',
      },
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
