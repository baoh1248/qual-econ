
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../styles/commonStyles';
import BottomNavigation from '../../components/BottomNavigation';
import { useRoleProtectedRoute } from '../hooks/useAuth';
import { ROLE_LEVELS } from '../utils/auth';
import LoadingSpinner from '../../components/LoadingSpinner';
import { commonStyles } from '../../styles/commonStyles';

export default function SupervisorLayout() {
  const { loading, session, hasAccess } = useRoleProtectedRoute(ROLE_LEVELS.SUPERVISOR);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
      </View>
    );
  }

  // If no session or insufficient role, useRoleProtectedRoute will redirect
  if (!session || !hasAccess) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="projects" />
        <Stack.Screen name="cleaners" />
        <Stack.Screen name="payroll" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="chat-room-settings" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="time-off-requests" />
        <Stack.Screen name="clients-list" />
        <Stack.Screen name="buildings" />
        <Stack.Screen name="building-detail" />
        <Stack.Screen name="contract-details" />
        <Stack.Screen name="invoices" />
        <Stack.Screen name="invoice-create" />
        <Stack.Screen name="invoice-detail" />
        <Stack.Screen name="invoice-statements" />
        <Stack.Screen name="admin-setup" />
      </Stack>
      <BottomNavigation role="supervisor" />
    </View>
  );
}
