
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'emergency';
  owner_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  description?: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: Date;
  unread_count: number;
  members?: ChatRoomMember[];
}

export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: 'text' | 'image' | 'location' | 'alert' | 'system';
  metadata?: any;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  reply_to_id?: string;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'failed';
}

const STORAGE_KEYS = {
  CHAT_ROOMS: 'chat_rooms_v1',
  MESSAGES: 'messages_v1',
  TEST_USER_ID: 'test_user_id_v1',
};

// TEST MODE: Set to true to bypass authentication
const TEST_MODE = true;

export const useChatData = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<{ [roomId: string]: Message[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: string[] }>({});
  
  const subscriptionsRef = useRef<{ [key: string]: any }>({});
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Get or create test user ID
  const getTestUserId = async () => {
    try {
      let testUserId = await AsyncStorage.getItem(STORAGE_KEYS.TEST_USER_ID);
      if (!testUserId) {
        testUserId = uuid.v4() as string;
        await AsyncStorage.setItem(STORAGE_KEYS.TEST_USER_ID, testUserId);
        console.log('🧪 Created new test user ID:', testUserId);
      } else {
        console.log('🧪 Using existing test user ID:', testUserId);
      }
      return testUserId;
    } catch (error) {
      console.error('❌ Error getting test user ID:', error);
      return uuid.v4() as string;
    }
  };

  // Get current user and verify authentication
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (TEST_MODE) {
          console.log('🧪 TEST MODE: Bypassing authentication');
          const testUserId = await getTestUserId();
          setCurrentUserId(testUserId);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        console.log('🔐 Checking authentication status...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (!session) {
          console.log('⚠️ No active session found');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log('✅ Session found:', session.user.id);
        setCurrentUserId(session.user.id);
        setIsAuthenticated(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ User error:', userError);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (user) {
          console.log('✅ User authenticated:', user.id, user.email);
          setCurrentUserId(user.id);
          setIsAuthenticated(true);
        } else {
          console.log('⚠️ No user found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    getCurrentUser();

    if (!TEST_MODE) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('🔄 Auth state changed:', _event, session?.user?.id);
        if (session?.user) {
          setCurrentUserId(session.user.id);
          setIsAuthenticated(true);
        } else {
          setCurrentUserId(null);
          setIsAuthenticated(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Load chat rooms
  const loadChatRooms = useCallback(async () => {
    if (!currentUserId) {
      console.log('⚠️ Cannot load chat rooms: No user ID');
      setIsLoading(false);
      return [];
    }

    if (!TEST_MODE && !isAuthenticated) {
      console.log('⚠️ Cannot load chat rooms: Not authenticated');
      setIsLoading(false);
      return [];
    }

    try {
      console.log('🔄 Loading chat rooms from Supabase...');
      setIsLoading(true);
      
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_room_members!inner(
            id,
            user_id,
            role,
            joined_at,
            last_read_at,
            is_muted
          )
        `)
        .eq('chat_room_members.user_id', currentUserId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (roomsError) {
        console.error('❌ Error loading chat rooms:', roomsError);
        throw roomsError;
      }

      if (!roomsData || roomsData.length === 0) {
        console.log('⚠️ No chat rooms found');
        setChatRooms([]);
        setIsLoading(false);
        return [];
      }

      const roomsWithMessages = await Promise.all(
        roomsData.map(async (room) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('room_id', room.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { data: unreadData } = await supabase
            .rpc('get_unread_count', {
              p_room_id: room.id,
              p_user_id: currentUserId
            });

          return {
            id: room.id,
            name: room.name,
            type: room.type,
            owner_id: room.owner_id,
            created_at: room.created_at,
            updated_at: room.updated_at,
            is_active: room.is_active,
            description: room.description,
            avatar_url: room.avatar_url,
            last_message: lastMessage?.content,
            last_message_time: lastMessage ? new Date(lastMessage.created_at) : undefined,
            unread_count: unreadData || 0,
            members: room.chat_room_members,
          };
        })
      );

      console.log(`✅ Loaded ${roomsWithMessages.length} chat rooms`);
      setChatRooms(roomsWithMessages);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(roomsWithMessages));
      setIsLoading(false);
      
      return roomsWithMessages;
    } catch (error) {
      console.error('❌ Failed to load chat rooms:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chat rooms');
      
      const localData = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
      if (localData) {
        const rooms = JSON.parse(localData);
        setChatRooms(rooms);
      }
      
      setIsLoading(false);
      return [];
    }
  }, [currentUserId, isAuthenticated]);

  // Load messages for a specific room
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      console.log('🔄 Loading messages for room:', roomId);
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Error loading messages:', messagesError);
        throw messagesError;
      }

      const messagesWithNames = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: userData } = await supabase
            .from('cleaners')
            .select('name')
            .eq('user_id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender_name: userData?.name || 'Test User',
            delivery_status: 'delivered' as const,
          };
        })
      );

      console.log(`✅ Loaded ${messagesWithNames.length} messages`);
      setMessages(prev => ({ ...prev, [roomId]: messagesWithNames }));
      
      return messagesWithNames;
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      return [];
    }
  }, []);

  // Create a new chat room
  const createChatRoom = useCallback(async (
    name: string,
    type: 'direct' | 'group' | 'emergency',
    memberIds: string[],
    description?: string
  ) => {
    if (!currentUserId) {
      const errorMsg = 'No user ID available';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    if (!TEST_MODE && !isAuthenticated) {
      const errorMsg = 'You must be logged in to create a chat room';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log('🔄 Creating chat room:', name);
      console.log('Current user ID:', currentUserId);
      console.log('Test mode:', TEST_MODE);
      
      if (!TEST_MODE) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          const errorMsg = 'Authentication session expired. Please log in again.';
          console.error('❌', errorMsg, sessionError);
          throw new Error(errorMsg);
        }

        console.log('✅ Session verified, creating room...');
      }
      
      const roomId = uuid.v4() as string;
      
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          id: roomId,
          name,
          type,
          owner_id: currentUserId,
          description,
          is_active: true,
        })
        .select()
        .single();

      if (roomError) {
        console.error('❌ Error creating chat room:', roomError);
        console.error('Error details:', JSON.stringify(roomError, null, 2));
        throw roomError;
      }

      console.log('✅ Chat room created:', roomData.id);

      const members = [
        { 
          id: uuid.v4() as string,
          room_id: roomData.id, 
          user_id: currentUserId, 
          role: 'owner' as const
        },
        ...memberIds.map(userId => ({
          id: uuid.v4() as string,
          room_id: roomData.id,
          user_id: userId,
          role: 'member' as const,
        })),
      ];

      console.log('🔄 Adding members:', members.length);

      const { error: membersError } = await supabase
        .from('chat_room_members')
        .insert(members);

      if (membersError) {
        console.error('❌ Error adding members:', membersError);
        console.error('Error details:', JSON.stringify(membersError, null, 2));
        throw membersError;
      }

      console.log('✅ Chat room created successfully');
      await loadChatRooms();
      
      return roomData;
    } catch (error) {
      console.error('❌ Failed to create chat room:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create chat room. Please try again.');
    }
  }, [currentUserId, isAuthenticated, loadChatRooms]);

  // Add member to chat room
  const addMemberToRoom = useCallback(async (roomId: string, userId: string) => {
    try {
      console.log('🔄 Adding member to room:', roomId, userId);
      
      const { error } = await supabase
        .from('chat_room_members')
        .insert({
          id: uuid.v4() as string,
          room_id: roomId,
          user_id: userId,
          role: 'member',
        });

      if (error) {
        console.error('❌ Error adding member:', error);
        throw error;
      }

      console.log('✅ Member added successfully');
      await loadChatRooms();
    } catch (error) {
      console.error('❌ Failed to add member:', error);
      throw error;
    }
  }, [loadChatRooms]);

  // Remove member from chat room
  const removeMemberFromRoom = useCallback(async (roomId: string, userId: string) => {
    try {
      console.log('🔄 Removing member from room:', roomId, userId);
      
      const { error } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing member:', error);
        throw error;
      }

      console.log('✅ Member removed successfully');
      await loadChatRooms();
    } catch (error) {
      console.error('❌ Failed to remove member:', error);
      throw error;
    }
  }, [loadChatRooms]);

  // Send a message
  const sendMessage = useCallback(async (
    roomId: string,
    content: string,
    messageType: 'text' | 'image' | 'location' | 'alert' | 'system' = 'text',
    metadata?: any
  ) => {
    const tempId = `temp-${Date.now()}`;
    
    // Optimistically add message to UI
    const tempMessage: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId!,
      sender_name: 'You',
      content,
      message_type: messageType,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      delivery_status: 'sending',
    };

    setMessages(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), tempMessage],
    }));

    try {
      console.log('🔄 Sending message to room:', roomId);
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          id: uuid.v4() as string,
          room_id: roomId,
          sender_id: currentUserId,
          content,
          message_type: messageType,
          metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        
        // Update message status to failed
        setMessages(prev => ({
          ...prev,
          [roomId]: prev[roomId].map(msg =>
            msg.id === tempId ? { ...msg, delivery_status: 'failed' as const } : msg
          ),
        }));
        
        throw error;
      }

      console.log('✅ Message sent successfully');
      
      // Replace temp message with real message
      setMessages(prev => ({
        ...prev,
        [roomId]: prev[roomId].map(msg =>
          msg.id === tempId ? { ...data, sender_name: 'You', delivery_status: 'sent' as const } : msg
        ),
      }));
      
      // Update room's updated_at
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      return data;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [currentUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('❌ Error marking as read:', error);
        throw error;
      }

      setChatRooms(prev =>
        prev.map(room =>
          room.id === roomId ? { ...room, unread_count: 0 } : room
        )
      );
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    }
  }, [currentUserId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((roomId: string, isTyping: boolean) => {
    if (!currentUserId) return;

    const channel = subscriptionsRef.current[`${roomId}-typing`];
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: currentUserId,
          is_typing: isTyping,
        },
      });
    }
  }, [currentUserId]);

  // Subscribe to real-time updates
  const subscribeToRoom = useCallback((roomId: string) => {
    if (subscriptionsRef.current[roomId]) {
      console.log('Already subscribed to room:', roomId);
      return;
    }

    console.log('🔄 Subscribing to room:', roomId);

    // Subscribe to messages
    const messageChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('📨 New message received:', payload);
          
          const { data: userData } = await supabase
            .from('cleaners')
            .select('name')
            .eq('user_id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            sender_name: userData?.name || 'Test User',
            delivery_status: 'delivered' as const,
          } as Message;

          setMessages(prev => ({
            ...prev,
            [roomId]: [...(prev[roomId] || []), newMessage],
          }));

          await loadChatRooms();
        }
      )
      .subscribe();

    subscriptionsRef.current[roomId] = messageChannel;

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`room:${roomId}-typing`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, is_typing } = payload.payload;
        
        if (user_id === currentUserId) return;

        setTypingUsers(prev => {
          const roomTyping = prev[roomId] || [];
          
          if (is_typing) {
            if (!roomTyping.includes(user_id)) {
              return { ...prev, [roomId]: [...roomTyping, user_id] };
            }
          } else {
            return { ...prev, [roomId]: roomTyping.filter(id => id !== user_id) };
          }
          
          return prev;
        });

        // Clear typing indicator after 3 seconds
        if (typingTimeoutRef.current[user_id]) {
          clearTimeout(typingTimeoutRef.current[user_id]);
        }
        
        if (is_typing) {
          typingTimeoutRef.current[user_id] = setTimeout(() => {
            setTypingUsers(prev => ({
              ...prev,
              [roomId]: (prev[roomId] || []).filter(id => id !== user_id),
            }));
          }, 3000);
        }
      })
      .subscribe();

    subscriptionsRef.current[`${roomId}-typing`] = typingChannel;
  }, [loadChatRooms, currentUserId]);

  // Unsubscribe from room
  const unsubscribeFromRoom = useCallback((roomId: string) => {
    if (subscriptionsRef.current[roomId]) {
      console.log('🔄 Unsubscribing from room:', roomId);
      supabase.removeChannel(subscriptionsRef.current[roomId]);
      delete subscriptionsRef.current[roomId];
    }
    
    if (subscriptionsRef.current[`${roomId}-typing`]) {
      supabase.removeChannel(subscriptionsRef.current[`${roomId}-typing`]);
      delete subscriptionsRef.current[`${roomId}-typing`];
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (currentUserId && (TEST_MODE || isAuthenticated)) {
      loadChatRooms();
    }
  }, [currentUserId, isAuthenticated, loadChatRooms]);

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      Object.keys(subscriptionsRef.current).forEach(roomId => {
        unsubscribeFromRoom(roomId);
      });
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [unsubscribeFromRoom]);

  return {
    chatRooms,
    messages,
    isLoading,
    error,
    currentUserId,
    isAuthenticated: TEST_MODE ? true : isAuthenticated,
    typingUsers,
    loadChatRooms,
    loadMessages,
    createChatRoom,
    addMemberToRoom,
    removeMemberFromRoom,
    sendMessage,
    markAsRead,
    subscribeToRoom,
    unsubscribeFromRoom,
    sendTypingIndicator,
  };
};
