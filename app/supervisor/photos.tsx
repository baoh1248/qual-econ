
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, StyleSheet, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../../components/Icon';

interface PhotoDoc {
  id: string;
  uri: string;
  timestamp: Date;
  category: 'before' | 'during' | 'after' | 'issue' | 'completion';
  description: string;
  taskId: string;
  taskTitle: string;
  cleanerName: string;
  location?: { latitude: number; longitude: number };
}

const photoCategories = [
  { key: 'all', label: 'All Photos', icon: 'images', color: colors.text },
  { key: 'before', label: 'Before', icon: 'time', color: colors.warning },
  { key: 'during', label: 'Progress', icon: 'build', color: colors.primary },
  { key: 'after', label: 'After', icon: 'checkmark-circle', color: colors.success },
  { key: 'issue', label: 'Issues', icon: 'warning', color: colors.danger },
  { key: 'completion', label: 'Completed', icon: 'star', color: colors.success },
];

export default function PhotoGallery() {
  const [photos, setPhotos] = useState<PhotoDoc[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDoc | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Mock data - in real app, this would come from your data store
    const mockPhotos: PhotoDoc[] = [
      {
        id: '1',
        uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
        timestamp: new Date('2024-01-15T09:30:00'),
        category: 'before',
        description: 'Office space before cleaning',
        taskId: '1',
        taskTitle: 'Office Building A - Floor 3',
        cleanerName: 'Sarah Johnson',
        location: { latitude: 40.7128, longitude: -74.0060 },
      },
      {
        id: '2',
        uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
        timestamp: new Date('2024-01-15T10:15:00'),
        category: 'during',
        description: 'Cleaning in progress - conference room',
        taskId: '1',
        taskTitle: 'Office Building A - Floor 3',
        cleanerName: 'Sarah Johnson',
      },
      {
        id: '3',
        uri: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400',
        timestamp: new Date('2024-01-15T11:45:00'),
        category: 'after',
        description: 'Completed office cleaning',
        taskId: '1',
        taskTitle: 'Office Building A - Floor 3',
        cleanerName: 'Sarah Johnson',
      },
      {
        id: '4',
        uri: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
        timestamp: new Date('2024-01-15T14:20:00'),
        category: 'issue',
        description: 'Water damage found in storage room',
        taskId: '2',
        taskTitle: 'Retail Store B - Main Floor',
        cleanerName: 'Mike Chen',
      },
      {
        id: '5',
        uri: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
        timestamp: new Date('2024-01-15T16:30:00'),
        category: 'completion',
        description: 'Medical office deep clean completed',
        taskId: '3',
        taskTitle: 'Medical Office C - All Areas',
        cleanerName: 'Lisa Rodriguez',
      },
    ];
    
    setPhotos(mockPhotos);
    setFilteredPhotos(mockPhotos);
  }, []);

  useEffect(() => {
    let filtered = photos;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(photo => photo.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(photo => 
        photo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.cleanerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPhotos(filtered);
  }, [photos, selectedCategory, searchQuery]);

  const getCategoryInfo = (category: string) => {
    return photoCategories.find(cat => cat.key === category) || photoCategories[0];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupedPhotos = filteredPhotos.reduce((groups, photo) => {
    const date = photo.timestamp.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(photo);
    return groups;
  }, {} as Record<string, PhotoDoc[]>);

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <Text style={[commonStyles.headerTitle, { flex: 1, textAlign: 'center' }]}>Photo Gallery</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={commonStyles.content}>
        {/* Search Bar */}
        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
            <Icon name="search" size={20} style={{ color: colors.textSecondary, marginRight: spacing.sm }} />
            <TextInput
              style={[typography.body, { color: colors.text, flex: 1 }]}
              placeholder="Search photos, tasks, or cleaners..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.md }}
        >
          <View style={[commonStyles.row, { gap: spacing.sm, paddingHorizontal: spacing.md }]}>
            {photoCategories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  commonStyles.badge,
                  {
                    backgroundColor: selectedCategory === category.key ? category.color + '20' : colors.backgroundAlt,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  }
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <View style={[commonStyles.row]}>
                  <Icon 
                    name={category.icon} 
                    size={16} 
                    style={{ 
                      color: selectedCategory === category.key ? category.color : colors.textSecondary,
                      marginRight: spacing.xs 
                    }} 
                  />
                  <Text style={[
                    typography.small,
                    { 
                      color: selectedCategory === category.key ? category.color : colors.textSecondary,
                      fontWeight: selectedCategory === category.key ? '600' : 'normal',
                    }
                  ]}>
                    {category.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Photos Grid */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.keys(groupedPhotos).length === 0 ? (
            <View style={[commonStyles.card, { alignItems: 'center', paddingVertical: spacing.xxl }]}>
              <Icon name="images" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No photos found
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                Try adjusting your search or filter criteria
              </Text>
            </View>
          ) : (
            Object.entries(groupedPhotos).map(([date, dayPhotos]) => (
              <View key={date} style={[commonStyles.card, { marginBottom: spacing.md }]}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                
                <View style={styles.photoGrid}>
                  {dayPhotos.map(photo => {
                    const categoryInfo = getCategoryInfo(photo.category);
                    return (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.photoItem}
                        onPress={() => {
                          setSelectedPhoto(photo);
                          setShowPhotoModal(true);
                        }}
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoThumbnail}
                          resizeMode="cover"
                        />
                        
                        {/* Category Badge */}
                        <View style={[
                          styles.categoryBadge,
                          { backgroundColor: categoryInfo.color }
                        ]}>
                          <Icon name={categoryInfo.icon} size={12} style={{ color: colors.background }} />
                        </View>
                        
                        {/* Photo Info */}
                        <View style={styles.photoInfo}>
                          <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                            {photo.cleanerName}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                            {photo.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Photo Detail Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }} 
            activeOpacity={1} 
            onPress={() => setShowPhotoModal(false)}
          />
          <View style={styles.photoModalContent}>
            <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Icon name="close" size={24} style={{ color: colors.background }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (selectedPhoto) {
                  router.push(`/supervisor/task/${selectedPhoto.taskId}`);
                  setShowPhotoModal(false);
                }
              }}>
                <Icon name="open" size={24} style={{ color: colors.background }} />
              </TouchableOpacity>
            </View>

            {selectedPhoto && (
              <>
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                />
                
                <View style={styles.photoDetailInfo}>
                  <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                    <Icon 
                      name={getCategoryInfo(selectedPhoto.category).icon} 
                      size={16} 
                      style={{ color: getCategoryInfo(selectedPhoto.category).color, marginRight: spacing.sm }} 
                    />
                    <Text style={[typography.body, { color: colors.background, fontWeight: '600' }]}>
                      {getCategoryInfo(selectedPhoto.category).label}
                    </Text>
                  </View>
                  
                  <Text style={[typography.body, { color: colors.background, marginBottom: spacing.sm }]}>
                    {selectedPhoto.description}
                  </Text>
                  
                  <Text style={[typography.caption, { color: colors.background + '80', marginBottom: spacing.xs }]}>
                    Task: {selectedPhoto.taskTitle}
                  </Text>
                  
                  <Text style={[typography.caption, { color: colors.background + '80', marginBottom: spacing.xs }]}>
                    Cleaner: {selectedPhoto.cleanerName}
                  </Text>
                  
                  <Text style={[typography.caption, { color: colors.background + '80' }]}>
                    {formatDate(selectedPhoto.timestamp)}
                  </Text>

                  {selectedPhoto.location && (
                    <Text style={[typography.caption, { color: colors.background + '80' }]}>
                      GPS: {selectedPhoto.location.latitude.toFixed(6)}, {selectedPhoto.location.longitude.toFixed(6)}
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '80%',
    borderRadius: 8,
  },
  categoryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.xs,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  photoModalContent: {
    flex: 1,
    width: '100%',
    padding: spacing.lg,
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  fullPhoto: {
    flex: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
  photoDetailInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: 8,
  },
});
