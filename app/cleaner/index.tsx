
import { commonStyles, colors, spacing, typography, statusColors } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Alert, RefreshControl, StyleSheet, Animated, Linking, Modal } from 'react-native';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { router } from 'expo-router';
import AnimatedCard from '../../components/AnimatedCard';
import ProgressRing from '../../components/ProgressRing';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useScheduleStorage } from '../../hooks/useScheduleStorage';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { supabase } from '../integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  location: string;
  address?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number;
  description: string;
  checklistItems: string[];
  photos: number;
  photoCategories: {
    before: number;
    during: number;
    after: number;
    issue: number;
    completion: number;
  };
}

interface Shift {
  id: string;
  clientName: string;
  buildingName: string;
  address: string;
  day: string;
  date: string;
  startTime: string;
  endTime?: string;
  hours: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
}

interface CleanerProfile {
  id: string;
  name: string;
  currentLocation: string;
  todayHours: number;
  todayTasks: number;
  todayPhotos: number;
  weeklyPhotos: number;
  efficiency: number;
}

export default function CleanerDashboard() {
  console.log('CleanerDashboard rendered');
  
  const { toast, showToast, hideToast } = useToast();
  const { getWeekSchedule, getCurrentWeekId, getWeekIdFromDate } = useScheduleStorage();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [profile, setProfile] = useState<CleanerProfile>({
    id: '',
    name: 'Loading...',
    currentLocation: 'Office Building A',
    todayHours: 0,
    todayTasks: 0,
    todayPhotos: 0,
    weeklyPhotos: 0,
    efficiency: 0,
  });

  // Set up real-time synchronization for this cleaner
  const { isConnected, lastSyncTime, manualSync } = useRealtimeSync({
    enabled: true,
    cleanerName: profile.name,
    onSyncComplete: () => {
      console.log('Real-time sync completed');
      loadShifts();
    },
    onError: (error) => {
      console.error('Real-time sync error:', error);
      showToast('Sync error occurred', 'error');
    },
  });

  const [allTasks, setAllTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Office Building A - Floor 3',
      location: '123 Business St, Suite 300',
      address: '123 Business St, Suite 300, New York, NY 10001',
      status: 'pending',
      priority: 'high',
      estimatedTime: 120,
      description: 'Complete cleaning of office spaces and conference rooms',
      checklistItems: ['Vacuum', 'Empty trash', 'Clean restrooms', 'Wipe surfaces'],
      photos: 0,
      photoCategories: { before: 0, during: 0, after: 0, issue: 0, completion: 0 },
    },
    {
      id: '2',
      title: 'Retail Store B - Main Floor',
      location: '456 Shopping Ave',
      address: '456 Shopping Ave, New York, NY 10002',
      status: 'in-progress',
      priority: 'medium',
      estimatedTime: 90,
      description: 'Daily cleaning routine for retail space',
      checklistItems: ['Sweep floors', 'Clean windows', 'Sanitize surfaces'],
      photos: 8,
      photoCategories: { before: 2, during: 4, after: 0, issue: 1, completion: 1 },
    },
    {
      id: '3',
      title: 'Medical Office C - All Areas',
      location: '789 Health Blvd',
      address: '789 Health Blvd, New York, NY 10003',
      status: 'completed',
      priority: 'high',
      estimatedTime: 150,
      description: 'Deep cleaning with medical-grade sanitization',
      checklistItems: ['Disinfect all surfaces', 'Clean equipment', 'Waste disposal'],
      photos: 15,
      photoCategories: { before: 3, during: 5, after: 4, issue: 0, completion: 3 },
    },
    {
      id: '4',
      title: 'Restaurant D - Kitchen & Dining',
      location: '321 Food Street',
      address: '321 Food Street, New York, NY 10004',
      status: 'overdue',
      priority: 'high',
      estimatedTime: 180,
      description: 'Complete restaurant cleaning including kitchen deep clean',
      checklistItems: ['Kitchen equipment', 'Dining area', 'Restrooms', 'Storage'],
      photos: 0,
      photoCategories: { before: 0, during: 0, after: 0, issue: 0, completion: 0 },
    },
  ]);

  // Load cleaner profile from database
  const loadProfile = async () => {
    try {
      console.log('Loading cleaner profile...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        showToast('Please sign in to continue', 'error');
        router.replace('/auth/cleaner-signin');
        return;
      }

      console.log('Current user ID:', user.id);

      // Fetch cleaner profile
      const { data: cleanerData, error: cleanerError } = await supabase
        .from('cleaners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (cleanerError || !cleanerData) {
        console.error('Error loading cleaner profile:', cleanerError);
        showToast('Profile not found. Please contact your supervisor.', 'error');
        return;
      }

      console.log('Cleaner profile loaded:', cleanerData.name);

      // Update profile state
      setProfile(prev => ({
        ...prev,
        id: cleanerData.id,
        name: cleanerData.name,
        currentLocation: 'Office Building A', // TODO: Get from actual location
      }));

    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    }
  };

  // Load shifts from database
  const loadShifts = async () => {
    try {
      console.log('Loading shifts for cleaner:', profile.name);
      
      if (!profile.name || profile.name === 'Loading...') {
        console.log('Profile not loaded yet, skipping shift load');
        return;
      }
      
      const currentWeekId = getCurrentWeekId();
      const weekSchedule = getWeekSchedule(currentWeekId);
      
      // Filter shifts for this cleaner
      const cleanerShifts = weekSchedule.filter(entry => {
        const cleaners = entry.cleanerNames || [entry.cleanerName];
        return cleaners.includes(profile.name);
      });

      console.log('Found shifts for cleaner:', cleanerShifts.length);

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Separate today's shifts and upcoming shifts
      const todayShiftsList: Shift[] = [];
      const upcomingShiftsList: Shift[] = [];

      cleanerShifts.forEach(entry => {
        const shiftDate = new Date(entry.date);
        shiftDate.setHours(0, 0, 0, 0);
        const shiftDateStr = shiftDate.toISOString().split('T')[0];

        const shift: Shift = {
          id: entry.id,
          clientName: entry.clientName,
          buildingName: entry.buildingName,
          address: '123 Business St, Suite 300', // TODO: Get from client_buildings table
          day: entry.day,
          date: entry.date,
          startTime: entry.startTime || '09:00',
          endTime: entry.endTime,
          hours: entry.hours,
          status: entry.status,
          priority: entry.priority,
        };

        if (shiftDateStr === todayStr) {
          todayShiftsList.push(shift);
        } else if (shiftDate > today) {
          upcomingShiftsList.push(shift);
        }
      });

      // Sort by start time
      todayShiftsList.sort((a, b) => a.startTime.localeCompare(b.startTime));
      upcomingShiftsList.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      setTodayShifts(todayShiftsList);
      setUpcomingShifts(upcomingShiftsList.slice(0, 5)); // Show next 5 upcoming shifts

      // Filter today's tasks (tasks that are not completed)
      const todayTasksList = allTasks.filter(task => task.status !== 'completed');
      setTodayTasks(todayTasksList);

      console.log('Today shifts:', todayShiftsList.length);
      console.log('Today tasks:', todayTasksList.length);
      console.log('Upcoming shifts:', upcomingShiftsList.length);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

  useEffect(() => {
    // Load profile first, then shifts
    const initializeDashboard = async () => {
      await loadProfile();
      setLoading(false);
    };

    initializeDashboard();
  }, []);

  // Load shifts when profile is loaded
  useEffect(() => {
    if (profile.name && profile.name !== 'Loading...') {
      loadShifts();
    }
  }, [profile.name]);

  const onRefresh = async () => {
    console.log('Refreshing dashboard data');
    setRefreshing(true);
    
    // Trigger manual sync from Supabase
    await manualSync();
    await loadProfile();
    await loadShifts();
    
    setRefreshing(false);
    showToast('Dashboard updated', 'success');
  };

  const handleLogoutPress = () => {
    console.log('Logout button pressed');
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    console.log('Logout confirmed');
    setIsLoggingOut(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        showToast('Failed to log out', 'error');
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        return;
      }

      console.log('Logout successful');
      showToast('Logged out successfully', 'success');
      
      // Navigate to signin screen
      router.replace('/auth/cleaner-signin');
    } catch (error: any) {
      console.error('Unexpected logout error:', error);
      showToast(error?.message || 'An unexpected error occurred', 'error');
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    console.log('Logout cancelled');
    setShowLogoutModal(false);
  };

  const handleTaskPress = (taskId: string) => {
    console.log('Task pressed:', taskId);
    router.push(`/cleaner/task/${taskId}`);
  };

  const handleShiftPress = (shift: Shift) => {
    console.log('Shift pressed:', shift.id);
    // Navigate to shift details (can be implemented later)
    showToast(`Shift at ${shift.buildingName}`, 'info');
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Emergency Alert',
      'This will send an immediate alert to your supervisor and emergency contacts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Alert', 
          style: 'destructive',
          onPress: () => {
            console.log('Emergency alert sent');
            showToast('Emergency alert sent to supervisor', 'warning');
          }
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusStyle = (status: string) => {
    const statusColor = statusColors[status as keyof typeof statusColors];
    return {
      backgroundColor: statusColor?.bg || colors.backgroundAlt,
      color: statusColor?.text || colors.text,
    };
  };

  const getPhotoCompletionScore = (task: Task) => {
    const total = Object.values(task.photoCategories).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;
    
    // Score based on having photos in different categories
    const categories = Object.entries(task.photoCategories).filter(([_, count]) => count > 0).length;
    return Math.min(100, (categories / 5) * 100);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);

    if (shiftDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (shiftDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const pendingTasks = allTasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = allTasks.filter(task => task.status === 'in-progress').length;
  const completedTasks = allTasks.filter(task => task.status === 'completed').length;
  const overdueTasks = allTasks.filter(task => task.status === 'overdue').length;

  const completionRate = allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0;

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ProgressRing progress={100} showText={false} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <Toast {...toast} onHide={hideToast} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <CompanyLogo size="small" showText={false} variant="light" style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              Welcome back, {profile.name}
            </Text>
            <View style={styles.locationRow}>
              <Icon name="location" size={14} style={{ color: colors.background + 'CC', marginRight: spacing.xs }} />
              <Text style={styles.headerSubtitle}>
                {profile.currentLocation}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {/* Logout button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogoutPress}
              activeOpacity={0.7}
            >
              <Icon name="log-out" size={18} style={{ color: colors.background }} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleLogoutCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Icon name="log-out" size={48} style={{ color: colors.danger }} />
            </View>
            
            <Text style={styles.modalTitle}>Confirm Log Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out? You will need to sign in again to access your dashboard.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleLogoutCancel}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogoutConfirm}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                {isLoggingOut ? (
                  <Text style={styles.modalButtonTextConfirm}>Logging Out...</Text>
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        style={commonStyles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Shift Section - Combined Shifts and Tasks */}
        <AnimatedCard index={0} style={styles.shiftsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today&apos;s Shift</Text>
            <View style={styles.shiftCountBadge}>
              <Text style={styles.shiftCountText}>{todayShifts.length + todayTasks.length}</Text>
            </View>
          </View>

          {todayShifts.length === 0 && todayTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="calendar" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.sm }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No shifts or tasks scheduled for today
              </Text>
            </View>
          ) : (
            <>
              {/* Today's Shifts */}
              {todayShifts.map((shift, index) => (
                <TouchableOpacity
                  key={shift.id}
                  style={styles.shiftCard}
                  onPress={() => handleShiftPress(shift)}
                  activeOpacity={0.7}
                >
                  <View style={styles.shiftCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftTitle} numberOfLines={1}>
                        {shift.clientName}
                      </Text>
                      <Text style={styles.shiftSubtitle} numberOfLines={1}>
                        {shift.buildingName}
                      </Text>
                    </View>
                    <View style={[styles.shiftStatusBadge, getStatusStyle(shift.status)]}>
                      <Text style={[styles.shiftStatusText, { color: getStatusStyle(shift.status).color }]}>
                        {shift.status.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.shiftMetaRow}>
                    <View style={styles.shiftMetaItem}>
                      <Icon name="time" size={16} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                      <Text style={styles.shiftMetaText}>
                        {shift.startTime} {shift.endTime ? `- ${shift.endTime}` : `(${shift.hours}h)`}
                      </Text>
                    </View>
                    
                    {shift.priority && (
                      <View style={[styles.shiftPriorityBadge, { backgroundColor: getPriorityColor(shift.priority) + '20' }]}>
                        <View style={[styles.shiftPriorityDot, { backgroundColor: getPriorityColor(shift.priority) }]} />
                        <Text style={[styles.shiftPriorityText, { color: getPriorityColor(shift.priority) }]}>
                          {shift.priority.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.shiftLocationRow}>
                    <Icon name="location" size={14} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                    <Text style={styles.shiftLocation} numberOfLines={1}>
                      {shift.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Today's Tasks */}
              {todayTasks.map((task, index) => {
                const photoScore = getPhotoCompletionScore(task);
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskCard}
                    onPress={() => handleTaskPress(task.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.taskCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <View style={styles.taskLocationRow}>
                          <Icon name="location" size={14} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                          <Text style={styles.taskLocation} numberOfLines={1}>
                            {task.location}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.taskStatusBadge, getStatusStyle(task.status)]}>
                        <Text style={[styles.taskStatusText, { color: getStatusStyle(task.status).color }]}>
                          {task.status.replace('-', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.taskMetaRow}>
                      <View style={styles.taskMetaItem}>
                        <Icon name="time" size={16} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                        <Text style={styles.taskMetaText}>{task.estimatedTime} min</Text>
                      </View>
                      
                      <View style={[styles.taskPriorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                        <View style={[styles.taskPriorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                        <Text style={[styles.taskPriorityText, { color: getPriorityColor(task.priority) }]}>
                          {task.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Photo Documentation Status */}
                    <View style={styles.taskPhotoSection}>
                      <View style={styles.taskPhotoHeader}>
                        <Icon name="camera" size={16} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                        <Text style={styles.taskPhotoCount}>{task.photos} photos</Text>
                        
                        {task.photos > 0 && (
                          <View style={styles.photoCategoryDots}>
                            {Object.entries(task.photoCategories).map(([category, count]) => (
                              count > 0 && (
                                <View 
                                  key={category}
                                  style={[
                                    styles.photoCategoryDot,
                                    {
                                      backgroundColor: category === 'before' ? colors.warning :
                                                      category === 'during' ? colors.primary :
                                                      category === 'after' ? colors.success :
                                                      category === 'issue' ? colors.danger :
                                                      colors.success,
                                    }
                                  ]}
                                />
                              )
                            ))}
                          </View>
                        )}
                      </View>

                      {photoScore > 0 && (
                        <View style={styles.photoProgressContainer}>
                          <View style={styles.photoProgressBar}>
                            <View 
                              style={[
                                styles.photoProgressFill,
                                { 
                                  backgroundColor: photoScore >= 80 ? colors.success : 
                                                  photoScore >= 60 ? colors.warning : colors.danger,
                                  width: `${photoScore}%` 
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.photoProgressText}>{photoScore.toFixed(0)}%</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.taskCardFooter}>
                      <Icon name="arrow-forward" size={18} style={{ color: colors.primary }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </AnimatedCard>

        {/* Upcoming Shifts Section */}
        <AnimatedCard index={1} style={styles.shiftsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upcoming Shifts</Text>
            <View style={styles.shiftCountBadge}>
              <Text style={styles.shiftCountText}>{upcomingShifts.length}</Text>
            </View>
          </View>

          {upcomingShifts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.sm }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No upcoming shifts scheduled
              </Text>
            </View>
          ) : (
            upcomingShifts.map((shift, index) => (
              <TouchableOpacity
                key={shift.id}
                style={styles.shiftCard}
                onPress={() => handleShiftPress(shift)}
                activeOpacity={0.7}
              >
                <View style={styles.shiftCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.shiftDateRow}>
                      <Text style={styles.shiftDate}>{formatDate(shift.date)}</Text>
                      <Text style={styles.shiftDay}>{shift.day.charAt(0).toUpperCase() + shift.day.slice(1)}</Text>
                    </View>
                    <Text style={styles.shiftTitle} numberOfLines={1}>
                      {shift.clientName}
                    </Text>
                    <Text style={styles.shiftSubtitle} numberOfLines={1}>
                      {shift.buildingName}
                    </Text>
                  </View>
                  <View style={[styles.shiftStatusBadge, getStatusStyle(shift.status)]}>
                    <Text style={[styles.shiftStatusText, { color: getStatusStyle(shift.status).color }]}>
                      {shift.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.shiftMetaRow}>
                  <View style={styles.shiftMetaItem}>
                    <Icon name="time" size={16} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                    <Text style={styles.shiftMetaText}>
                      {shift.startTime} {shift.endTime ? `- ${shift.endTime}` : `(${shift.hours}h)`}
                    </Text>
                  </View>
                  
                  {shift.priority && (
                    <View style={[styles.shiftPriorityBadge, { backgroundColor: getPriorityColor(shift.priority) + '20' }]}>
                      <View style={[styles.shiftPriorityDot, { backgroundColor: getPriorityColor(shift.priority) }]} />
                      <Text style={[styles.shiftPriorityText, { color: getPriorityColor(shift.priority) }]}>
                        {shift.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.shiftLocationRow}>
                  <Icon name="location" size={14} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                  <Text style={styles.shiftLocation} numberOfLines={1}>
                    {shift.address}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </AnimatedCard>

        {/* Enhanced Performance Overview */}
        <AnimatedCard index={2} style={styles.performanceCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Performance Overview</Text>
            <View style={styles.trendBadge}>
              <Icon name="trending-up" size={14} style={{ color: colors.success, marginRight: spacing.xs }} />
              <Text style={[typography.small, { color: colors.success, fontWeight: '600' }]}>+5%</Text>
            </View>
          </View>
          
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <ProgressRing 
                progress={profile.efficiency} 
                size={70} 
                color={colors.primary}
                text={`${profile.efficiency}%`}
              />
              <Text style={styles.performanceLabel}>Efficiency</Text>
              <Text style={styles.performanceSubtext}>Above average</Text>
            </View>
            
            <View style={styles.performanceItem}>
              <ProgressRing 
                progress={completionRate} 
                size={70} 
                color={colors.success}
                text={`${Math.round(completionRate)}%`}
              />
              <Text style={styles.performanceLabel}>Completion</Text>
              <Text style={styles.performanceSubtext}>On track</Text>
            </View>
            
            <View style={styles.performanceItem}>
              <ProgressRing 
                progress={(profile.todayHours / 8) * 100} 
                size={70} 
                color={colors.warning}
                text={`${profile.todayHours}h`}
              />
              <Text style={styles.performanceLabel}>Hours Today</Text>
              <Text style={styles.performanceSubtext}>of 8h goal</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Enhanced Quick Stats */}
        <AnimatedCard index={3} style={styles.statsCard}>
          <Text style={styles.cardTitle}>Today&apos;s Summary</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="list" size={24} style={{ color: colors.primary }} />
              </View>
              <Text style={styles.statValue}>{profile.todayTasks}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
                <Icon name="camera" size={24} style={{ color: colors.warning }} />
              </View>
              <Text style={styles.statValue}>{profile.todayPhotos}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
                <Icon name="checkmark-circle" size={24} style={{ color: colors.success }} />
              </View>
              <Text style={styles.statValue}>{completedTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.weeklyPhotosBanner}>
            <Icon name="images" size={20} style={{ color: colors.primary, marginRight: spacing.sm }} />
            <Text style={styles.weeklyPhotosText}>
              <Text style={{ fontWeight: '700' }}>{profile.weeklyPhotos}</Text> photos this week
            </Text>
            <View style={styles.weeklyPhotosBadge}>
              <Icon name="star" size={12} style={{ color: colors.warning }} />
            </View>
          </View>
        </AnimatedCard>

        {/* Enhanced Task Overview */}
        <AnimatedCard index={4} style={styles.taskOverviewCard}>
          <Text style={styles.cardTitle}>Task Overview</Text>
          
          <View style={styles.taskStatusGrid}>
            <View style={[styles.taskStatusItem, { backgroundColor: colors.warning + '15' }]}>
              <Text style={[styles.taskStatusValue, { color: colors.warning }]}>{pendingTasks}</Text>
              <Text style={styles.taskStatusLabel}>Pending</Text>
            </View>
            
            <View style={[styles.taskStatusItem, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.taskStatusValue, { color: colors.primary }]}>{inProgressTasks}</Text>
              <Text style={styles.taskStatusLabel}>In Progress</Text>
            </View>
            
            <View style={[styles.taskStatusItem, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.taskStatusValue, { color: colors.success }]}>{completedTasks}</Text>
              <Text style={styles.taskStatusLabel}>Completed</Text>
            </View>
            
            {overdueTasks > 0 && (
              <View style={[styles.taskStatusItem, { backgroundColor: colors.danger + '15' }]}>
                <Text style={[styles.taskStatusValue, { color: colors.danger }]}>{overdueTasks}</Text>
                <Text style={styles.taskStatusLabel}>Overdue</Text>
              </View>
            )}
          </View>
        </AnimatedCard>

        {/* Enhanced Quick Actions */}
        <AnimatedCard index={5} style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/cleaner/chat')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIconContainer}>
                <Icon name="chatbubbles" size={28} style={{ color: colors.background }} />
              </View>
              <Text style={styles.quickActionText}>Chat</Text>
              <Text style={styles.quickActionSubtext}>Message team</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.success }]}
              onPress={() => router.push('/cleaner/inventory')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIconContainer}>
                <Icon name="cube" size={28} style={{ color: colors.background }} />
              </View>
              <Text style={styles.quickActionText}>Inventory</Text>
              <Text style={styles.quickActionSubtext}>Check supplies</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.danger }]}
              onPress={handleEmergencyAlert}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIconContainer}>
                <Icon name="warning" size={28} style={{ color: colors.background }} />
              </View>
              <Text style={styles.quickActionText}>Emergency</Text>
              <Text style={styles.quickActionSubtext}>Get help now</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.background,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.background + 'CC',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.danger,
  },
  modalButtonTextCancel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
  },
  shiftsCard: {
    marginTop: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  shiftCountBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  shiftCountText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  shiftCard: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  shiftDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  shiftDate: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  shiftDay: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  shiftTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  shiftSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  shiftStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  shiftStatusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  shiftMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shiftMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftMetaText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  shiftPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  shiftPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  shiftPriorityText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  shiftLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftLocation: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  performanceCard: {
    marginTop: spacing.md,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceLabel: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  performanceSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsCard: {
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  weeklyPhotosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 12,
  },
  weeklyPhotosText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  weeklyPhotosBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskOverviewCard: {
    marginTop: spacing.md,
  },
  taskStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  taskStatusItem: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  taskStatusValue: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  taskStatusLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  quickActionsCard: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIconContainer: {
    marginBottom: spacing.sm,
  },
  quickActionText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  quickActionSubtext: {
    ...typography.caption,
    color: colors.background + 'CC',
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  taskTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  taskLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskLocation: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  taskStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  taskStatusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  taskPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  taskPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  taskPriorityText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  taskPhotoSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskPhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  taskPhotoCount: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  photoCategoryDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  photoCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  photoProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  photoProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  photoProgressText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  taskCardFooter: {
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
});
