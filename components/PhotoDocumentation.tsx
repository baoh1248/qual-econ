
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export interface PhotoDoc {
  id: string;
  uri: string;
  timestamp: Date;
  category: 'before' | 'during' | 'after' | 'issue' | 'completion';
  description: string;
  location?: { latitude: number; longitude: number };
}

interface PhotoDocumentationProps {
  photos: PhotoDoc[];
  onAddPhoto: (photo: PhotoDoc) => void;
  onDeletePhoto: (photoId: string) => void;
  editable?: boolean;
}

const photoCategories = [
  { key: 'before', label: 'Before', icon: 'time', color: colors.warning },
  { key: 'during', label: 'Progress', icon: 'build', color: colors.primary },
  { key: 'after', label: 'After', icon: 'checkmark-circle', color: colors.success },
  { key: 'issue', label: 'Issue', icon: 'warning', color: colors.danger },
  { key: 'completion', label: 'Complete', icon: 'star', color: colors.success },
];

export default function PhotoDocumentation({ 
  photos, 
  onAddPhoto, 
  onDeletePhoto, 
  editable = true 
}: PhotoDocumentationProps) {
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDoc | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [photoDescription, setPhotoDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PhotoDoc['category']>('during');

  const takePhoto = async (category: PhotoDoc['category'] = 'during') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const location = await Location.getCurrentPositionAsync({}).catch(() => null);
        
        const newPhoto: PhotoDoc = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          timestamp: new Date(),
          category,
          description: photoDescription || `${category} photo`,
          location: location ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          } : undefined,
        };

        onAddPhoto(newPhoto);
        setPhotoDescription('');
        setShowCategoryModal(false);
        console.log('Photo added:', newPhoto);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const deletePhoto = (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDeletePhoto(photoId);
            setShowPhotoModal(false);
          }
        },
      ]
    );
  };

  const getCategoryInfo = (category: PhotoDoc['category']) => {
    return photoCategories.find(cat => cat.key === category) || photoCategories[1];
  };

  const photosByCategory = photoCategories.map(category => ({
    ...category,
    photos: photos.filter(photo => photo.category === category.key),
  }));

  return (
    <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
      <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
        <Text style={[typography.h3, { color: colors.text }]}>Photo Documentation</Text>
        {editable && (
          <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
            <Icon name="camera" size={24} style={{ color: colors.primary }} />
          </TouchableOpacity>
        )}
      </View>

      {photos.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Icon name="camera" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.sm }} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            No photos yet
          </Text>
          {editable && (
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              Tap the camera icon to add photos
            </Text>
          )}
        </View>
      ) : (
        <View>
          {photosByCategory.map(category => (
            category.photos.length > 0 && (
              <View key={category.key} style={{ marginBottom: spacing.md }}>
                <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                  <Icon name={category.icon} size={16} style={{ color: category.color, marginRight: spacing.sm }} />
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {category.label} ({category.photos.length})
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[commonStyles.row, { gap: spacing.sm }]}>
                    {category.photos.map((photo) => (
                      <TouchableOpacity
                        key={photo.id}
                        onPress={() => {
                          setSelectedPhoto(photo);
                          setShowPhotoModal(true);
                        }}
                      >
                        <View style={{ position: 'relative' }}>
                          <Image
                            source={{ uri: photo.uri }}
                            style={{ width: 100, height: 100, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                          <View style={[
                            {
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: category.color,
                              borderRadius: 12,
                              width: 24,
                              height: 24,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }
                          ]}>
                            <Icon name={category.icon} size={12} style={{ color: colors.background }} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )
          ))}
        </View>
      )}

      {/* Photo Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.lg }]}>
              <Text style={[typography.h3, { color: colors.text }]}>Add Photo</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Icon name="close" size={24} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
            </View>

            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
              Select photo category:
            </Text>

            {photoCategories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  commonStyles.row,
                  {
                    padding: spacing.md,
                    borderRadius: 8,
                    backgroundColor: selectedCategory === category.key ? category.color + '20' : colors.backgroundAlt,
                    marginBottom: spacing.sm,
                  }
                ]}
                onPress={() => setSelectedCategory(category.key as PhotoDoc['category'])}
              >
                <Icon name={category.icon} size={20} style={{ color: category.color, marginRight: spacing.md }} />
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{category.label}</Text>
                {selectedCategory === category.key && (
                  <Icon name="checkmark" size={20} style={{ color: category.color }} />
                )}
              </TouchableOpacity>
            ))}

            <TextInput
              style={[commonStyles.textInput, { marginTop: spacing.md, marginBottom: spacing.lg }]}
              placeholder="Add description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={photoDescription}
              onChangeText={setPhotoDescription}
            />

            <Button
              text="Take Photo"
              onPress={() => takePhoto(selectedCategory)}
              style={{ backgroundColor: colors.primary }}
            />
          </View>
        </View>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Icon name="close" size={24} style={{ color: colors.background }} />
              </TouchableOpacity>
              {editable && selectedPhoto && (
                <TouchableOpacity onPress={() => deletePhoto(selectedPhoto.id)}>
                  <Icon name="trash" size={24} style={{ color: colors.danger }} />
                </TouchableOpacity>
              )}
            </View>

            {selectedPhoto && (
              <>
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                />
                
                <View style={styles.photoInfo}>
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
                  
                  <Text style={[typography.caption, { color: colors.background + '80' }]}>
                    {selectedPhoto.timestamp.toLocaleString()}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    flex: 1,
    width: '100%',
    padding: spacing.lg,
  },
  fullPhoto: {
    flex: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
  photoInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: 8,
  },
});
