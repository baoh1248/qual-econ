
import React, { memo, useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';

interface PaymentModalProps {
  visible: boolean;
  entry: ScheduleEntry | null;
  onClose: () => void;
  onSave: (
    paymentType: 'hourly' | 'flat_rate',
    amount: number,
    bonusAmount?: number,
    deductions?: number,
    overtimeRate?: number
  ) => Promise<void>;
}

const PaymentModal = memo(({
  visible,
  entry,
  onClose,
  onSave,
}: PaymentModalProps) => {
  console.log('PaymentModal rendered with entry:', entry?.id);

  const [paymentType, setPaymentType] = useState<'hourly' | 'flat_rate'>('hourly');
  const [amount, setAmount] = useState('15.00');
  const [bonusAmount, setBonusAmount] = useState('0.00');
  const [deductions, setDeductions] = useState('0.00');
  const [overtimeRate, setOvertimeRate] = useState('1.5');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with entry data
  useEffect(() => {
    if (entry) {
      setPaymentType(entry.paymentType || 'hourly');
      
      if (entry.paymentType === 'flat_rate') {
        setAmount((entry.flatRateAmount || 0).toString());
      } else {
        setAmount((entry.hourlyRate || 15).toString());
      }
      
      setBonusAmount((entry.bonusAmount || 0).toString());
      setDeductions((entry.deductions || 0).toString());
      setOvertimeRate((entry.overtimeRate || 1.5).toString());
    }
  }, [entry]);

  const calculateEstimatedPay = () => {
    const hours = entry?.hours || 0;
    const baseAmount = parseFloat(amount) || 0;
    const bonus = parseFloat(bonusAmount) || 0;
    const deduction = parseFloat(deductions) || 0;
    
    if (paymentType === 'flat_rate') {
      return baseAmount + bonus - deduction;
    } else {
      const overtimeMultiplier = parseFloat(overtimeRate) || 1.5;
      
      // Calculate regular vs overtime hours (assuming 8 hours regular per day)
      const regularHours = Math.min(hours, 8);
      const overtimeHours = Math.max(0, hours - 8);
      
      const regularPay = regularHours * baseAmount;
      const overtimePay = overtimeHours * baseAmount * overtimeMultiplier;
      
      return regularPay + overtimePay + bonus - deduction;
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      
      const baseAmount = parseFloat(amount) || 0;
      const bonus = parseFloat(bonusAmount) || 0;
      const deduction = parseFloat(deductions) || 0;
      const overtime = parseFloat(overtimeRate) || 1.5;
      
      if (baseAmount < 0) {
        alert('Amount cannot be negative');
        return;
      }
      
      await onSave(paymentType, baseAmount, bonus, deduction, overtime);
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment information');
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible || !entry) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Payment Configuration</Text>
              
              {/* Entry Info */}
              <View style={styles.entryInfo}>
                <Text style={styles.entryInfoTitle}>{entry.buildingName}</Text>
                <Text style={styles.entryInfoSubtitle}>
                  {entry.cleanerNames && entry.cleanerNames.length > 0 
                    ? entry.cleanerNames.join(', ')
                    : entry.cleanerName
                  } • {entry.hours}h
                </Text>
              </View>

              {/* Payment Type Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Payment Type *</Text>
                <View style={styles.paymentTypeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.paymentTypeButton,
                      paymentType === 'hourly' && styles.paymentTypeButtonActive
                    ]}
                    onPress={() => setPaymentType('hourly')}
                  >
                    <Icon 
                      name="time" 
                      size={16} 
                      style={{ 
                        color: paymentType === 'hourly' ? colors.background : colors.primary,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[
                      styles.paymentTypeButtonText,
                      paymentType === 'hourly' && styles.paymentTypeButtonTextActive
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
                      name="cash" 
                      size={16} 
                      style={{ 
                        color: paymentType === 'flat_rate' ? colors.background : colors.success,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[
                      styles.paymentTypeButtonText,
                      paymentType === 'flat_rate' && styles.paymentTypeButtonTextActive
                    ]}>
                      Flat Rate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  {paymentType === 'hourly' ? 'Hourly Rate ($)' : 'Flat Rate Amount ($)'} *
                </Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={paymentType === 'hourly' ? '15.00' : '100.00'}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Overtime Rate (only for hourly) */}
              {paymentType === 'hourly' && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Overtime Multiplier</Text>
                  <TextInput
                    style={styles.input}
                    value={overtimeRate}
                    onChangeText={setOvertimeRate}
                    placeholder="1.5"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.helpText}>
                    Overtime rate for hours over 8 per day (e.g., 1.5 = time and a half)
                  </Text>
                </View>
              )}

              {/* Bonus Amount */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Bonus Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={bonusAmount}
                  onChangeText={setBonusAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.helpText}>
                  Additional bonus for this job (performance, difficulty, etc.)
                </Text>
              </View>

              {/* Deductions */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Deductions ($)</Text>
                <TextInput
                  style={styles.input}
                  value={deductions}
                  onChangeText={setDeductions}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.helpText}>
                  Any deductions for this job (damages, supplies, etc.)
                </Text>
              </View>

              {/* Payment Estimate */}
              <View style={styles.paymentEstimate}>
                <View style={styles.paymentEstimateHeader}>
                  <Icon name="calculator" size={20} style={{ color: colors.success }} />
                  <Text style={styles.paymentEstimateTitle}>Estimated Payment</Text>
                </View>
                
                <View style={styles.paymentBreakdown}>
                  {paymentType === 'hourly' ? (
                    <>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Regular Hours:</Text>
                        <Text style={styles.breakdownValue}>
                          {Math.min(entry.hours, 8).toFixed(1)}h × ${amount || '0'} = ${(Math.min(entry.hours, 8) * (parseFloat(amount) || 0)).toFixed(2)}
                        </Text>
                      </View>
                      {entry.hours > 8 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Overtime Hours:</Text>
                          <Text style={styles.breakdownValue}>
                            {(entry.hours - 8).toFixed(1)}h × ${amount || '0'} × {overtimeRate} = ${((entry.hours - 8) * (parseFloat(amount) || 0) * (parseFloat(overtimeRate) || 1.5)).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Flat Rate:</Text>
                      <Text style={styles.breakdownValue}>${amount || '0'}</Text>
                    </View>
                  )}
                  
                  {parseFloat(bonusAmount) > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Bonus:</Text>
                      <Text style={[styles.breakdownValue, { color: colors.success }]}>
                        +${bonusAmount || '0'}
                      </Text>
                    </View>
                  )}
                  
                  {parseFloat(deductions) > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Deductions:</Text>
                      <Text style={[styles.breakdownValue, { color: colors.danger }]}>
                        -${deductions || '0'}
                      </Text>
                    </View>
                  )}
                  
                  <View style={[styles.breakdownRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Payment:</Text>
                    <Text style={styles.totalValue}>
                      ${calculateEstimatedPay().toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                  disabled={isSaving}
                />
                <Button 
                  text={isSaving ? "Saving..." : "Save Payment"}
                  onPress={handleSave}
                  variant="primary"
                  style={styles.actionButton}
                  disabled={isSaving}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
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
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: colors.background,
    borderRadius: 16,
    ...commonStyles.shadow,
    maxHeight: '85%',
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  entryInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  entryInfoTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  entryInfoSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
  },
  helpText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  paymentTypeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  paymentTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  paymentTypeButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  paymentTypeButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  paymentEstimate: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  paymentEstimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paymentEstimateTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  paymentBreakdown: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  breakdownValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.success + '30',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  totalValue: {
    ...typography.h3,
    color: colors.success,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

PaymentModal.displayName = 'PaymentModal';

export default PaymentModal;
