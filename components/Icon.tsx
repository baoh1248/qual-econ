
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export default function Icon({ name, size = 24, color = colors.text, style }: IconProps) {
  // Only show QE logo for building-related icons
  const isBuildingIcon = name === 'building' || name === 'business' || name === 'business-outline';
  
  if (isBuildingIcon) {
    return (
      <View style={[styles.iconContainer, style]}>
        <Image 
          source={require('../assets/images/qelogo.png')}
          style={[
            styles.iconImage,
            {
              width: size,
              height: size,
              tintColor: color,
            }
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // For all other icons, use Ionicons as normal
  return (
    <Ionicons 
      name={name as any} 
      size={size} 
      color={color} 
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    // No default tint color - will be set by the tintColor prop
  },
});
