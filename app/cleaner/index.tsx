
import { commonStyles, colors, spacing, typography, statusColors } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { router } from 'expo-router';
import AnimatedCard from '../../components/AnimatedCard';
import ProgressRing from '../../components/ProgressRing';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

interface Task {
  id: string;
  title: string;
  location: string;
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

interface CleanerProfile {
  id: string;
  name: string;
  isOnDuty: boolean;
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
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<CleanerProfile>({
    id: '1',
    name: 'Sarah Johnson',
    isOnDuty: false,
    currentLocation: 'Office Building A',
    todayHours: 6.5,
    todayTasks: 4,
    todayPhotos: 23,
    weeklyPhotos: 156,
    efficiency: 92,
  });

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Office Building A - Floor 3',
      location: '123 Business St, Suite 300',
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
      status: 'overdue',
      priority: 'high',
      estimatedTime: 180,
      description: 'Complete restaurant cleaning including kitchen deep clean',
      checklistItems: ['Kitchen equipment', 'Dining area', 'Restrooms', 'Storage'],
      photos: 0,
      photoCategories: { before: 0, during: 0, after: 0, issue: 0, completion: 0 },
    },
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const onRefresh = async () => {
    console.log('Refreshing dashboard data');
    setRefreshing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setRefreshing(false);
    showToast('Dashboard updated', 'success');
  };

  const toggleDutyStatus = () => {
    const newStatus = !profile.isOnDuty;
    setProfile(prev => ({ ...prev, isOnDuty: newStatus }));
    console.log('Duty status toggled:', newStatus);
    showToast(
      newStatus ? 'You are now on duty' : 'You are now off duty',
      newStatus ? 'success' : 'info'
    );
  };

  const handleTaskPress = (taskId: string) => {
    console.log('Task pressed:', taskId);
    router.push(`/cleaner/task/${taskId}`);
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

  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const overdueTasks = tasks.filter(task => task.status === 'overdue').length;

  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

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
      
      <View style={commonStyles.header}>
        <View style={commonStyles.row}>
          <CompanyLogo size="small" showText={false} variant="light" style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.headerTitle, { fontSize: 20 }]}>
              Welcome back, {profile.name}
            </Text>
            <Text style={[typography.body, { color: colors.background + '80' }]}>
              {profile.currentLocation}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              commonStyles.statusBadge,
              { 
                backgroundColor: profile.isOnDuty ? colors.success : colors.textSecondary,
                paddingHorizontal: spacing.md,
              }
            ]}
            onPress={toggleDutyStatus}
          >
            <Text style={[typography.small, { color: colors.background, fontWeight: '600' }]}>
              {profile.isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={commonStyles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Performance Overview */}
        <AnimatedCard index={0}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Performance Overview
          </Text>
          
          <View style={[commonStyles.row, { justifyContent: 'space-around', marginBottom: spacing.md }]}>
            <View style={{ alignItems: 'center' }}>
              <ProgressRing 
                progress={profile.efficiency} 
                size={60} 
                color={colors.primary}
                text={`${profile.efficiency}%`}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Efficiency
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <ProgressRing 
                progress={completionRate} 
                size={60} 
                color={colors.success}
                text={`${Math.round(completionRate)}%`}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Completion
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <ProgressRing 
                progress={(profile.todayHours / 8) * 100} 
                size={60} 
                color={colors.warning}
                text={`${profile.todayHours}h`}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Hours Today
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Stats */}
        <AnimatedCard index={1}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Today&apos;s Summary
          </Text>
          
          <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.primary }]}>{profile.todayTasks}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Tasks</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.warning }]}>{profile.todayPhotos}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Photos</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.success }]}>{completedTasks}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Completed</Text>
            </View>
          </View>

          <View style={[commonStyles.row, { gap: spacing.sm }]}>
            <View style={[commonStyles.badge, { backgroundColor: colors.primary + '20', flex: 1 }]}>
              <Text style={[typography.small, { color: colors.primary, textAlign: 'center' }]}>
                Weekly Photos: {profile.weeklyPhotos}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Task Overview */}
        <AnimatedCard index={2}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Task Overview
          </Text>
          
          <View style={[commonStyles.row, { gap: spacing.sm, marginBottom: spacing.md }]}>
            <View style={[commonStyles.badge, { backgroundColor: colors.warning + '20', flex: 1 }]}>
              <Text style={[typography.small, { color: colors.warning, textAlign: 'center' }]}>
                {pendingTasks} Pending
              </Text>
            </View>
            <View style={[commonStyles.badge, { backgroundColor: colors.primary + '20', flex: 1 }]}>
              <Text style={[typography.small, { color: colors.primary, textAlign: 'center' }]}>
                {inProgressTasks} In Progress
              </Text>
            </View>
            <View style={[commonStyles.badge, { backgroundColor: colors.success + '20', flex: 1 }]}>
              <Text style={[typography.small, { color: colors.success, textAlign: 'center' }]}>
                {completedTasks} Completed
              </Text>
            </View>
            {overdueTasks > 0 && (
              <View style={[commonStyles.badge, { backgroundColor: colors.danger + '20', flex: 1 }]}>
                <Text style={[typography.small, { color: colors.danger, textAlign: 'center' }]}>
                  {overdueTasks} Overdue
                </Text>
              </View>
            )}
          </View>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard index={3}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Quick Actions
          </Text>
          
          <View style={[commonStyles.row, { gap: spacing.md }]}>
            <TouchableOpacity
              style={[
                commonStyles.button,
                { 
                  backgroundColor: colors.primary,
                  flex: 1,
                  paddingVertical: spacing.md,
                }
              ]}
              onPress={() => router.push('/cleaner/chat')}
            >
              <Icon name="chatbubbles" size={20} style={{ color: colors.background, marginBottom: spacing.xs }} />
              <Text style={[typography.small, { color: colors.background, textAlign: 'center' }]}>
                Chat
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                commonStyles.button,
                { 
                  backgroundColor: colors.success,
                  flex: 1,
                  paddingVertical: spacing.md,
                }
              ]}
              onPress={() => router.push('/cleaner/inventory')}
            >
              <Icon name="cube" size={20} style={{ color: colors.background, marginBottom: spacing.xs }} />
              <Text style={[typography.small, { color: colors.background, textAlign: 'center' }]}>
                Inventory
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                commonStyles.button,
                { 
                  backgroundColor: colors.danger,
                  flex: 1,
                  paddingVertical: spacing.md,
                }
              ]}
              onPress={handleEmergencyAlert}
            >
              <Icon name="warning" size={20} style={{ color: colors.background, marginBottom: spacing.xs }} />
              <Text style={[typography.small, { color: colors.background, textAlign: 'center' }]}>
                Emergency
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Tasks List */}
        <AnimatedCard index={4}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Your Tasks
          </Text>
          
          {tasks.map((task, index) => {
            const photoScore = getPhotoCompletionScore(task);
            return (
              <TouchableOpacity
                key={task.id}
                style={[
                  {
                    padding: spacing.md,
                    borderRadius: 8,
                    backgroundColor: colors.backgroundAlt,
                    marginBottom: spacing.sm,
                  }
                ]}
                onPress={() => handleTaskPress(task.id)}
              >
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                    {task.title}
                  </Text>
                  <View style={[commonStyles.statusBadge, getStatusStyle(task.status)]}>
                    <Text style={[typography.small, { fontWeight: '600' }]}>
                      {task.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                  <Icon name="location" size={14} style={{ color: colors.textSecondary, marginRight: spacing.sm }} />
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                    {task.location}
                  </Text>
                </View>

                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <View style={[commonStyles.row]}>
                    <Icon name="time" size={14} style={{ color: colors.textSecondary, marginRight: spacing.sm }} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {task.estimatedTime} min
                    </Text>
                  </View>
                  
                  <View style={[commonStyles.badge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                    <Text style={[typography.small, { color: getPriorityColor(task.priority) }]}>
                      {task.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Photo Documentation Status */}
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginTop: spacing.sm }]}>
                  <View style={[commonStyles.row]}>
                    <Icon name="camera" size={14} style={{ color: colors.textSecondary, marginRight: spacing.sm }} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {task.photos} photos
                    </Text>
                  </View>
                  
                  {task.photos > 0 && (
                    <View style={[commonStyles.row, { gap: spacing.xs }]}>
                      {Object.entries(task.photoCategories).map(([category, count]) => (
                        count > 0 && (
                          <View 
                            key={category}
                            style={[
                              {
                                width: 6,
                                height: 6,
                                borderRadius: 3,
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
                  <View style={{ marginTop: spacing.sm }}>
                    <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        Documentation
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {photoScore.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.border, height: 4, borderRadius: 2 }}>
                      <View 
                        style={{ 
                          backgroundColor: photoScore >= 80 ? colors.success : 
                                          photoScore >= 60 ? colors.warning : colors.danger,
                          height: 4, 
                          borderRadius: 2, 
                          width: `${photoScore}%` 
                        }} 
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </AnimatedCard>
      </ScrollView>
    </View>
  );
}
