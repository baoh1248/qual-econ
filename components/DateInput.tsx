
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface DateInputProps {
  label?: string;
  value: string;
  onChangeText: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  themeColor?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder = 'YYYY-MM-DD',
  required = false,
  themeColor = colors.primary,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Validate date format (YYYY-MM-DD)
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return true; // Empty is valid if not required
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleTextChange = (text: string) => {
    setInputValue(text);
    if (isValidDate(text)) {
      onChangeText(text);
    }
  };

  const handleCalendarSelect = (day: any) => {
    const selectedDate = day.dateString;
    setInputValue(selectedDate);
    onChangeText(selectedDate);
    setShowCalendar(false);
  };

  const handleBlur = () => {
    // Validate on blur
    if (!isValidDate(inputValue)) {
      // Reset to last valid value
      setInputValue(value);
    }
  };

  const getMarkedDates = () => {
    if (!value || !isValidDate(value)) return {};
    
    return {
      [value]: {
        selected: true,
        selectedColor: themeColor,
      },
    };
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            !isValidDate(inputValue) && inputValue.length > 0 && styles.inputError,
          ]}
          value={inputValue}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
        />
        
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <Icon name="calendar" size={20} style={{ color: themeColor }} />
        </TouchableOpacity>
      </View>

      {!isValidDate(inputValue) && inputValue.length > 0 && (
        <Text style={styles.errorText}>Invalid date format. Use YYYY-MM-DD</Text>
      )}

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          />
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Icon name="close" size={24} style={{ color: colors.text }} />
              </TouchableOpacity>
            </View>
            
            <Calendar
              current={value || undefined}
              onDayPress={handleCalendarSelect}
              markedDates={getMarkedDates()}
              theme={{
                backgroundColor: colors.background,
                calendarBackground: colors.background,
                textSectionTitleColor: colors.text,
                selectedDayBackgroundColor: themeColor,
                selectedDayTextColor: colors.background,
                todayTextColor: themeColor,
                dayTextColor: colors.text,
                textDisabledColor: colors.textSecondary,
                monthTextColor: colors.text,
                arrowColor: themeColor,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
              }}
            />
            
            <View style={styles.calendarActions}>
              <TouchableOpacity
                style={[styles.todayButton, { backgroundColor: themeColor }]}
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setInputValue(today);
                  onChangeText(today);
                  setShowCalendar(false);
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setInputValue('');
                  onChangeText('');
                  setShowCalendar(false);
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingRight: 48,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.danger,
  },
  calendarButton: {
    position: 'absolute',
    right: spacing.sm,
    padding: spacing.xs,
  },
  errorText: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calendarContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calendarTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  calendarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  todayButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  todayButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
});

export default DateInput;
