
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../styles/commonStyles';
import BottomNavigation from '../../components/BottomNavigation';

export default function SupervisorLayout() {
  console.log('SupervisorLayout rendered');
  
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
      </Stack>
      <BottomNavigation role="supervisor" />
    </View>
  );
}
