
import { Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Image, Modal, StyleSheet, Platform, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles, colors, spacing, typography, statusColors } from '../../../styles/commonStyles';
import CompanyLogo from '../../../components/CompanyLogo';
import Icon from '../../../components/Icon';
import Button from '../../../components/Button';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

interface PhotoDoc {
  id: string;
  uri: string;
  timestamp: Date;
  category: 'before' | 'after';
  description: string;
  location?: { latitude: number; longitude: number };
}

interface TaskInfo {
  id: string;
  title: string;
  location: string;
  address: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number;
  description: string;
  checklistItems: { id: string; text: string; completed: boolean }[];
  photos: PhotoDoc[];
  notes: string;
  startTime?: Date;
  endTime?: Date;
  gpsLocation?: { latitude: number; longitude: number };
}

const photoCategories = [
  { key: 'before', label: 'Before', icon: 'time', color: colors.warning },
  { key: 'after', label: 'After', icon: 'checkmark-circle', color: colors.success },
];

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log('TaskDetail rendered for task:', id);

  const [task, setTask] = useState<TaskInfo>({
    id: id || '1',
    title: 'Office Building A - Floor 3',
    location: '123 Business St, Suite 300',
    address: '123 Business St, Suite 300, New York, NY 10001',
    status: 'pending',
    priority: 'high',
    estimatedTime: 120,
    description: 'Complete cleaning of office spaces, conference rooms, and restrooms. Pay special attention to high-touch surfaces and ensure all areas meet our quality standards.',
    checklistItems: [
      { id: '1', text: 'Vacuum all carpeted areas', completed: false },
      { id: '2', text: 'Empty all trash bins and replace liners', completed: false },
      { id: '3', text: 'Clean and sanitize restrooms', completed: false },
      { id: '4', text: 'Wipe down all surfaces and desks', completed: false },
      { id: '5', text: 'Clean windows and glass surfaces', completed: false },
      { id: '6', text: 'Mop hard floor areas', completed: false },
    ],
    photos: [],
    notes: '',
  });

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDoc | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [photoDescription, setPhotoDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PhotoDoc['category']>('before');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddressClick = (address: string) => {
    console.log('Address clicked:', address);
    
    Alert.alert(
      'Get Directions',
      `Do you want to open maps and get directions to:\n\n${address}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Navigation cancelled')
        },
        {
          text: 'Open Maps',
          onPress: async () => {
            try {
              console.log('Opening maps for address:', address);
              
              // Encode the address for URL
              const encodedAddress = encodeURIComponent(address);
              
              // Try different map URLs based on platform
              let mapUrl = '';
              
              if (Platform.OS === 'ios') {
                // iOS: Try Apple Maps first, fallback to Google Maps
                mapUrl = `maps://maps.apple.com/?q=${encodedAddress}`;
                const canOpen = await Linking.canOpenURL(mapUrl);
                
                if (!canOpen) {
                  // Fallback to Google Maps on iOS
                  mapUrl = `comgooglemaps://?q=${encodedAddress}`;
                  const canOpenGoogle = await Linking.canOpenURL(mapUrl);
                  
                  if (!canOpenGoogle) {
                    // Final fallback to web Google Maps
                    mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                  }
                }
              } else if (Platform.OS === 'android') {
                // Android: Use geo: URI which opens default maps app
                mapUrl = `geo:0,0?q=${encodedAddress}`;
              } else {
                // Web: Use Google Maps web URL
                mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
              }
              
              console.log('Opening URL:', mapUrl);
              
              const supported = await Linking.canOpenURL(mapUrl);
              
              if (supported) {
                await Linking.openURL(mapUrl);
                console.log('Maps opened successfully');
              } else {
                // Final fallback to web Google Maps
                const webMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                await Linking.openURL(webMapUrl);
                console.log('Opened web maps as fallback');
              }
            } catch (error) {
              console.error('Error opening maps:', error);
              Alert.alert(
                'Error',
                'Unable to open maps. Please check if you have a maps application installed.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const startTask = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to start tasks');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setTask(prev => ({
        ...prev,
        status: 'in-progress',
        startTime: new Date(),
        gpsLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }));
      setIsTimerRunning(true);
      console.log('Task started with GPS location:', location.coords);
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  };

  const completeTask = () => {
    const completedItems = task.checklistItems.filter(item => item.completed).length;
    const totalItems = task.checklistItems.length;
    const hasAfterPhotos = task.photos.some(photo => photo.category === 'after');
    
    if (completedItems < totalItems) {
      Alert.alert(
        'Incomplete Checklist',
        `You have completed ${completedItems} of ${totalItems} checklist items. Are you sure you want to complete this task?`,
        [
          { text: 'Continue Working', style: 'cancel' },
          { text: 'Complete Anyway', onPress: finishTask },
        ]
      );
    } else if (!hasAfterPhotos) {
      Alert.alert(
        'Missing Documentation',
        'Consider adding "after" photos to document the finished work. Continue anyway?',
        [
          { text: 'Add Photos', style: 'cancel', onPress: () => setShowCategoryModal(true) },
          { text: 'Complete Anyway', onPress: finishTask },
        ]
      );
    } else {
      finishTask();
    }
  };

  const finishTask = () => {
    setTask(prev => ({
      ...prev,
      status: 'completed',
      endTime: new Date(),
    }));
    setIsTimerRunning(false);
    console.log('Task completed');
    Alert.alert('Task Completed', 'Great job! Task has been marked as completed.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const toggleChecklistItem = (itemId: string) => {
    setTask(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const takePhoto = async (category: PhotoDoc['category'] = 'before') => {
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

        setTask(prev => ({
          ...prev,
          photos: [...prev.photos, newPhoto],
        }));
        
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
            setTask(prev => ({
              ...prev,
              photos: prev.photos.filter(photo => photo.id !== photoId),
            }));
            setShowPhotoModal(false);
          }
        },
      ]
    );
  };

  const getCategoryInfo = (category: PhotoDoc['category']) => {
    return photoCategories.find(cat => cat.key === category) || photoCategories[0];
  };

  const getStatusStyle = (status: string) => {
    const statusColor = statusColors[status as keyof typeof statusColors];
    return {
      backgroundColor: statusColor?.bg || colors.backgroundAlt,
      color: statusColor?.text || colors.text,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const completedItems = task.checklistItems.filter(item => item.completed).length;
  const totalItems = task.checklistItems.length;
  const progressPercentage = (completedItems / totalItems) * 100;

  const photosByCategory = photoCategories.map(category => ({
    ...category,
    photos: task.photos.filter(photo => photo.category === category.key),
  }));

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Task Details</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Task Header */}
        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>{task.title}</Text>
            <View style={[commonStyles.statusBadge, getStatusStyle(task.status)]}>
              <Text style={[typography.small, { fontWeight: '600' }]}>
                {task.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Clickable Address */}
          <TouchableOpacity 
            style={styles.addressContainer}
            onPress={() => handleAddressClick(task.address)}
            activeOpacity={0.7}
          >
            <View style={styles.addressContent}>
              <Icon name="location" size={20} style={{ color: colors.primary, marginRight: spacing.sm }} />
              <Text style={styles.addressText}>{task.address}</Text>
            </View>
            <View style={styles.navigationButton}>
              <Icon name="navigate" size={18} style={{ color: colors.primary }} />
            </View>
          </TouchableOpacity>

          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginTop: spacing.md, marginBottom: spacing.md }]}>
            <View style={commonStyles.row}>
              <Icon name="time" size={16} style={{ color: colors.textSecondary, marginRight: spacing.sm }} />
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Est. {task.estimatedTime} min
              </Text>
            </View>
            <View style={[commonStyles.badge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
              <Text style={[typography.small, { color: getPriorityColor(task.priority), fontWeight: '600' }]}>
                {task.priority.toUpperCase()} PRIORITY
              </Text>
            </View>
          </View>

          <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md }]}>
            {task.description}
          </Text>

          {/* Timer */}
          {task.status === 'in-progress' && (
            <View style={[{ backgroundColor: colors.backgroundAlt, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md }]}>
              <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                <Text style={[typography.body, { color: colors.text }]}>Time Elapsed</Text>
                <Text style={[typography.h3, { color: colors.primary }]}>{formatTime(elapsedTime)}</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          {task.status === 'pending' && (
            <Button text="Start Task" onPress={startTask} style={{ backgroundColor: colors.success }} />
          )}
          
          {task.status === 'in-progress' && (
            <Button text="Complete Task" onPress={completeTask} style={{ backgroundColor: colors.primary }} />
          )}
        </View>

        {/* Progress */}
        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
            <Text style={[typography.h3, { color: colors.text }]}>Progress</Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {completedItems}/{totalItems} completed
            </Text>
          </View>
          
          <View style={{ backgroundColor: colors.backgroundAlt, height: 8, borderRadius: 4, marginBottom: spacing.md }}>
            <View 
              style={{ 
                backgroundColor: colors.success, 
                height: 8, 
                borderRadius: 4, 
                width: `${progressPercentage}%` 
              }} 
            />
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {progressPercentage.toFixed(0)}% complete
          </Text>
        </View>

        {/* Checklist */}
        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Checklist</Text>
          
          {task.checklistItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                commonStyles.row,
                { 
                  paddingVertical: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }
              ]}
              onPress={() => toggleChecklistItem(item.id)}
              disabled={task.status === 'completed'}
            >
              <View style={[
                {
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: item.completed ? colors.success : colors.border,
                  backgroundColor: item.completed ? colors.success : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }
              ]}>
                {item.completed && (
                  <Icon name="checkmark" size={16} style={{ color: colors.background }} />
                )}
              </View>
              <Text style={[
                typography.body,
                { 
                  color: item.completed ? colors.textSecondary : colors.text,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                  flex: 1,
                }
              ]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Documentation */}
        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <Text style={[typography.h3, { color: colors.text }]}>Photo Documentation</Text>
            {task.status !== 'completed' && (
              <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                <Icon name="camera" size={24} style={{ color: colors.primary }} />
              </TouchableOpacity>
            )}
          </View>

          {task.photos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Icon name="camera" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.sm }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No photos yet
              </Text>
              {task.status !== 'completed' && (
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
        </View>

        {/* Notes */}
        <View style={[commonStyles.card, { marginBottom: spacing.xxl }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Notes</Text>
          <TextInput
            style={[
              commonStyles.textInput,
              { 
                height: 100,
                textAlignVertical: 'top',
                backgroundColor: task.status === 'completed' ? colors.backgroundAlt : colors.background,
              }
            ]}
            placeholder="Add notes about this task..."
            placeholderTextColor={colors.textSecondary}
            value={task.notes}
            onChangeText={(text) => setTask(prev => ({ ...prev, notes: text }))}
            multiline
            editable={task.status !== 'completed'}
          />
        </View>
      </ScrollView>

      {/* Photo Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowCategoryModal(false)}
          />
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
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowPhotoModal(false)}
          />
          <View style={styles.photoModalContent}>
            <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Icon name="close" size={24} style={{ color: colors.background }} />
              </TouchableOpacity>
              {task.status !== 'completed' && selectedPhoto && (
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  navigationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
    ...(Platform.OS === 'web' && {
      borderRadius: 16,
      width: '90%',
      maxWidth: 500,
      zIndex: 10000,
      position: 'relative' as any,
    }),
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
  photoInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: 8,
  },
});
