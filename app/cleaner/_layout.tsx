
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../styles/commonStyles';
import BottomNavigation from '../../components/BottomNavigation';
import { useProtectedRoute } from '../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import { commonStyles } from '../../styles/commonStyles';

export default function CleanerLayout() {
  const { loading, session } = useProtectedRoute();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
      </View>
    );
  }

  // If no session, useProtectedRoute will redirect to login
  if (!session) {
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
        <Stack.Screen name="chat" />
        <Stack.Screen name="chat-room-settings" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="time-off" />
      </Stack>
      <BottomNavigation role="cleaner" />
    </View>
  );
}
