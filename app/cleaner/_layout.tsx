
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../styles/commonStyles';
import BottomNavigation from '../../components/BottomNavigation';

export default function CleanerLayout() {
  console.log('CleanerLayout rendered');
  
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
        <Stack.Screen name="inventory" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
      <BottomNavigation role="cleaner" />
    </View>
  );
}
