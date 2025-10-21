
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { commonStyles, spacing, buttonStyles, colors } from '../styles/commonStyles';
import Icon from './Icon';
import CompanyLogo from './CompanyLogo';

interface ThemedHeaderProps {
  title: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
  style?: ViewStyle;
}

export default function ThemedHeader({
  title,
  showBackButton = true,
  showLogo = true,
  rightComponent,
  onBackPress,
  style,
}: ThemedHeaderProps) {
  const { themeColor } = useTheme();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[commonStyles.header, { backgroundColor: themeColor }, style]}>
      <View style={styles.headerLeft}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: showBackButton ? spacing.md : 0 }]}>
          {title}
        </Text>
      </View>
      {rightComponent || (showLogo && <CompanyLogo size={40} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
