
import { Text, View, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useChatData } from '../../hooks/useChatData';
import { useClientData } from '../../hooks/useClientData';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/Button';

export default function ChatRoomSettingsScreen() {
  const { themeColor } = useTheme();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const {
    chatRooms,
    currentUserId,
    addMemberToRoom,
    removeMemberFromRoom,
    loadChatRooms,
  } = useChatData();
  const { cleaners } = useClientData();

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentRoom = chatRooms.find(room => room.id === roomId);
  const isOwner = currentRoom?.owner_id === currentUserId;

  console.log('ChatRoomSettingsScreen rendered for room:', roomId);

  const loadChatRoomsCallback = useCallback(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  useEffect(() => {
    loadChatRoomsCallback();
  }, [loadChatRoomsCallback]);

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member to add');
      return;
    }

    setIsLoading(true);
    try {
      for (const userId of selectedNewMembers) {
        await addMemberToRoom(roomId!, userId);
      }
      setShowAddMemberModal(false);
      setSelectedNewMembers([]);
      Alert.alert('Success', 'Members added successfully!');
    } catch (error) {
      console.error('Failed to add members:', error);
      Alert.alert('Error', 'Failed to add members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${userName} from this chat room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromRoom(roomId!, userId);
              Alert.alert('Success', 'Member removed successfully!');
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleNewMemberSelection = (userId: string) => {
    setSelectedNewMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!currentRoom) {
    return (
      <View style={commonStyles.container}>
        <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Chat Room Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Chat room not found
          </Text>
        </View>
      </View>
    );
  }

  const currentMemberIds = currentRoom.members?.map(m => m.user_id) || [];
  const availableCleaners = cleaners.filter(
    cleaner => cleaner.user_id && !currentMemberIds.includes(cleaner.user_id)
  );

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Room Settings</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
            {currentRoom.name}
          </Text>
          {currentRoom.description && (
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              {currentRoom.description}
            </Text>
          )}
          <View style={[commonStyles.row, { gap: spacing.sm }]}>
            <View style={[styles.badge, { backgroundColor: themeColor + '20' }]}>
              <Text style={[typography.caption, { color: themeColor }]}>
                {currentRoom.type.toUpperCase()}
              </Text>
            </View>
            {isOwner && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[typography.caption, { color: colors.success }]}>
                  OWNER
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
          <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
            <Text style={[typography.h3, { color: colors.text }]}>
              Members ({currentRoom.members?.length || 0})
            </Text>
            {isOwner && (
              <TouchableOpacity onPress={() => setShowAddMemberModal(true)}>
                <Icon name="add-circle" size={24} style={{ color: themeColor }} />
              </TouchableOpacity>
            )}
          </View>

          {currentRoom.members?.map(member => {
            const cleaner = cleaners.find(c => c.user_id === member.user_id);
            const isCurrentUser = member.user_id === currentUserId;
            const isMemberOwner = member.role === 'owner';

            return (
              <View
                key={member.id}
                style={[
                  commonStyles.row,
                  commonStyles.spaceBetween,
                  {
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {cleaner?.name || 'Unknown User'}
                    {isCurrentUser && ' (You)'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Text>
                </View>

                {isOwner && !isCurrentUser && !isMemberOwner && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member.user_id, cleaner?.name || 'Unknown User')}
                  >
                    <Icon name="remove-circle" size={24} style={{ color: colors.danger }} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {!isOwner && (
          <View style={[commonStyles.card, { backgroundColor: colors.backgroundAlt }]}>
            <Icon name="information-circle" size={24} style={{ color: colors.info, marginBottom: spacing.sm }} />
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Only the room owner can add or remove members.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.lg }]}>
              <Text style={[typography.h2, { color: colors.text }]}>Add Members</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <Icon name="close" size={24} style={{ color: colors.text }} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400, marginBottom: spacing.md }}>
              {availableCleaners.length === 0 ? (
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                  No available members to add
                </Text>
              ) : (
                availableCleaners.map(cleaner => (
                  <TouchableOpacity
                    key={cleaner.id}
                    style={[
                      styles.memberItem,
                      selectedNewMembers.includes(cleaner.user_id!) && { backgroundColor: themeColor + '20' }
                    ]}
                    onPress={() => cleaner.user_id && toggleNewMemberSelection(cleaner.user_id)}
                  >
                    <Text style={[typography.body, { color: colors.text }]}>
                      {cleaner.name}
                    </Text>
                    {selectedNewMembers.includes(cleaner.user_id!) && (
                      <Icon name="checkmark-circle" size={20} style={{ color: themeColor }} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <Button
              title={isLoading ? 'Adding...' : 'Add Selected Members'}
              onPress={handleAddMembers}
              variant="primary"
              disabled={isLoading || selectedNewMembers.length === 0}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
