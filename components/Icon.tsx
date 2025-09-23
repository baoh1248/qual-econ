import { View, StyleSheet, Image } from 'react-native';

interface IconProps {
  name?: string; // preserved for compatibility, not used
  size?: number;
  style?: object;
}

export default function Icon({ name, size = 40, style }: IconProps) {
  return (
    <View style={[styles.iconContainer, style]}>
      <Image
        source={require('../assets/images/qelogo.png')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});