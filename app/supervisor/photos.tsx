
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import { useToast } from '../../hooks/useToast';
import Icon from '../../components/Icon';
import AnimatedCard from '../../components/AnimatedCard';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PhotoDoc {
  id: string;
  uri: string;
  timestamp: Date;
  category: 'before' | 'during' | 'after' | 'issue' | 'completion';
  description: string;
  location?: { latitude: number; longitude: number };
  cleanerName: string;
  clientName: string;
  buildingName: string;
  taskId?: string;
}

interface PhotoStats {
  totalPhotos: number;
  todayPhotos: number;
  weekPhotos: number;
  byCategory: {
    before: number;
    during: number;
    after: number;
    issue: number;
    completion: number;
  };
  byStatus: {
    pending: number;
    approved: number;
    flagged: number;
  };
}

export default function PhotosScreen() {
  console.log('PhotosScreen rendered');
  
  const { toast, showToast, hideToast } = useToast();
  
  const [photos, setPhotos] = useState<PhotoDoc[]>([]);
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | PhotoDoc['category']>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDoc | null>(null);

  // Mock data initialization
  useEffect(() => {
    const initializePhotos = () => {
      const mockPhotos: PhotoDoc[] = [
        {
          id: '1',
          uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
          timestamp: new Date(),
          category: 'before',
          description: 'Office area before cleaning',
          cleanerName: 'John Doe',
          clientName: 'TechCorp Inc.',
          buildingName: 'Main Office',
          taskId: 'task-1'
        },
        {
          id: '2',
          uri: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          category: 'after',
          description: 'Office area after cleaning',
          cleanerName: 'John Doe',
          clientName: 'TechCorp Inc.',
          buildingName: 'Main Office',
          taskId: 'task-1'
        },
        {
          id: '3',
          uri: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          category: 'issue',
          description: 'Water damage found in restroom',
          cleanerName: 'Jane Smith',
          clientName: 'MedCenter Hospital',
          buildingName: 'Emergency Wing'
        },
        {
          id: '4',
          uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          category: 'completion',
          description: 'All tasks completed successfully',
          cleanerName: 'Mike Johnson',
          clientName: 'Downtown Mall',
          buildingName: 'Food Court'
        },
        {
          id: '5',
          uri: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          category: 'during',
          description: 'Deep cleaning in progress',
          cleanerName: 'John Doe',
          clientName: 'TechCorp Inc.',
          buildingName: 'Warehouse'
        }
      ];

      const mockStats: PhotoStats = {
        totalPhotos: mockPhotos.length,
        todayPhotos: mockPhotos.filter(p => 
          new Date(p.timestamp).toDateString() === new Date().toDateString()
        ).length,
        weekPhotos: mockPhotos.filter(p => {
          const photoDate = new Date(p.timestamp);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return photoDate >= weekAgo;
        }).length,
        byCategory: {
          before: mockPhotos.filter(p => p.category === 'before').length,
          during: mockPhotos.filter(p => p.category === 'during').length,
          after: mockPhotos.filter(p => p.category === 'after').length,
          issue: mockPhotos.filter(p => p.category === 'issue').length,
          completion: mockPhotos.filter(p => p.category === 'completion').length,
        },
        byStatus: {
          pending: Math.floor(mockPhotos.length * 0.3),
          approved: Math.floor(mockPhotos.length * 0.6),
          flagged: Math.floor(mockPhotos.length * 0.1),
        }
      };

      setPhotos(mockPhotos);
      setStats(mockStats);
      setLoading(false);
    };

    // Simulate loading delay
    setTimeout(initializePhotos, 1000);
  }, []);

  const getCategoryIcon = (category: PhotoDoc['category']) => {
    switch (category) {
      case 'before': return 'camera-outline';
      case 'during': return 'time-outline';
      case 'after': return 'checkmark-circle-outline';
      case 'issue': return 'warning-outline';
      case 'completion': return 'trophy-outline';
      default: return 'image-outline';
    }
  };

  const getCategoryColor = (category: PhotoDoc['category']) => {
    switch (category) {
      case 'before': return colors.primary;
      case 'during': return colors.warning;
      case 'after': return colors.success;
      case 'issue': return colors.danger;
      case 'completion': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const filteredPhotos = selectedCategory === 'all' 
    ? photos 
    : photos.filter(photo => photo.category === selectedCategory);

  const handlePhotoPress = (photo: PhotoDoc) => {
    setSelectedPhoto(photo);
  };

  const handleApprovePhoto = (photoId: string) => {
    Alert.alert(
      'Approve Photo',
      'Mark this photo as approved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            showToast('Photo approved', 'success');
          }
        }
      ]
    );
  };

  const handleFlagPhoto = (photoId: string) => {
    Alert.alert(
      'Flag Photo',
      'Flag this photo for review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flag',
          style: 'destructive',
          onPress: () => {
            showToast('Photo flagged for review', 'warning');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading photos...
        </Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <Toast {...toast} onHide={hideToast} />
      
      {/* Header */}
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Photo Documentation</Text>
        </View>
        <TouchableOpacity onPress={() => showToast('Export coming soon', 'info')}>
          <Icon name="download" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        {stats && (
          <AnimatedCard index={0}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
                <Text style={styles.statLabel}>Total Photos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.success }]}>{stats.todayPhotos}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.weekPhotos}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.byStatus.pending}</Text>
                <Text style={styles.statLabel}>Pending Review</Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* Category Filter */}
        <AnimatedCard index={1}>
          <Text style={styles.sectionTitle}>Filter by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
            <TouchableOpacity
              style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <Icon name="grid" size={16} style={{ color: selectedCategory === 'all' ? colors.background : colors.textSecondary }} />
              <Text style={[styles.categoryButtonText, selectedCategory === 'all' && styles.categoryButtonTextActive]}>
                All ({photos.length})
              </Text>
            </TouchableOpacity>
            
            {(['before', 'during', 'after', 'issue', 'completion'] as PhotoDoc['category'][]).map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Icon 
                  name={getCategoryIcon(category)} 
                  size={16} 
                  style={{ color: selectedCategory === category ? colors.background : getCategoryColor(category) }} 
                />
                <Text style={[
                  styles.categoryButtonText, 
                  selectedCategory === category && styles.categoryButtonTextActive,
                  { color: selectedCategory === category ? colors.background : getCategoryColor(category) }
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({stats?.byCategory[category] || 0})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AnimatedCard>

        {/* Photos Grid */}
        <AnimatedCard index={2}>
          <View style={styles.photosHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'All Photos' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Photos`}
            </Text>
            <Text style={styles.photosCount}>
              {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {filteredPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="image-outline" size={48} style={{ color: colors.textSecondary }} />
              <Text style={styles.emptyStateTitle}>No photos found</Text>
              <Text style={styles.emptyStateText}>
                {selectedCategory === 'all' 
                  ? 'No photos have been uploaded yet'
                  : `No ${selectedCategory} photos available`
                }
              </Text>
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {filteredPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoCard}
                  onPress={() => handlePhotoPress(photo)}
                >
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <View style={styles.photoOverlay}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(photo.category) }]}>
                      <Icon 
                        name={getCategoryIcon(photo.category)} 
                        size={12} 
                        style={{ color: colors.background }} 
                      />
                      <Text style={styles.categoryBadgeText}>
                        {photo.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoDescription} numberOfLines={2}>
                      {photo.description}
                    </Text>
                    <Text style={styles.photoMeta}>
                      {photo.cleanerName} • {photo.buildingName}
                    </Text>
                    <Text style={styles.photoTime}>
                      {photo.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </AnimatedCard>
      </ScrollView>

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo Details</Text>
              <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                <Icon name="close" size={24} style={{ color: colors.text }} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} />
              
              <View style={styles.modalContent}>
                <View style={styles.modalInfoRow}>
                  <Icon name="person" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.modalInfoText}>Cleaner: {selectedPhoto.cleanerName}</Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <Icon name="business" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.modalInfoText}>
                    {selectedPhoto.clientName} - {selectedPhoto.buildingName}
                  </Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <Icon name={getCategoryIcon(selectedPhoto.category)} size={16} style={{ color: getCategoryColor(selectedPhoto.category) }} />
                  <Text style={styles.modalInfoText}>
                    Category: {selectedPhoto.category.charAt(0).toUpperCase() + selectedPhoto.category.slice(1)}
                  </Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <Icon name="time" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.modalInfoText}>
                    {selectedPhoto.timestamp.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.modalDescription}>
                  <Text style={styles.modalDescriptionTitle}>Description</Text>
                  <Text style={styles.modalDescriptionText}>{selectedPhoto.description}</Text>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, { backgroundColor: colors.success }]}
                    onPress={() => {
                      handleApprovePhoto(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                  >
                    <Icon name="checkmark" size={16} style={{ color: colors.background }} />
                    <Text style={styles.modalActionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalActionButton, { backgroundColor: colors.danger }]}
                    onPress={() => {
                      handleFlagPhoto(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                  >
                    <Icon name="flag" size={16} style={{ color: colors.background }} />
                    <Text style={styles.modalActionButtonText}>Flag</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  categoryFilter: {
    flexDirection: 'row',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photosCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  photoImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border,
  },
  photoOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  categoryBadgeText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 8,
  },
  photoInfo: {
    padding: spacing.sm,
  },
  photoDescription: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  photoMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  photoTime: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 16,
    maxHeight: '80%',
    ...commonStyles.shadow,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  modalImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  modalInfoText: {
    ...typography.body,
    color: colors.text,
  },
  modalDescription: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalDescriptionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalDescriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  modalActionButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});
