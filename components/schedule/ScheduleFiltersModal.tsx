
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import FilterDropdown from '../FilterDropdown';

interface ScheduleFilters {
  shiftType: 'all' | 'project' | 'regular';
  clientName: string;
  buildingName: string;
  cleanerName: string;
  buildingGroupName: string;
  cleanerGroupName: string;
  status: 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

interface ScheduleFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: ScheduleFilters;
  onFiltersChange: (filters: ScheduleFilters) => void;
  onClearFilters: () => void;
  themeColor: string;
  uniqueClientNames: string[];
  uniqueBuildingNames: string[];
  uniqueCleanerNames: string[];
  uniqueBuildingGroupNames: string[];
  uniqueCleanerGroupNames: string[];
  getClientCount: (clientName: string) => number;
  getBuildingCount: (buildingName: string) => number;
  getCleanerCount: (cleanerName: string) => number;
  getBuildingGroupCount: (groupName: string) => number;
  getCleanerGroupCount: (groupName: string) => number;
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

const ScheduleFiltersModal = memo<ScheduleFiltersModalProps>(({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters,
  themeColor,
  uniqueClientNames,
  uniqueBuildingNames,
  uniqueCleanerNames,
  uniqueBuildingGroupNames,
  uniqueCleanerGroupNames,
  getClientCount,
  getBuildingCount,
  getCleanerCount,
  getBuildingGroupCount,
  getCleanerGroupCount,
  activeFilterCount,
  hasActiveFilters,
}) => {
  const updateFilter = (key: keyof ScheduleFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // Clear building filter when client changes
    if (key === 'clientName') {
      newFilters.buildingName = '';
    }
    
    onFiltersChange(newFilters);
  };

  const handleApply = () => {
    onClose();
  };

  const handleClearAndClose = () => {
    onClearFilters();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <Icon name="filter" size={24} color={colors.textInverse} />
            <Text style={styles.headerTitle}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* Shift Type Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shift Type</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.shiftType === 'all' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('shiftType', 'all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.shiftType === 'all' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  All Shifts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.shiftType === 'regular' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('shiftType', 'regular')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.shiftType === 'regular' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  Regular
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.shiftType === 'project' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('shiftType', 'project')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.shiftType === 'project' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  Projects
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.status === 'all' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('status', 'all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.status === 'all' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.status === 'scheduled' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('status', 'scheduled')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.status === 'scheduled' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  Scheduled
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.status === 'in-progress' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('status', 'in-progress')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.status === 'in-progress' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  In Progress
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.status === 'completed' && [
                    styles.filterButtonActive,
                    { backgroundColor: themeColor + '15', borderColor: themeColor }
                  ]
                ]}
                onPress={() => updateFilter('status', 'completed')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.status === 'completed' && [
                    styles.filterButtonTextActive,
                    { color: themeColor }
                  ]
                ]}>
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Client & Building Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.dropdownColumn}>
              <View style={styles.dropdownWrapper}>
                <FilterDropdown
                  label="Client"
                  value={filters.clientName}
                  onValueChange={(value) => updateFilter('clientName', value)}
                  options={uniqueClientNames}
                  placeholder="All Clients"
                  themeColor={themeColor}
                  allowManualInput={true}
                  showCount={true}
                  getOptionCount={getClientCount}
                />
              </View>
              <View style={styles.dropdownWrapper}>
                <FilterDropdown
                  label="Building"
                  value={filters.buildingName}
                  onValueChange={(value) => updateFilter('buildingName', value)}
                  options={uniqueBuildingNames}
                  placeholder="All Buildings"
                  themeColor={themeColor}
                  allowManualInput={true}
                  showCount={true}
                  getOptionCount={getBuildingCount}
                />
              </View>
            </View>
          </View>

          {/* Cleaner Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cleaners</Text>
            <View style={styles.dropdownColumn}>
              <View style={styles.dropdownWrapper}>
                <FilterDropdown
                  label="Cleaner"
                  value={filters.cleanerName}
                  onValueChange={(value) => updateFilter('cleanerName', value)}
                  options={uniqueCleanerNames}
                  placeholder="All Cleaners"
                  themeColor={themeColor}
                  allowManualInput={true}
                  showCount={true}
                  getOptionCount={getCleanerCount}
                />
              </View>
              <View style={styles.dropdownWrapper}>
                <FilterDropdown
                  label="Cleaner Group"
                  value={filters.cleanerGroupName}
                  onValueChange={(value) => updateFilter('cleanerGroupName', value)}
                  options={uniqueCleanerGroupNames}
                  placeholder="All Groups"
                  themeColor={themeColor}
                  allowManualInput={true}
                  showCount={true}
                  getOptionCount={getCleanerGroupCount}
                />
              </View>
            </View>
          </View>

          {/* Building Group Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Building Groups</Text>
            <View style={styles.dropdownWrapper}>
              <FilterDropdown
                label="Building Group"
                value={filters.buildingGroupName}
                onValueChange={(value) => updateFilter('buildingGroupName', value)}
                options={uniqueBuildingGroupNames}
                placeholder="All Building Groups"
                themeColor={themeColor}
                allowManualInput={true}
                showCount={true}
                getOptionCount={getBuildingGroupCount}
              />
            </View>
          </View>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <View style={styles.section}>
              <View style={styles.summaryHeader}>
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.summaryTitle}>
                  {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'} Active
                </Text>
              </View>
              <View style={styles.summaryTags}>
                {filters.shiftType !== 'all' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      {filters.shiftType === 'project' ? 'Projects' : 'Regular'}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('shiftType', 'all')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.status !== 'all' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('status', 'all')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.clientName.trim() !== '' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      Client: {filters.clientName}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('clientName', '')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.buildingName.trim() !== '' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      Building: {filters.buildingName}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('buildingName', '')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.cleanerName.trim() !== '' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      Cleaner: {filters.cleanerName}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('cleanerName', '')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.cleanerGroupName.trim() !== '' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      Cleaner Group: {filters.cleanerGroupName}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('cleanerGroupName', '')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.buildingGroupName.trim() !== '' && (
                  <View style={[styles.summaryTag, { backgroundColor: themeColor + '15' }]}>
                    <Text style={[styles.summaryTagText, { color: themeColor }]}>
                      Building Group: {filters.buildingGroupName}
                    </Text>
                    <TouchableOpacity onPress={() => updateFilter('buildingGroupName', '')}>
                      <Icon name="close-circle" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {hasActiveFilters && (
            <Button
              title="Clear All"
              onPress={handleClearAndClose}
              variant="outline"
              style={styles.footerButton}
            />
          )}
          <Button
            title={hasActiveFilters ? 'Apply Filters' : 'Close'}
            onPress={handleApply}
            style={[styles.footerButton, { backgroundColor: themeColor }]}
            textStyle={{ color: '#FFFFFF' }}
          />
        </View>
      </View>
    </Modal>
  );
});

ScheduleFiltersModal.displayName = 'ScheduleFiltersModal';

ScheduleFiltersModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  filters: PropTypes.object.isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  themeColor: PropTypes.string.isRequired,
  uniqueClientNames: PropTypes.array.isRequired,
  uniqueBuildingNames: PropTypes.array.isRequired,
  uniqueCleanerNames: PropTypes.array.isRequired,
  uniqueBuildingGroupNames: PropTypes.array.isRequired,
  uniqueCleanerGroupNames: PropTypes.array.isRequired,
  getClientCount: PropTypes.func.isRequired,
  getBuildingCount: PropTypes.func.isRequired,
  getCleanerCount: PropTypes.func.isRequired,
  getBuildingGroupCount: PropTypes.func.isRequired,
  getCleanerGroupCount: PropTypes.func.isRequired,
  activeFilterCount: PropTypes.number.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
};

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
    paddingVertical: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '700',
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    ...typography.small,
    fontSize: 12,
    color: colors.textInverse,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderWidth: 2,
  },
  filterButtonText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    fontWeight: '700',
  },
  dropdownColumn: {
    gap: spacing.lg,
  },
  dropdownWrapper: {
    zIndex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  summaryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  summaryTagText: {
    ...typography.small,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 10 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerButton: {
    flex: 1,
  },
});

export default ScheduleFiltersModal;
