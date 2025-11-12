
import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, FlatList, Text } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';

interface ScheduleQuickSearchProps {
  schedule: ScheduleEntry[];
  onSelectEntry: (entry: ScheduleEntry) => void;
  themeColor: string;
}

const ScheduleQuickSearch = memo<ScheduleQuickSearchProps>(({ schedule, onSelectEntry, themeColor }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScheduleEntry[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = schedule.filter(entry => {
      const cleanerNames = entry.cleanerNames?.join(' ').toLowerCase() || entry.cleanerName.toLowerCase();
      const buildingName = entry.buildingName.toLowerCase();
      const clientName = entry.clientName.toLowerCase();
      const projectName = entry.projectName?.toLowerCase() || '';
      
      return cleanerNames.includes(query) ||
             buildingName.includes(query) ||
             clientName.includes(query) ||
             projectName.includes(query);
    });

    setSearchResults(results.slice(0, 10));
    setShowResults(true);
  }, [searchQuery, schedule]);

  const handleSelectEntry = useCallback((entry: ScheduleEntry) => {
    onSelectEntry(entry);
    setSearchQuery('');
    setShowResults(false);
  }, [onSelectEntry]);

  const renderSearchResult = useCallback(({ item }: { item: ScheduleEntry }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectEntry(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <Icon 
          name={item.isProject ? 'briefcase' : 'calendar'} 
          size={16} 
          color={themeColor} 
        />
        <Text style={styles.resultBuilding} numberOfLines={1}>
          {item.buildingName}
        </Text>
      </View>
      <Text style={styles.resultClient} numberOfLines={1}>
        {item.clientName}
      </Text>
      <View style={styles.resultFooter}>
        <Text style={styles.resultCleaner} numberOfLines={1}>
          {item.cleanerNames?.join(', ') || item.cleanerName}
        </Text>
        <Text style={styles.resultDay}>
          {item.day.charAt(0).toUpperCase() + item.day.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleSelectEntry, themeColor]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Quick search: cleaner, building, client..."
          placeholderTextColor={colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showResults && searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {showResults && searchResults.length === 0 && searchQuery.length >= 2 && (
        <View style={styles.noResults}>
          <Icon name="search-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.noResultsText}>No shifts found</Text>
        </View>
      )}
    </View>
  );
});

ScheduleQuickSearch.displayName = 'ScheduleQuickSearch';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  resultBuilding: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  resultClient: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCleaner: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  resultDay: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  noResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  noResultsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

export default ScheduleQuickSearch;
