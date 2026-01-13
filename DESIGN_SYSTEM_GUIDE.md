# Modern UI Design System Guide

This guide documents the new modern, professional design system applied across the app. Use these patterns to ensure consistency.

## Design Principles

1. **Clean & Spacious**: More white space, rounded corners, clear visual hierarchy
2. **Elevated Cards**: All cards have shadows and depth
3. **Color-Coded Information**: Consistent use of colors for status and categories
4. **Modern Typography**: Bold headers, clear labels with letter-spacing
5. **Smooth Interactions**: Elevated UI elements with proper shadows

## Color Palette

- **Background**: `#F5F7FA` (light gray-blue)
- **Cards**: `#FFFFFF` (pure white)
- **Headers**: Theme color with curved bottom corners
- **Shadows**: Consistent elevation levels

## Key Components & Patterns

### 1. Screen Container
```tsx
<View style={enhancedStyles.screenContainer}>
  {/* Background color: #F5F7FA */}
</View>
```

### 2. Modern Header Pattern
```tsx
<View style={[enhancedStyles.modernHeader, { backgroundColor: themeColor }]}>
  {/* Top row with back button and actions */}
  <View style={enhancedStyles.headerTop}>
    <IconButton icon="arrow-back" onPress={() => router.back()} variant="white" />
    <View style={enhancedStyles.headerTitleContainer}>
      <Icon name="icon-name" size={32} style={{ color: '#FFFFFF' }} />
    </View>
    <View style={{ width: 40 }} />
  </View>

  {/* Title and subtitle */}
  <View>
    <Text style={enhancedStyles.headerTitle}>Screen Title</Text>
    <Text style={enhancedStyles.headerSubtitle}>
      Subtitle with context info
    </Text>
  </View>

  {/* Optional: Search bar in header */}
  <View style={enhancedStyles.searchContainer}>
    <Icon name="search" size={22} style={{ color: themeColor }} />
    <TextInput
      style={enhancedStyles.searchInput}
      placeholder="Search..."
      value={searchQuery}
      onChangeText={setSearchQuery}
    />
  </View>
</View>
```

### 3. Filter Chips
```tsx
<View style={enhancedStyles.filtersContainer}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View style={enhancedStyles.filterRow}>
      <TouchableOpacity
        style={[
          enhancedStyles.filterChip,
          isActive && { ...enhancedStyles.filterChipActive, backgroundColor: themeColor, borderColor: themeColor }
        ]}
        onPress={() => handleFilter()}
      >
        <Text style={[
          enhancedStyles.filterChipText,
          isActive && enhancedStyles.filterChipTextActive
        ]}>
          Filter Name
        </Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
</View>
```

### 4. Stats Cards
```tsx
<View style={enhancedStyles.statsContainer}>
  <View style={[enhancedStyles.statCard, { borderLeftColor: themeColor }]}>
    <View style={[enhancedStyles.statIconContainer, { backgroundColor: themeColor + '15' }]}>
      <Icon name="icon-name" size={24} style={{ color: themeColor }} />
    </View>
    <Text style={enhancedStyles.statValue}>42</Text>
    <Text style={enhancedStyles.statLabel}>Label</Text>
  </View>
</View>
```

### 5. Modern Cards
```tsx
<AnimatedCard style={enhancedStyles.modernCard}>
  {/* Card Header */}
  <View style={[enhancedStyles.cardHeader, {
    backgroundColor: themeColor + '08',
    borderLeftColor: themeColor
  }]}>
    <View style={styles.cardTitleRow}>
      <Text style={enhancedStyles.titleText}>Card Title</Text>
      {/* Status badge */}
      <View style={[enhancedStyles.statusBadgeModern, { backgroundColor: statusColor + '20' }]}>
        <View style={[enhancedStyles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[enhancedStyles.statusText, { color: statusColor }]}>
          STATUS
        </Text>
      </View>
    </View>
  </View>

  {/* Card Body */}
  <View style={enhancedStyles.cardBody}>
    <Text style={enhancedStyles.bodyText}>Content here...</Text>

    {/* Detail chips grid */}
    <View style={enhancedStyles.detailsGrid}>
      <View style={enhancedStyles.detailChip}>
        <Icon name="icon" size={16} style={{ color: themeColor }} />
        <Text style={enhancedStyles.detailChipText}>Detail</Text>
      </View>
    </View>
  </View>

  {/* Card Footer with action buttons */}
  <View style={enhancedStyles.cardFooter}>
    <TouchableOpacity style={enhancedStyles.actionButton} onPress={() => {}}>
      <Icon name="icon" size={18} style={{ color: colors.success }} />
      <Text style={[enhancedStyles.actionButtonText, { color: colors.success }]}>
        ACTION
      </Text>
    </TouchableOpacity>
  </View>
</AnimatedCard>
```

### 6. Floating Action Button (FAB)
```tsx
<TouchableOpacity
  style={[enhancedStyles.fab, { backgroundColor: themeColor, shadowColor: themeColor }]}
  onPress={() => handleAdd()}
>
  <Icon name="add" size={32} style={{ color: '#FFFFFF' }} />
</TouchableOpacity>
```

### 7. Empty State
```tsx
<View style={enhancedStyles.emptyState}>
  <View style={[enhancedStyles.emptyStateIconContainer, { backgroundColor: themeColor + '10' }]}>
    <Icon name="icon-name" size={64} style={{ color: themeColor }} />
  </View>
  <Text style={enhancedStyles.emptyStateText}>No Items Yet</Text>
  <Text style={enhancedStyles.emptyStateSubtext}>
    Helpful message about what to do next
  </Text>
  <Button text="Create First Item" onPress={() => {}} variant="primary" />
</View>
```

## Screen-Specific Patterns

### Dashboard Pattern
- Curved header with gradient effect
- 4-column stats grid
- Large feature cards for key actions
- Quick access buttons

### List Screen Pattern
- Search in header
- Horizontal filter chips (overlapping header)
- Stats summary below header
- Card list with actions
- FAB for adding new items

### Detail Screen Pattern
- Header with back button
- Hero section with key info
- Tabbed or sectioned content
- Action buttons at bottom

## Color Usage

### Status Colors
- **Success**: `colors.success` (#00875A)
- **Warning**: `colors.warning` (#FF991F)
- **Danger**: `colors.danger` (#DE350B)
- **Info**: Theme color

### Backgrounds
- **Screen**: `#F5F7FA`
- **Cards**: `#FFFFFF`
- **Chip/Accent**: `#F5F7FA` with border `#E0E6ED`
- **Footer**: `#FAFBFC`

## Typography

### Headers
- **Large**: 28px, weight 700, letter-spacing 0.5
- **Medium**: 20px, weight 700
- **Small**: 16px, weight 700

### Body
- **Regular**: 14px, weight 400, line-height 20
- **Labels**: 12px, weight 600, uppercase, letter-spacing 0.5

## Shadows & Elevation

- **Cards**: elevation 3-4
- **FAB**: elevation 8
- **Filters**: elevation 2
- **Header**: elevation 8

## Migration Checklist

When updating a screen:

- [ ] Replace background with `#F5F7FA`
- [ ] Update header to modern curved style
- [ ] Add search bar to header (if applicable)
- [ ] Convert filters to pill-shaped chips
- [ ] Update stats cards with icon containers
- [ ] Redesign list/cards with header/body/footer pattern
- [ ] Add status badges with dots
- [ ] Convert detail items to chips
- [ ] Update action buttons in footer
- [ ] Add FAB if screen has "add" functionality
- [ ] Update empty states
- [ ] Ensure consistent spacing and shadows

## Examples

Fully redesigned screens:
1. **Projects** (`/supervisor/projects.tsx`) - Complete reference implementation
2. **Dashboard** (`/supervisor/index.tsx`) - Coming soon
3. **Schedule** (`/supervisor/schedule.tsx`) - Coming soon

Refer to these screens for complete examples of the design patterns in action.
