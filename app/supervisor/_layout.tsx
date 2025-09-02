
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
      </Stack>
      <BottomNavigation role="supervisor" />
    </View>
  );
}
