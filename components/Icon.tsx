import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

interface IconProps {
  name: string;
  size?: number;
  style?: object;
}

export default function Icon({ name, size = 40, style }: IconProps) {
  return (
    <View style={[styles.iconContainer, style]}>
      <Ionicons name={name as any} size={size} color={"white"} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
