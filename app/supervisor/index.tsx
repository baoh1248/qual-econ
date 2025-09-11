
import { Text, View, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles, colors, spacing, typography, statusColors } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { Platform } from 'react-native';
import AnimatedCard from '../../components/AnimatedCard';
import ProgressRing from '../../components/ProgressRing';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventoryAlerts } from '../../hooks/useInventoryAlerts';
import InventoryAlertBadge from '../../components/InventoryAlertBadge';

interface TeamMember {
  id: string;
  name: string;
  status: 'on-duty' | 'off-duty' | 'break';
  currentTask: string;
  location: string;
  todayHours: number;
  tasksCompleted: number;
  efficiency: number;
}

interface TaskSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

interface Client {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'pending';
  tasksToday: number;
  satisfaction: number;
}

export default function SupervisorDashboard() {
  console.log('SupervisorDashboard rendered');
  
  const { toast, showToast, hideToast } = useToast();
  const { 
    unacknowledgedAlerts, 
    highPriorityAlerts, 
    mediumPriorityAlerts, 
    lowPriorityAlerts,
    acknowledgeAllAlerts 
  } = useInventoryAlerts();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Smith',
      status: 'on-duty',
      currentTask: 'Office Building A - Floor 3',
      location: '123 Business St',
      todayHours: 6.5,
      tasksCompleted: 8,
      efficiency: 95,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      status: 'on-duty',
      currentTask: 'Retail Store - Main Floor',
      location: '456 Shopping Ave',
      todayHours: 7.2,
      tasksCompleted: 10,
      efficiency: 98,
    },
    {
      id: '3',
      name: 'Mike Davis',
      status: 'break',
      currentTask: 'Break - 15 min remaining',
      location: 'Office Building B',
      todayHours: 4.0,
      tasksCompleted: 5,
      efficiency: 87,
    },
    {
      id: '4',
      name: 'Lisa Wilson',
      status: 'off-duty',
      currentTask: 'Shift ended',
      location: 'N/A',
      todayHours: 8.0,
      tasksCompleted: 12,
      efficiency: 92,
    },
  ]);

  const [taskSummary, setTaskSummary] = useState<TaskSummary>({
    total: 45,
    completed: 28,
    inProgress: 12,
    pending: 3,
    overdue: 2,
  });

  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'TechCorp Office',
      location: '123 Business St',
      status: 'active',
      tasksToday: 8,
      satisfaction: 4.8,
    },
    {
      id: '2',
      name: 'Retail Plaza',
      location: '456 Shopping Ave',
      status: 'active',
      tasksToday: 6,
      satisfaction: 4.6,
    },
    {
      id: '3',
      name: 'Medical Center',
      location: '789 Health Blvd',
      status: 'completed',
      tasksToday: 4,
      satisfaction: 4.9,
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
    console.log('Refreshing supervisor dashboard');
    setRefreshing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setRefreshing(false);
    showToast('Dashboard updated', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-duty': return colors.success;
      case 'break': return colors.warning;
      case 'off-duty': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return colors.success;
    if (efficiency >= 85) return colors.warning;
    return colors.danger;
  };

  const screenWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = screenWidth > 768;

  const completionRate = taskSummary.total > 0 ? (taskSummary.completed / taskSummary.total) * 100 : 0;
  const teamEfficiency = teamMembers.reduce((sum, member) => sum + member.efficiency, 0) / teamMembers.length;
  const activeTeamMembers = teamMembers.filter(member => member.status === 'on-duty').length;

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
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Supervisor Dashboard</Text>
        <TouchableOpacity onPress={() => showToast('Settings coming soon', 'info')}>
          <Icon name="settings" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={commonStyles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Inventory Alerts */}
        {unacknowledgedAlerts.length > 0 && (
          <AnimatedCard index={0}>
            <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
              <Text style={[typography.h3, { color: colors.text }]}>
                Inventory Alerts
              </Text>
              <TouchableOpacity onPress={acknowledgeAllAlerts}>
                <Text style={[typography.caption, { color: colors.primary }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ gap: spacing.sm }}>
              <InventoryAlertBadge
                count={highPriorityAlerts.length}
                priority="high"
                onPress={() => router.push('/supervisor/inventory')}
              />
              <InventoryAlertBadge
                count={mediumPriorityAlerts.length}
                priority="medium"
                onPress={() => router.push('/supervisor/inventory')}
              />
              <InventoryAlertBadge
                count={lowPriorityAlerts.length}
                priority="low"
                onPress={() => router.push('/supervisor/inventory')}
              />
            </View>
          </AnimatedCard>
        )}

        {/* Performance Overview */}
        <AnimatedCard index={unacknowledgedAlerts.length > 0 ? 1 : 0}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Performance Overview
          </Text>
          
          <View style={[commonStyles.row, { justifyContent: 'space-around', marginBottom: spacing.md }]}>
            <View style={{ alignItems: 'center' }}>
              <ProgressRing 
                progress={completionRate} 
                size={70} 
                color={colors.success}
                text={`${Math.round(completionRate)}%`}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Task Completion
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <ProgressRing 
                progress={teamEfficiency} 
                size={70} 
                color={colors.primary}
                text={`${Math.round(teamEfficiency)}%`}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Team Efficiency
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <ProgressRing 
                progress={(activeTeamMembers / teamMembers.length) * 100} 
                size={70} 
                color={colors.warning}
                text={`${activeTeamMembers}/${teamMembers.length}`}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Active Team
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Stats */}
        <AnimatedCard index={unacknowledgedAlerts.length > 0 ? 2 : 1}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Today&apos;s Overview
          </Text>
          
          <View style={[
            isLargeScreen ? { flexDirection: 'row', gap: spacing.md } : { gap: spacing.sm }
          ]}>
            <View style={[
              { 
                backgroundColor: colors.backgroundAlt, 
                padding: spacing.md, 
                borderRadius: 8,
                flex: isLargeScreen ? 1 : undefined,
              }
            ]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Total Tasks</Text>
              <Text style={[typography.h2, { color: colors.text }]}>{taskSummary.total}</Text>
            </View>
            
            <View style={[
              { 
                backgroundColor: colors.backgroundAlt, 
                padding: spacing.md, 
                borderRadius: 8,
                flex: isLargeScreen ? 1 : undefined,
              }
            ]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Completed</Text>
              <Text style={[typography.h2, { color: colors.success }]}>{taskSummary.completed}</Text>
            </View>
            
            <View style={[
              { 
                backgroundColor: colors.backgroundAlt, 
                padding: spacing.md, 
                borderRadius: 8,
                flex: isLargeScreen ? 1 : undefined,
              }
            ]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>In Progress</Text>
              <Text style={[typography.h2, { color: colors.primary }]}>{taskSummary.inProgress}</Text>
            </View>
            
            <View style={[
              { 
                backgroundColor: colors.backgroundAlt, 
                padding: spacing.md, 
                borderRadius: 8,
                flex: isLargeScreen ? 1 : undefined,
              }
            ]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Overdue</Text>
              <Text style={[typography.h2, { color: colors.danger }]}>{taskSummary.overdue}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard index={unacknowledgedAlerts.length > 0 ? 3 : 2}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Quick Actions
          </Text>
          
          <View style={[
            isLargeScreen 
              ? { flexDirection: 'row', gap: spacing.md }
              : { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }
          ]}>
            <TouchableOpacity
              style={[
                { 
                  flex: isLargeScreen ? 1 : 0,
                  minWidth: isLargeScreen ? 0 : '48%',
                  alignItems: 'center', 
                  padding: spacing.md, 
                  backgroundColor: '#E2E8F0', 
                  borderRadius: 8 
                }
              ]}
              onPress={() => router.push('/supervisor/schedule')}
            >
              <Icon name="calendar" size={24} style={{ color: colors.primary, marginBottom: spacing.xs }} />
              <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>Schedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                { 
                  flex: isLargeScreen ? 1 : 0,
                  minWidth: isLargeScreen ? 0 : '48%',
                  alignItems: 'center', 
                  padding: spacing.md, 
                  backgroundColor: '#E2E8F0', 
                  borderRadius: 8 
                }
              ]}
              onPress={() => router.push('/supervisor/payroll')}
            >
              <Icon name="time" size={24} style={{ color: colors.primary, marginBottom: spacing.xs }} />
              <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>Payroll Hours</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                { 
                  flex: isLargeScreen ? 1 : 0,
                  minWidth: isLargeScreen ? 0 : '48%',
                  alignItems: 'center', 
                  padding: spacing.md, 
                  backgroundColor: '#E2E8F0', 
                  borderRadius: 8 
                }
              ]}
              onPress={() => router.push('/supervisor/inventory')}
            >
              <View style={{ position: 'relative' }}>
                <Icon name="cube" size={24} style={{ color: colors.primary, marginBottom: spacing.xs }} />
                {unacknowledgedAlerts.length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: colors.danger,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={[typography.small, { color: colors.background, fontSize: 10 }]}>
                      {unacknowledgedAlerts.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>Inventory</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                { 
                  flex: isLargeScreen ? 1 : 0,
                  minWidth: isLargeScreen ? 0 : '48%',
                  alignItems: 'center', 
                  padding: spacing.md, 
                  backgroundColor: '#E2E8F0', 
                  borderRadius: 8 
                }
              ]}
              onPress={() => showToast('Analytics coming soon', 'info')}
            >
              <Icon name="analytics" size={24} style={{ color: colors.primary, marginBottom: spacing.xs }} />
              <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                { 
                  flex: isLargeScreen ? 1 : 0,
                  minWidth: isLargeScreen ? 0 : '48%',
                  alignItems: 'center', 
                  padding: spacing.md, 
                  backgroundColor: '#E2E8F0', 
                  borderRadius: 8 
                }
              ]}
              onPress={() => router.push('/supervisor/photos')}
            >
              <Icon name="camera" size={24} style={{ color: colors.primary, marginBottom: spacing.xs }} />
              <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>Photos</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Team Status */}
        <AnimatedCard index={unacknowledgedAlerts.length > 0 ? 4 : 3}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <Text style={[typography.h3, { color: colors.text }]}>Team Status</Text>
            <TouchableOpacity onPress={() => showToast('Team details coming soon', 'info')}>
              <Text style={[typography.caption, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {teamMembers.slice(0, 4).map((member, index) => (
            <TouchableOpacity
              key={member.id}
              style={[
                commonStyles.card,
                { 
                  marginBottom: spacing.sm,
                  backgroundColor: colors.backgroundAlt,
                }
              ]}
              onPress={() => showToast(`${member.name} details coming soon`, 'info')}
            >
              <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  {member.name}
                </Text>
                <View style={[
                  commonStyles.statusBadge,
                  { backgroundColor: getStatusColor(member.status) + '20' }
                ]}>
                  <Text style={[
                    typography.small,
                    { color: getStatusColor(member.status), fontWeight: '600' }
                  ]}>
                    {member.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                <Icon name="briefcase" size={14} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  {member.currentTask}
                </Text>
              </View>
              
              <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                <Icon name="location" size={14} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  {member.location}
                </Text>
              </View>
              
              <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                <View style={commonStyles.row}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {member.todayHours}h • {member.tasksCompleted} tasks
                  </Text>
                </View>
                <View style={[commonStyles.row]}>
                  <Text style={[
                    typography.caption,
                    { color: getEfficiencyColor(member.efficiency), fontWeight: '600' }
                  ]}>
                    {member.efficiency}% efficiency
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </AnimatedCard>

        {/* Real-time Monitoring */}
        <AnimatedCard index={unacknowledgedAlerts.length > 0 ? 5 : 4}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <Text style={[typography.h3, { color: colors.text }]}>Real-time Monitoring</Text>
            <TouchableOpacity onPress={() => showToast('Live monitoring coming soon', 'info')}>
              <Icon name="map" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>
          </View>

          <View style={{ 
            backgroundColor: colors.backgroundAlt, 
            padding: spacing.lg, 
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
          }}>
            <Icon name="map" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
            <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
              Live Team Location Map
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              {isWeb 
                ? 'Maps are not supported on web in Natively. Please use the mobile app for GPS tracking features.'
                : 'Tap the map icon to view real-time team locations and task progress'
              }
            </Text>
          </View>
        </AnimatedCard>

        {/* Client Status */}
        <AnimatedCard index={unacknowledgedAlerts.length > 0 ? 6 : 5}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <Text style={[typography.h3, { color: colors.text }]}>Client Status</Text>
            <TouchableOpacity onPress={() => showToast('Client management coming soon', 'info')}>
              <Text style={[typography.caption, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {clients.map((client, index) => (
            <TouchableOpacity
              key={client.id}
              style={[
                commonStyles.card,
                { 
                  marginBottom: spacing.sm,
                  backgroundColor: colors.backgroundAlt,
                }
              ]}
              onPress={() => showToast(`${client.name} details coming soon`, 'info')}
            >
              <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                  {client.name}
                </Text>
                <View style={[
                  commonStyles.statusBadge,
                  { backgroundColor: client.status === 'active' ? colors.success + '20' : colors.textSecondary + '20' }
                ]}>
                  <Text style={[
                    typography.small,
                    { 
                      color: client.status === 'active' ? colors.success : colors.textSecondary,
                      fontWeight: '600'
                    }
                  ]}>
                    {client.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                <Icon name="location" size={14} style={{ color: colors.textSecondary, marginRight: spacing.xs }} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  {client.location}
                </Text>
              </View>
              
              <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {client.tasksToday} tasks today
                </Text>
                <View style={commonStyles.row}>
                  <Icon name="star" size={14} style={{ color: colors.warning, marginRight: spacing.xs }} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {client.satisfaction}/5.0
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </AnimatedCard>
      </ScrollView>
    </View>
  );
}
