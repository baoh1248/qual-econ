
import { Text, View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useChatData } from '../../hooks/useChatData';
import { useClientData } from '../../hooks/useClientData';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/Button';

export default function ChatScreen() {
  const { themeColor } = useTheme();
  const {
    chatRooms,
    messages,
    isLoading,
    currentUserId,
    isAuthenticated,
    loadMessages,
    createChatRoom,
    sendMessage,
    markAsRead,
    subscribeToRoom,
    unsubscribeFromRoom,
  } = useChatData();
  const { cleaners } = useClientData();

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatType, setNewChatType] = useState<'direct' | 'group' | 'emergency'>('group');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  console.log('ChatScreen rendered');
  console.log('Is authenticated:', isAuthenticated);
  console.log('Current user ID:', currentUserId);

  const currentRoomMessages = selectedRoom ? messages[selectedRoom] || [] : [];
  const currentRoom = chatRooms.find(room => room.id === selectedRoom);

  const loadMessagesCallback = useCallback(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
    }
  }, [selectedRoom, loadMessages]);

  const markAsReadCallback = useCallback(() => {
    if (selectedRoom) {
      markAsRead(selectedRoom);
    }
  }, [selectedRoom, markAsRead]);

  const subscribeToRoomCallback = useCallback(() => {
    if (selectedRoom) {
      subscribeToRoom(selectedRoom);
    }
  }, [selectedRoom, subscribeToRoom]);

  const unsubscribeFromRoomCallback = useCallback(() => {
    if (selectedRoom) {
      unsubscribeFromRoom(selectedRoom);
    }
  }, [selectedRoom, unsubscribeFromRoom]);

  useEffect(() => {
    if (selectedRoom) {
      loadMessagesCallback();
      subscribeToRoomCallback();
      markAsReadCallback();

      return () => {
        unsubscribeFromRoomCallback();
      };
    }
  }, [selectedRoom, loadMessagesCallback, subscribeToRoomCallback, markAsReadCallback, unsubscribeFromRoomCallback]);

  const handleSendMessage = async () => {
    if (messageText.trim() && selectedRoom) {
      try {
        await sendMessage(selectedRoom, messageText.trim());
        setMessageText('');
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Failed to send message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };

  const handleQuickMessage = async (text: string) => {
    if (selectedRoom) {
      try {
        await sendMessage(selectedRoom, text);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Failed to send quick message:', error);
      }
    }
  };

  const handleCreateChatRoom = async () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat room name');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Creating chat room with:', {
        name: newChatName,
        type: newChatType,
        members: selectedMembers,
      });
      
      await createChatRoom(newChatName, newChatType, selectedMembers);
      
      setShowNewChatModal(false);
      setNewChatName('');
      setSelectedMembers([]);
      Alert.alert('Success', 'Chat room created successfully!');
    } catch (error) {
      console.error('Failed to create chat room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat room. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'direct': return 'person-circle';
      case 'group': return 'people';
      case 'emergency': return 'warning';
      default: return 'chatbubble';
    }
  };

  const getRoomColor = (type: string) => {
    switch (type) {
      case 'direct': return themeColor;
      case 'group': return colors.success;
      case 'emergency': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={commonStyles.container}>
        <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Messages</Text>
          <View style={{ width: 24 }} />
        </View>
        <LoadingSpinner />
      </View>
    );
  }

  if (!selectedRoom) {
    return (
      <View style={commonStyles.container}>
        <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <CompanyLogo size="small" showText={false} variant="light" />
            <Text style={commonStyles.headerTitle}>Messages</Text>
          </View>
          <TouchableOpacity onPress={() => setShowNewChatModal(true)}>
            <Icon name="add" size={24} style={{ color: colors.background }} />
          </TouchableOpacity>
        </View>

        <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
          {chatRooms.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
              <Icon name="chatbubbles-outline" size={64} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No conversations yet.{'\n'}Start a new chat to get started!
              </Text>
            </View>
          ) : (
            chatRooms.map(room => (
              <TouchableOpacity
                key={room.id}
                style={[commonStyles.card, { marginBottom: spacing.sm }]}
                onPress={() => {
                  console.log('Selected chat room:', room.id, room.name);
                  setSelectedRoom(room.id);
                }}
              >
                <View style={[commonStyles.row, { alignItems: 'flex-start' }]}>
                  <View style={{ position: 'relative', marginRight: spacing.md }}>
                    <Icon 
                      name={getRoomIcon(room.type) as any} 
                      size={32} 
                      style={{ color: getRoomColor(room.type) }} 
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {room.name}
                      </Text>
                      {room.last_message_time && (
                        <Text style={[typography.small, { color: colors.textSecondary }]}>
                          {room.last_message_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                    
                    <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                      <Text 
                        style={[
                          typography.caption, 
                          { color: colors.textSecondary, flex: 1 }
                        ]}
                        numberOfLines={1}
                      >
                        {room.last_message || 'No messages yet'}
                      </Text>
                      {room.unread_count > 0 && (
                        <View style={{
                          backgroundColor: themeColor,
                          borderRadius: 10,
                          minWidth: 20,
                          height: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: spacing.sm,
                        }}>
                          <Text style={[typography.small, { color: colors.background, fontWeight: '600' }]}>
                            {room.unread_count}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <Modal
          visible={showNewChatModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNewChatModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.lg }]}>
                <Text style={[typography.h2, { color: colors.text }]}>New Chat Room</Text>
                <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                  <Icon name="close" size={24} style={{ color: colors.text }} />
                </TouchableOpacity>
              </View>

              <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                Room Name
              </Text>
              <TextInput
                style={[commonStyles.textInput, { marginBottom: spacing.md }]}
                placeholder="Enter room name"
                placeholderTextColor={colors.textSecondary}
                value={newChatName}
                onChangeText={setNewChatName}
              />

              <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                Room Type
              </Text>
              <View style={[commonStyles.row, { gap: spacing.sm, marginBottom: spacing.md }]}>
                {(['group', 'emergency'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newChatType === type && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setNewChatType(type)}
                  >
                    <Text style={[
                      typography.body,
                      { color: newChatType === type ? colors.background : colors.text }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
                Select Members
              </Text>
              <ScrollView style={{ maxHeight: 200, marginBottom: spacing.md }}>
                {cleaners
                  .filter(cleaner => cleaner.user_id && cleaner.user_id !== currentUserId)
                  .map(cleaner => (
                    <TouchableOpacity
                      key={cleaner.id}
                      style={[
                        styles.memberItem,
                        selectedMembers.includes(cleaner.user_id!) && { backgroundColor: themeColor + '20' }
                      ]}
                      onPress={() => cleaner.user_id && toggleMemberSelection(cleaner.user_id)}
                    >
                      <Text style={[typography.body, { color: colors.text }]}>
                        {cleaner.name}
                      </Text>
                      {selectedMembers.includes(cleaner.user_id!) && (
                        <Icon name="checkmark-circle" size={20} style={{ color: themeColor }} />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Button
                title={isCreating ? "Creating..." : "Create Chat Room"}
                onPress={handleCreateChatRoom}
                variant="primary"
                disabled={isCreating}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <TouchableOpacity onPress={() => {
          console.log('Going back to chat room list');
          setSelectedRoom(null);
        }}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <View style={{ alignItems: 'center' }}>
            <Text style={[commonStyles.headerTitle, { fontSize: 18 }]}>{currentRoom?.name}</Text>
            <Text style={[typography.small, { color: colors.background, opacity: 0.8 }]}>
              {currentRoom?.members?.length || 0} members
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push(`/cleaner/chat-room-settings?roomId=${selectedRoom}`)}>
          <Icon name="ellipsis-vertical" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={[commonStyles.content, { paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {currentRoomMessages.map(message => {
          const isOwnMessage = message.sender_id === currentUserId;
          
          return (
            <View
              key={message.id}
              style={[
                {
                  marginBottom: spacing.md,
                  alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }
              ]}
            >
              {!isOwnMessage && (
                <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                  {message.sender_name}
                </Text>
              )}
              <View style={[
                {
                  backgroundColor: isOwnMessage ? themeColor : colors.backgroundAlt,
                  padding: spacing.md,
                  borderRadius: 16,
                  borderBottomRightRadius: isOwnMessage ? 4 : 16,
                  borderBottomLeftRadius: isOwnMessage ? 16 : 4,
                }
              ]}>
                <Text style={[
                  typography.body,
                  { color: isOwnMessage ? colors.background : colors.text }
                ]}>
                  {message.content}
                </Text>
              </View>
              <Text style={[
                typography.small, 
                { 
                  color: colors.textSecondary, 
                  marginTop: spacing.xs,
                  textAlign: isOwnMessage ? 'right' : 'left'
                }
              ]}>
                {formatTime(message.created_at)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ padding: spacing.md, backgroundColor: colors.backgroundAlt }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[commonStyles.row, { gap: spacing.sm }]}>
            {[
              'Task completed ✅',
              'Need assistance 🆘',
              'Running late ⏰',
              'All good 👍',
              'Break time ☕',
            ].map((quickMsg, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  {
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.background,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => handleQuickMessage(quickMsg)}
              >
                <Text style={[typography.caption, { color: colors.text }]}>{quickMsg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={[
        {
          flexDirection: 'row',
          padding: spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          alignItems: 'flex-end',
        }
      ]}>
        <TextInput
          style={[
            commonStyles.textInput,
            { 
              flex: 1, 
              marginRight: spacing.sm,
              maxHeight: 100,
            }
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: messageText.trim() ? themeColor : colors.backgroundAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <Icon 
            name="send" 
            size={20} 
            style={{ color: messageText.trim() ? colors.background : colors.textSecondary }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
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
