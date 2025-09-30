
import React, { memo, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Switch } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';

interface PaymentModalProps {
  visible: boolean;
  entryId: string;
  currentPaymentType: 'hourly' | 'flat_rate';
  currentHourlyRate?: number;
  currentFlatRateAmount?: number;
  hours: number;
  onClose: () => void;
  onSave: (paymentType: 'hourly' | 'flat_rate', amount: number) => void;
}

const PaymentModal = memo(({
  visible,
  entryId,
  currentPaymentType,
  currentHourlyRate = 15,
  currentFlatRateAmount = 0,
  hours,
  onClose,
  onSave
}: PaymentModalProps) => {
  const [paymentType, setPaymentType] = useState<'hourly' | 'flat_rate'>(currentPaymentType);
  const [hourlyRate, setHourlyRate] = useState(currentHourlyRate.toString());
  const [flatRateAmount, setFlatRateAmount] = useState(currentFlatRateAmount.toString());

  const handleSave = useCallback(() => {
    const amount = paymentType === 'hourly' 
      ? parseFloat(hourlyRate) || 15
      : parseFloat(flatRateAmount) || 0;
    
    if (paymentType === 'flat_rate' && amount <= 0) {
      alert('Please enter a valid flat rate amount');
      return;
    }
    
    if (paymentType === 'hourly' && amount <= 0) {
      alert('Please enter a valid hourly rate');
      return;
    }
    
    onSave(paymentType, amount);
    onClose();
  }, [paymentType, hourlyRate, flatRateAmount, onSave, onClose]);

  const calculateTotal = () => {
    if (paymentType === 'hourly') {
      return (parseFloat(hourlyRate) || 15) * hours;
    } else {
      return parseFloat(flatRateAmount) || 0;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Payment Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Payment Type Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Type</Text>
              
              <View style={styles.paymentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'hourly' && styles.paymentTypeButtonActive
                  ]}
                  onPress={() => setPaymentType('hourly')}
                >
                  <Icon 
                    name="time-outline" 
                    size={20} 
                    color={paymentType === 'hourly' ? colors.background : colors.text} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'hourly' && styles.paymentTypeTextActive
                  ]}>
                    Hourly Rate
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'flat_rate' && styles.paymentTypeButtonActive
                  ]}
                  onPress={() => setPaymentType('flat_rate')}
                >
                  <Icon 
                    name="cash-outline" 
                    size={20} 
                    color={paymentType === 'flat_rate' ? colors.background : colors.text} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'flat_rate' && styles.paymentTypeTextActive
                  ]}>
                    Flat Rate
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Amount Input */}
            <View style={styles.section}>
              {paymentType === 'hourly' ? (
                <>
                  <Text style={styles.sectionTitle}>Hourly Rate ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={hourlyRate}
                    onChangeText={setHourlyRate}
                    placeholder="15.00"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={styles.helperText}>
                    For {hours} hours at ${hourlyRate}/hour
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Flat Rate Amount ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={flatRateAmount}
                    onChangeText={setFlatRateAmount}
                    placeholder="100.00"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={styles.helperText}>
                    Fixed payment regardless of time spent
                  </Text>
                </>
              )}
            </View>

            {/* Total Calculation */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Payment:</Text>
              <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>

            {/* Payment Type Explanation */}
            <View style={styles.explanationSection}>
              <Text style={styles.explanationTitle}>
                {paymentType === 'hourly' ? 'Hourly Payment' : 'Flat Rate Payment'}
              </Text>
              <Text style={styles.explanationText}>
                {paymentType === 'hourly' 
                  ? 'Cleaner will be paid based on the hourly rate multiplied by the scheduled hours.'
                  : 'Cleaner will receive a fixed payment amount regardless of the actual time spent on the job.'
                }
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Save Payment Settings"
              onPress={handleSave}
              style={styles.saveButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    gap: spacing.xs,
  },
  paymentTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentTypeText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  paymentTypeTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  input: {
    ...commonStyles.input,
    fontSize: 18,
    fontWeight: '600',
  },
  helperText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  totalAmount: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  explanationSection: {
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  explanationTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  explanationText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});

PaymentModal.displayName = 'PaymentModal';

export default PaymentModal;
