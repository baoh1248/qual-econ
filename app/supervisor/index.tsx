
import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Modal, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Icon from '../../components/Icon';
import InventoryAlertBadge from '../../components/InventoryAlertBadge';
import AnimatedCard from '../../components/AnimatedCard';
import ProgressRing from '../../components/ProgressRing';
import CompanyLogo from '../../components/CompanyLogo';
import Toast from '../../components/Toast';
import DatabaseSetup from '../../components/DatabaseSetup';
import LiveMap from '../../components/LiveMap';
import { commonStyles, colors, spacing, typography, statusColors } from '../../styles/commonStyles';
import { useToast } from '../../hooks/useToast';
import { useInventoryAlerts } from '../../hooks/useInventoryAlerts';
import { useDatabase } from '../../hooks/useDatabase';

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

const SupervisorDashboard = () => {
  const { showToast } = useToast();
  const { config, syncStatus } = useDatabase();
  const { lowStockCount, criticalStockCount } = useInventoryAlerts();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);

  // Mock data - in a real app, this would come from your database
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      status: 'on-duty',
      currentTask: 'TechCorp Main Office',
      location: 'Downtown',
      todayHours: 6.5,
      tasksCompleted: 3,
      efficiency: 92,
    },
    {
      id: '2',
      name: 'Jane Smith',
      status: 'on-duty',
      currentTask: 'MedCenter Hospital',
      location: 'Medical District',
      todayHours: 7.2,
      tasksCompleted: 4,
      efficiency: 88,
    },
    {
      id: '3',
      name: 'Johnson Smith',
      status: 'break',
      currentTask: 'Lunch Break',
      location: 'Downtown Mall',
      todayHours: 4.0,
      tasksCompleted: 2,
      efficiency: 85,
    },
  ]);

  const [taskSummary] = useState<TaskSummary>({
    total: 24,
    completed: 18,
    inProgress: 4,
    pending: 2,
    overdue: 0,
  });

  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: 'TechCorp Inc.',
      location: 'Downtown',
      status: 'active',
      tasksToday: 8,
      satisfaction: 4.8,
    },
    {
      id: '2',
      name: 'MedCenter Hospital',
      location: 'Medical District',
      status: 'active',
      tasksToday: 12,
      satisfaction: 4.9,
    },
    {
      id: '3',
      name: 'Downtown Mall',
      location: 'Shopping District',
      status: 'completed',
      tasksToday: 4,
      satisfaction: 4.6,
    },
  ]);

  useEffect(() => {
    // Auto-refresh data every 30 seconds
    const interval = setInterval(() => {
      // In a real app, you'd refresh data from your database here
      console.log('Auto-refreshing dashboard data...');
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Dashboard refreshed', 'success');
    } catch (error) {
      console.log('Error refreshing dashboard:', error);
      showToast('Failed to refresh dashboard', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-duty':
      case 'active':
        return colors.success;
      case 'break':
      case 'pending':
        return colors.warning;
      case 'off-duty':
      case 'completed':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return colors.success;
    if (efficiency >= 75) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CompanyLogo />
        <Text style={styles.title}>Supervisor Dashboard</Text>
        <View style={styles.headerActions}>
          {/* Database status indicator */}
          <TouchableOpacity
            onPress={() => setShowDatabaseSetup(true)}
            style={[styles.databaseStatus, { 
              backgroundColor: config.useSupabase && syncStatus.isOnline ? colors.success : colors.warning 
            }]}
          >
            <Icon 
              name={config.useSupabase && syncStatus.isOnline ? "cloud-done" : "cloud-offline"} 
              size={16} 
              style={{ color: colors.background }} 
            />
          </TouchableOpacity>
          <InventoryAlertBadge 
            lowStockCount={lowStockCount} 
            criticalStockCount={criticalStockCount}
            onPress={() => router.push('/supervisor/inventory')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <AnimatedCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="people" size={24} style={{ color: colors.primary }} />
              <View style={styles.statText}>
                <Text style={styles.statValue}>{teamMembers.length}</Text>
                <Text style={styles.statLabel}>Team Members</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="checkmark-circle" size={24} style={{ color: colors.success }} />
              <View style={styles.statText}>
                <Text style={styles.statValue}>{taskSummary.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="time" size={24} style={{ color: colors.warning }} />
              <View style={styles.statText}>
                <Text style={styles.statValue}>{taskSummary.inProgress}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="alert-circle" size={24} style={{ color: colors.danger }} />
              <View style={styles.statText}>
                <Text style={styles.statValue}>{taskSummary.overdue}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Live Map Card */}
        <AnimatedCard style={styles.liveMapCard}>
          <TouchableOpacity 
            style={styles.liveMapHeader}
            onPress={() => setShowLiveMap(true)}
          >
            <View style={styles.liveMapTitleRow}>
              <Icon name="map" size={24} style={{ color: colors.primary }} />
              <Text style={styles.cardTitle}>Live Cleaner Tracking</Text>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: colors.textSecondary }} />
          </TouchableOpacity>
          <Text style={styles.liveMapDescription}>
            Monitor your team&apos;s real-time locations and status
          </Text>
          <View style={styles.liveMapStats}>
            <View style={styles.liveMapStat}>
              <Text style={styles.liveMapStatValue}>
                {teamMembers.filter(m => m.status === 'on-duty').length}
              </Text>
              <Text style={styles.liveMapStatLabel}>On Duty</Text>
            </View>
            <View style={styles.liveMapStat}>
              <Text style={styles.liveMapStatValue}>
                {teamMembers.filter(m => m.status === 'break').length}
              </Text>
              <Text style={styles.liveMapStatLabel}>On Break</Text>
            </View>
            <View style={styles.liveMapStat}>
              <Text style={styles.liveMapStatValue}>
                {teamMembers.filter(m => m.status === 'off-duty').length}
              </Text>
              <Text style={styles.liveMapStatLabel}>Off Duty</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Task Progress */}
        <AnimatedCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardTitle}>Today&apos;s Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round((taskSummary.completed / taskSummary.total) * 100)}%
            </Text>
          </View>
          <View style={styles.progressContent}>
            <ProgressRing
              progress={(taskSummary.completed / taskSummary.total) * 100}
              size={80}
              strokeWidth={8}
              color={colors.primary}
            />
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <View style={[styles.progressDot, { backgroundColor: colors.success }]} />
                <Text style={styles.progressStatText}>Completed: {taskSummary.completed}</Text>
              </View>
              <View style={styles.progressStat}>
                <View style={[styles.progressDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.progressStatText}>In Progress: {taskSummary.inProgress}</Text>
              </View>
              <View style={styles.progressStat}>
                <View style={[styles.progressDot, { backgroundColor: colors.textSecondary }]} />
                <Text style={styles.progressStatText}>Pending: {taskSummary.pending}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Team Status */}
        <AnimatedCard style={styles.teamCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Team Status</Text>
            <TouchableOpacity onPress={() => router.push('/supervisor/cleaners')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {teamMembers.map((member) => (
            <View key={member.id} style={styles.teamMember}>
              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) }]}>
                    <Text style={styles.statusText}>{member.status.replace('-', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.memberTask}>{member.currentTask}</Text>
                <Text style={styles.memberLocation}>{member.location}</Text>
              </View>
              <View style={styles.memberStats}>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.todayHours}h</Text>
                  <Text style={styles.memberStatLabel}>Hours</Text>
                </View>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.tasksCompleted}</Text>
                  <Text style={styles.memberStatLabel}>Tasks</Text>
                </View>
                <View style={styles.memberStat}>
                  <Text style={[styles.memberStatValue, { color: getEfficiencyColor(member.efficiency) }]}>
                    {member.efficiency}%
                  </Text>
                  <Text style={styles.memberStatLabel}>Efficiency</Text>
                </View>
              </View>
            </View>
          ))}
        </AnimatedCard>

        {/* Client Status */}
        <AnimatedCard style={styles.clientCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Client Status</Text>
            <TouchableOpacity onPress={() => router.push('/supervisor/schedule')}>
              <Text style={styles.viewAllText}>View Schedule</Text>
            </TouchableOpacity>
          </View>
          {clients.map((client) => (
            <View key={client.id} style={styles.clientItem}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientLocation}>{client.location}</Text>
              </View>
              <View style={styles.clientStats}>
                <View style={styles.clientStat}>
                  <Text style={styles.clientStatValue}>{client.tasksToday}</Text>
                  <Text style={styles.clientStatLabel}>Tasks Today</Text>
                </View>
                <View style={styles.clientStat}>
                  <View style={styles.satisfactionRow}>
                    <Icon name="star" size={16} style={{ color: colors.warning }} />
                    <Text style={styles.satisfactionValue}>{client.satisfaction}</Text>
                  </View>
                  <Text style={styles.clientStatLabel}>Satisfaction</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(client.status) }]}>
                  <Text style={styles.statusText}>{client.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </AnimatedCard>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/schedule')}
          >
            <Icon name="calendar" size={24} style={{ color: colors.primary }} />
            <Text style={styles.actionButtonText}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/inventory')}
          >
            <Icon name="cube" size={24} style={{ color: colors.primary }} />
            <Text style={styles.actionButtonText}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/payroll')}
          >
            <Icon name="card" size={24} style={{ color: colors.primary }} />
            <Text style={styles.actionButtonText}>Payroll</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/photos')}
          >
            <Icon name="camera" size={24} style={{ color: colors.primary }} />
            <Text style={styles.actionButtonText}>Photos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Database Setup Modal */}
      <Modal
        visible={showDatabaseSetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <DatabaseSetup onClose={() => setShowDatabaseSetup(false)} />
      </Modal>

      {/* Live Map Modal */}
      <Modal
        visible={showLiveMap}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Live Cleaner Tracking</Text>
            <TouchableOpacity onPress={() => setShowLiveMap(false)}>
              <Icon name="close" size={24} style={{ color: colors.text }} />
            </TouchableOpacity>
          </View>
          <LiveMap />
        </View>
      </Modal>

      <Toast />
    </View>
  );
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  databaseStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: spacing.md,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  liveMapCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  liveMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  liveMapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveMapDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  liveMapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  liveMapStat: {
    alignItems: 'center',
  },
  liveMapStatValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  liveMapStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  progressCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  progressPercentage: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStats: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  progressStatText: {
    ...typography.small,
    color: colors.text,
  },
  teamCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  viewAllText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  teamMember: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  memberName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  memberTask: {
    ...typography.small,
    color: colors.text,
    marginBottom: 2,
  },
  memberLocation: {
    ...typography.small,
    color: colors.textSecondary,
  },
  memberStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  memberStat: {
    alignItems: 'center',
  },
  memberStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  clientCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientLocation: {
    ...typography.small,
    color: colors.textSecondary,
  },
  clientStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clientStat: {
    alignItems: 'center',
  },
  clientStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  satisfactionValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 2,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
});

export default SupervisorDashboard;
