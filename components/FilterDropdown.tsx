
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

  const hasValue = inputValue.trim() !== '';

  return (
    <View style={[styles.container, isOpen && { zIndex: 9999 }]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {hasValue && (
          <View style={[styles.activeBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.inputWrapper,
            hasValue && [styles.inputWrapperActive, { borderColor: themeColor, backgroundColor: themeColor + '08' }],
            isOpen && [styles.inputWrapperFocused, { borderColor: themeColor, shadowColor: themeColor }]
          ]}
          onPress={handleToggleDropdown}
          activeOpacity={1}
        >
          <View style={styles.inputContent}>
            <Icon 
              name="search" 
              size={18} 
              color={hasValue ? themeColor : colors.textSecondary} 
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                hasValue && { color: themeColor, fontWeight: '600' }
              ]}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              value={inputValue}
              onChangeText={handleInputChange}
              onFocus={() => setIsOpen(true)}
            />
          </View>
          
          <View style={styles.iconContainer}>
            {inputValue ? (
              <TouchableOpacity onPress={handleClear} style={styles.iconButton}>
                <Icon name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={handleToggleDropdown} style={styles.iconButton}>
              <Icon 
                name={isOpen ? 'chevron-up' : 'chevron-down'} 
                size={18} 
                color={hasValue ? themeColor : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isOpen && (
          <View style={[styles.dropdown, { shadowColor: themeColor }]}>
            <ScrollView 
              style={styles.dropdownScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Show "All" option */}
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  !value && [styles.dropdownItemSelected, { backgroundColor: themeColor + '15' }]
                ]}
                onPress={() => handleSelectOption('')}
              >
                <View style={styles.dropdownItemContent}>
                  <Icon 
                    name={!value ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={20} 
                    color={!value ? themeColor : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.dropdownItemText,
                    !value && [styles.dropdownItemTextSelected, { color: themeColor }]
                  ]}>
                    All {label}
                  </Text>
                  {showCount && getOptionCount && (
                    <View style={[styles.countBadge, !value && { backgroundColor: themeColor }]}>
                      <Text style={[styles.countBadgeText, !value && { color: colors.textInverse }]}>
                        {getOptionCount('')}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Show filtered options */}
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownItem,
                      index === filteredOptions.length - 1 && styles.dropdownItemLast,
                      value === option && [styles.dropdownItemSelected, { backgroundColor: themeColor + '15' }]
                    ]}
                    onPress={() => handleSelectOption(option)}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Icon 
                        name={value === option ? 'checkmark-circle' : 'ellipse-outline'} 
                        size={20} 
                        color={value === option ? themeColor : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.dropdownItemText,
                        value === option && [styles.dropdownItemTextSelected, { color: themeColor }]
                      ]}>
                        {option}
                      </Text>
                      {showCount && getOptionCount && (
                        <View style={[styles.countBadge, value === option && { backgroundColor: themeColor }]}>
                          <Text style={[styles.countBadgeText, value === option && { color: colors.textInverse }]}>
                            {getOptionCount(option)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResults}>
                  <Icon name="search" size={32} color={colors.textSecondary} />
                  <Text style={styles.noResultsText}>
                    No matches found
                  </Text>
                  {allowManualInput && inputValue.trim() && (
                    <Text style={styles.noResultsHint}>
                      Using custom filter: &quot;{inputValue}&quot;
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
    marginBottom: spacing.sm,
    zIndex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    ...typography.small,
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    zIndex: 1,
  },
  inputWrapperActive: {
    borderWidth: 2,
  },
  inputWrapperFocused: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: spacing.xs,
    maxHeight: 300,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
    overflow: 'visible',
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    backgroundColor: colors.card,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  dropdownItemTextSelected: {
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...typography.small,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  noResults: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  noResultsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  noResultsHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
    top: -10000,
    left: -10000,
    right: -10000,
    bottom: -10000,
    zIndex: 9998,
  },
});
