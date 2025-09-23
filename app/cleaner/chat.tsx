
import { Text, View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'supervisor' | 'system';
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'location' | 'alert';
  roomId: string; // Added roomId to associate messages with specific chat rooms
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'supervisor' | 'team' | 'emergency';
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
}

export default function ChatScreen() {
  console.log('ChatScreen rendered');

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    {
      id: '1',
      name: 'Supervisor - Sarah Wilson',
      type: 'supervisor',
      lastMessage: 'Great job on the office building today!',
      lastMessageTime: new Date(Date.now() - 300000), // 5 minutes ago
      unreadCount: 0,
      isOnline: true,
    },
    {
      id: '2',
      name: 'Team Chat',
      type: 'team',
      lastMessage: 'Mike: Anyone have extra disinfectant?',
      lastMessageTime: new Date(Date.now() - 900000), // 15 minutes ago
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: '3',
      name: 'Emergency Support',
      type: 'emergency',
      lastMessage: 'Emergency support is available 24/7',
      lastMessageTime: new Date(Date.now() - 86400000), // 1 day ago
      unreadCount: 0,
      isOnline: true,
    },
  ]);

  // Store all messages with roomId to separate them by chat room
  const [allMessages, setAllMessages] = useState<Message[]>([
    // Supervisor chat messages (roomId: '1')
    {
      id: '1',
      text: 'Good morning! Your tasks for today have been assigned.',
      sender: 'supervisor',
      senderName: 'Sarah Wilson',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      type: 'text',
      roomId: '1',
    },
    {
      id: '2',
      text: 'Thanks! I&apos;ll start with the office building.',
      sender: 'user',
      senderName: 'You',
      timestamp: new Date(Date.now() - 3540000), // 59 minutes ago
      type: 'text',
      roomId: '1',
    },
    {
      id: '3',
      text: 'Perfect. Remember to take photos for quality control.',
      sender: 'supervisor',
      senderName: 'Sarah Wilson',
      timestamp: new Date(Date.now() - 3480000), // 58 minutes ago
      type: 'text',
      roomId: '1',
    },
    {
      id: '4',
      text: 'Will do! Just finished the first floor.',
      sender: 'user',
      senderName: 'You',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      type: 'text',
      roomId: '1',
    },
    {
      id: '5',
      text: 'Great job on the office building today!',
      sender: 'supervisor',
      senderName: 'Sarah Wilson',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      type: 'text',
      roomId: '1',
    },
    // Team chat messages (roomId: '2')
    {
      id: '6',
      text: 'Hey everyone! How&apos;s the day going?',
      sender: 'system',
      senderName: 'Mike Johnson',
      timestamp: new Date(Date.now() - 2700000), // 45 minutes ago
      type: 'text',
      roomId: '2',
    },
    {
      id: '7',
      text: 'Going well! Almost done with the mall.',
      sender: 'system',
      senderName: 'Lisa Chen',
      timestamp: new Date(Date.now() - 2400000), // 40 minutes ago
      type: 'text',
      roomId: '2',
    },
    {
      id: '8',
      text: 'Anyone have extra disinfectant?',
      sender: 'system',
      senderName: 'Mike Johnson',
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      type: 'text',
      roomId: '2',
    },
    // Emergency chat messages (roomId: '3')
    {
      id: '9',
      text: 'Emergency support is available 24/7',
      sender: 'system',
      senderName: 'Emergency Support',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      type: 'text',
      roomId: '3',
    },
  ]);

  // Filter messages for the currently selected room
  const currentRoomMessages = selectedRoom 
    ? allMessages.filter(message => message.roomId === selectedRoom)
    : [];

  const sendMessage = () => {
    if (messageText.trim() && selectedRoom) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: messageText.trim(),
        sender: 'user',
        senderName: 'You',
        timestamp: new Date(),
        type: 'text',
        roomId: selectedRoom, // Associate message with current room
      };
      
      setAllMessages(prev => [...prev, newMessage]);
      setMessageText('');
      console.log('Message sent to room', selectedRoom, ':', newMessage.text);
      
      // Update the last message for the current room
      setChatRooms(prev => prev.map(room => 
        room.id === selectedRoom 
          ? { ...room, lastMessage: newMessage.text, lastMessageTime: newMessage.timestamp }
          : room
      ));
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const sendQuickMessage = (text: string) => {
    if (selectedRoom) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text,
        sender: 'user',
        senderName: 'You',
        timestamp: new Date(),
        type: 'text',
        roomId: selectedRoom, // Associate message with current room
      };
      
      setAllMessages(prev => [...prev, newMessage]);
      console.log('Quick message sent to room', selectedRoom, ':', text);
      
      // Update the last message for the current room
      setChatRooms(prev => prev.map(room => 
        room.id === selectedRoom 
          ? { ...room, lastMessage: text, lastMessageTime: newMessage.timestamp }
          : room
      ));
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'supervisor': return 'person-circle';
      case 'team': return 'people';
      case 'emergency': return 'warning';
      default: return 'chatbubble';
    }
  };

  const getRoomColor = (type: string) => {
    switch (type) {
      case 'supervisor': return colors.primary;
      case 'team': return colors.success;
      case 'emergency': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  if (!selectedRoom) {
    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <CompanyLogo size="small" showText={false} variant="light" />
            <Text style={commonStyles.headerTitle}>Messages</Text>
          </View>
          <TouchableOpacity onPress={() => console.log('New chat')}>
            <Icon name="add" size={24} style={{ color: colors.background }} />
          </TouchableOpacity>
        </View>

        <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
          {chatRooms.map(room => (
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
                  {room.isOnline && (
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: colors.success,
                      borderWidth: 2,
                      borderColor: colors.background,
                    }} />
                  )}
                </View>
                
                <View style={{ flex: 1 }}>
                  <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.xs }]}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {room.name}
                    </Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>
                      {room.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  
                  <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                    <Text 
                      style={[
                        typography.caption, 
                        { color: colors.textSecondary, flex: 1 }
                      ]}
                      numberOfLines={1}
                    >
                      {room.lastMessage}
                    </Text>
                    {room.unreadCount > 0 && (
                      <View style={{
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: spacing.sm,
                      }}>
                        <Text style={[typography.small, { color: colors.background, fontWeight: '600' }]}>
                          {room.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  const currentRoom = chatRooms.find(room => room.id === selectedRoom);

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={commonStyles.header}>
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
            {currentRoom?.isOnline && (
              <Text style={[typography.small, { color: colors.background, opacity: 0.8 }]}>Online</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => console.log('Chat options')}>
          <Icon name="ellipsis-vertical" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={[commonStyles.content, { paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {currentRoomMessages.map(message => (
          <View
            key={message.id}
            style={[
              {
                marginBottom: spacing.md,
                alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }
            ]}
          >
            {message.sender !== 'user' && (
              <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                {message.senderName}
              </Text>
            )}
            <View style={[
              {
                backgroundColor: message.sender === 'user' ? colors.primary : colors.backgroundAlt,
                padding: spacing.md,
                borderRadius: 16,
                borderBottomRightRadius: message.sender === 'user' ? 4 : 16,
                borderBottomLeftRadius: message.sender === 'user' ? 16 : 4,
              }
            ]}>
              <Text style={[
                typography.body,
                { color: message.sender === 'user' ? colors.background : colors.text }
              ]}>
                {message.text}
              </Text>
            </View>
            <Text style={[
              typography.small, 
              { 
                color: colors.textSecondary, 
                marginTop: spacing.xs,
                textAlign: message.sender === 'user' ? 'right' : 'left'
              }
            ]}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Quick Messages */}
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
                onPress={() => sendQuickMessage(quickMsg)}
              >
                <Text style={[typography.caption, { color: colors.text }]}>{quickMsg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Message Input */}
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
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: messageText.trim() ? colors.primary : colors.backgroundAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Icon 
            name="send" 
            size={20} 
            style={{ color: messageText.trim() ? colors.background : colors.textSecondary }} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
