
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import Icon from './Icon';
import { colors, spacing, typography } from '../styles/commonStyles';

interface NavItem {
  name: string;
  icon: string;
  path: string;
  label: string;
}

interface BottomNavigationProps {
  role: 'cleaner' | 'supervisor';
}

export default function BottomNavigation({ role }: BottomNavigationProps) {
  const pathname = usePathname();
  console.log('BottomNavigation rendered for role:', role, 'current path:', pathname);

  const cleanerNavItems: NavItem[] = [
    { name: 'home', icon: 'home', path: '/cleaner', label: 'Home' },
    { name: 'chat', icon: 'chatbubbles', path: '/cleaner/chat', label: 'Chat' },
    { name: 'inventory', icon: 'cube', path: '/cleaner/inventory', label: 'Inventory' },
  ];

  const supervisorNavItems: NavItem[] = [
    { name: 'home', icon: 'home', path: '/supervisor', label: 'Dashboard' },
    { name: 'schedule', icon: 'calendar', path: '/supervisor/schedule', label: 'Schedule' },
    { name: 'inventory', icon: 'cube', path: '/supervisor/inventory', label: 'Inventory' },
    { name: 'photos', icon: 'camera', path: '/supervisor/photos', label: 'Photos' },
  ];

  const navItems = role === 'cleaner' ? cleanerNavItems : supervisorNavItems;

  const handleNavPress = (path: string) => {
    console.log('Navigation pressed:', path);
    router.push(path);
  };

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive = pathname === item.path || 
          (item.path !== `/${role}` && pathname.startsWith(item.path));
        
        return (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.navItem, 
              isActive ? styles.activeNavItem : styles.inactiveNavItem
            ]}
            onPress={() => handleNavPress(item.path)}
            activeOpacity={0.7}
          >
            <Icon 
              name={item.icon} 
              size={24} 
              style={{ 
                tintColor: isActive ? colors.background : colors.background,
                marginBottom: spacing.xs 
              }} 
            />
            <Text style={[
              styles.navLabel,
              { color: isActive ? colors.background : colors.background }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    boxShadow: `0 -2px 8px ${colors.shadow}`,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  activeNavItem: {
    backgroundColor: colors.primary,
  },
  inactiveNavItem: {
    backgroundColor: colors.primary,
  },
  navLabel: {
    ...typography.small,
    fontWeight: '500',
  },
});
