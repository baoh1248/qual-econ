
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles, colors, spacing, typography } from '../styles/commonStyles';
import Icon from '../components/Icon';

export default function MainScreen() {
  console.log('MainScreen rendered');

  const navigateToRole = (role: 'cleaner' | 'supervisor') => {
    console.log(`Navigating to ${role} dashboard`);
    router.push(`/${role}`);
  };

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <Text style={commonStyles.headerTitle}>Qual-Econ</Text>
        <Icon name="business" size={24} style={{ color: colors.background }} />
      </View>
      
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginVertical: spacing.xxl }}>
          <Icon name="business" size={80} style={{ color: colors.primary, marginBottom: spacing.lg }} />
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
            Welcome to Qual-Econ
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl }]}>
            Professional commercial cleaning company for your business 
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <TouchableOpacity
            style={[commonStyles.card, { padding: spacing.lg }]}
            onPress={() => navigateToRole('cleaner')}
            activeOpacity={0.7}
          >
            <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
              <Icon name="person" size={32} style={{ color: colors.primary, marginRight: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                  Cleaner App
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Mobile app for field workers
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} style={{ color: colors.textSecondary }} />
            </View>
            
            <View style={{ gap: spacing.sm }}>
              <View style={commonStyles.row}>
                <Icon name="checkmark-circle" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Task management with photos</Text>
              </View>
              <View style={commonStyles.row}>
                <Icon name="time" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Time tracking with GPS</Text>
              </View>
              <View style={commonStyles.row}>
                <Icon name="chatbubbles" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Real-time communication</Text>
              </View>
              <View style={commonStyles.row}>
                <Icon name="cube" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Inventory management</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.card, { padding: spacing.lg }]}
            onPress={() => navigateToRole('supervisor')}
            activeOpacity={0.7}
          >
            <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
              <Icon name="desktop" size={32} style={{ color: colors.secondary, marginRight: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                  Supervisor Dashboard
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Web dashboard for management
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} style={{ color: colors.textSecondary }} />
            </View>
            
            <View style={{ gap: spacing.sm }}>
              <View style={commonStyles.row}>
                <Icon name="people" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Team management & scheduling</Text>
              </View>
              <View style={commonStyles.row}>
                <Icon name="analytics" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Advanced analytics & reporting</Text>
              </View>
              <View style={commonStyles.row}>
                <Icon name="map" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Real-time monitoring</Text>
              </View>
              <View style={commonStyles.row}>
                <Icon name="business" size={16} style={{ color: colors.success, marginRight: spacing.sm }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Client management</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.backgroundAlt, borderRadius: 12 }}>
          <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
            System Features
          </Text>
          <View style={{ gap: spacing.md }}>
            <View style={commonStyles.row}>
              <Icon name="shield-checkmark" size={20} style={{ color: colors.primary, marginRight: spacing.md }} />
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                Secure data management
              </Text>
            </View>
            <View style={commonStyles.row}>
              <Icon name="sync" size={20} style={{ color: colors.primary, marginRight: spacing.md }} />
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                Real-time synchronization
              </Text>
            </View>
            <View style={commonStyles.row}>
              <Icon name="phone-portrait" size={20} style={{ color: colors.primary, marginRight: spacing.md }} />
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                Cross-platform compatibility
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
