import React from "react";
import { Pressable, StyleSheet, Alert } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";

export function HeaderRightButton() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => Alert.alert("Not Implemented", "This feature is not implemented yet")}
      style={styles.headerButtonContainer}
    >
      <IconSymbol ios_icon_name="plus" android_material_icon_name="add" color={theme.colors.primary} />
    </Pressable>
  );
}

export function HeaderLeftButton() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => Alert.alert("Not Implemented", "This feature is not implemented yet")}
      style={styles.headerButtonContainer}
    >
      <IconSymbol ios_icon_name="gear" android_material_icon_name="settings" color={theme.colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButtonContainer: {
    padding: 8,
    backgroundColor: '#F4F5F7', // Light background to make button visible
    borderRadius: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
