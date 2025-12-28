import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ChevronRight, X } from 'lucide-react-native';
import { useChat } from '@/providers/ChatProvider';
import { Conversation } from '@/lib/types/chat';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { getSidebarWidth } from '@/lib/utils/responsive';

// Anthropic logo image with text
const anthropicLogoImage = require('@/assets/images/providers/anthropic-text.png');

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ConversationItem = React.memo<ConversationItemProps>(({
  conversation,
  isActive,
  onSelect,
  onDelete,
}) => {
  const handleLongPress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this conversation?')) {
        onDelete();
      }
    } else {
      Alert.alert(
        'Delete Conversation',
        'Are you sure you want to delete this conversation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={onSelect}
      onLongPress={handleLongPress}
      testID={`conversation-${conversation.id}`}
    >
      <Text
        style={[styles.conversationTitle, isActive && styles.conversationTitleActive]}
        numberOfLines={1}
      >
        {conversation.title}
      </Text>
    </TouchableOpacity>
  );
});

ConversationItem.displayName = 'ConversationItem';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ isOpen, onClose, onOpenSettings }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
  } = useChat();

  const isWeb = Platform.OS === 'web';
  const slideAnim = useRef(new Animated.Value(isWeb ? 0 : -320)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWeb) {
      // On web, sidebar is always visible, no animation needed
      return;
    }
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: isOpen ? 0 : -320,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, slideAnim, overlayOpacity, isWeb]);

  const handleNewChat = useCallback(() => {
    createConversation();
    onClose();
  }, [createConversation, onClose]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      onClose();
    },
    [setActiveConversationId, onClose]
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        isActive={item.id === activeConversationId}
        onSelect={() => handleSelectConversation(item.id)}
        onDelete={() => deleteConversation(item.id)}
      />
    ),
    [activeConversationId, handleSelectConversation, deleteConversation]
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  if (!isOpen && !isWeb) return null;

  // Web: Persistent sidebar, no overlay
  if (isWeb) {
    return (
      <View style={styles.webSidebar}>
        <View style={[styles.sidebar, { paddingTop: spacing.lg }]}>
          {/* Anthropic Logo */}
          <View style={styles.logoContainer}>
            <Image source={anthropicLogoImage} style={styles.anthropicLogo} contentFit="contain" />
          </View>

          {/* Recents Section */}
          <Text style={styles.sectionTitle}>Recents</Text>

          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={keyExtractor}
            style={styles.conversationList}
            contentContainerStyle={styles.conversationListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>No conversations yet</Text>
              </View>
            }
          />

          {/* All Chats Link */}
          <TouchableOpacity style={styles.allChatsButton} onPress={onOpenSettings}>
            <Text style={styles.allChatsText}>All chats</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* User Profile at Bottom */}
          <View style={[styles.footer, { paddingBottom: spacing.lg }]}>
            <TouchableOpacity style={styles.userProfile} onPress={handleNewChat}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>S</Text>
              </View>
              <Text style={styles.userName}>Sahnd</Text>
            </TouchableOpacity>

            {/* New Chat Button - Web style */}
            <TouchableOpacity
              style={styles.webNewChatButton}
              onPress={handleNewChat}
              testID="new-chat-button"
            >
              <Text style={styles.webNewChatButtonText}>New Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Mobile: Animated sidebar with overlay
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.overlayBackground, { opacity: overlayOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sidebar,
          { paddingTop: insets.top + spacing.lg, transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Anthropic Logo */}
        <View style={styles.logoContainer}>
          <Image source={anthropicLogoImage} style={styles.anthropicLogo} contentFit="contain" />
        </View>

        {/* Recents Section */}
        <Text style={styles.sectionTitle}>Recents</Text>

        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={keyExtractor}
          style={styles.conversationList}
          contentContainerStyle={styles.conversationListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No conversations yet</Text>
            </View>
          }
        />

        {/* All Chats Link */}
        <TouchableOpacity style={styles.allChatsButton} onPress={onOpenSettings}>
          <Text style={styles.allChatsText}>All chats</Text>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* User Profile at Bottom */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <TouchableOpacity style={styles.userProfile} onPress={handleNewChat}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>S</Text>
            </View>
            <Text style={styles.userName}>Sahnd</Text>
          </TouchableOpacity>

          {/* New Chat FAB */}
          <TouchableOpacity
            style={styles.newChatFab}
            onPress={handleNewChat}
            testID="new-chat-button"
          >
            <View style={styles.newChatFabIcon}>
              <Text style={styles.newChatFabPlus}>+</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Web Sidebar
  webSidebar: {
    width: Platform.OS === 'web' ? getSidebarWidth() : 320,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...(Platform.OS === 'web' && {
      minWidth: 240,
      maxWidth: 360,
      flexShrink: 0,
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: colors.border,
        borderRadius: '3px',
        '&:hover': {
          background: colors.borderLight,
        },
      },
    }),
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  sidebar: {
    ...(Platform.OS === 'web' ? {
      flex: 1,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
    } : {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: 320,
    }),
    backgroundColor: colors.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    ...(Platform.OS === 'web' && {
      paddingTop: spacing.lg,
    }),
  },
  anthropicLogo: {
    width: 140,
    height: 32,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  conversationList: {
    flex: 1,
  },
  conversationListContent: {
    paddingHorizontal: spacing.md,
  },
  conversationItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      borderRadius: borderRadius.md,
      marginHorizontal: spacing.sm,
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.surface,
      },
      ':active': {
        backgroundColor: colors.surfaceHover,
      },
    }),
  },
  conversationTitle: {
    ...typography.sidebarItem,
    color: colors.text,
  },
  conversationTitleActive: {
    color: colors.text,
    fontWeight: '500' as const,
  },
  emptyList: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  allChatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.15s ease',
      userSelect: 'none',
      borderRadius: borderRadius.md,
      marginHorizontal: spacing.sm,
      ':hover': {
        backgroundColor: colors.surface,
        opacity: 1,
      },
    }),
  },
  allChatsText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    ...(Platform.OS === 'web' && {
      marginTop: 'auto',
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    }),
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.15s ease',
      userSelect: 'none',
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      ':hover': {
        backgroundColor: colors.surface,
        opacity: 0.9,
      },
    }),
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  userName: {
    ...typography.body,
    color: colors.text,
  },
  newChatFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatFabIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatFabPlus: {
    fontSize: 28,
    fontWeight: '300' as const,
    color: colors.text,
    marginTop: -2,
  },
  // Web-specific styles
  webNewChatButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease, transform 0.1s ease',
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.accentLight,
        transform: 'translateY(-1px)',
      },
      ':active': {
        transform: 'translateY(0)',
        backgroundColor: colors.accentMuted,
      },
    }),
  },
  webNewChatButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    fontSize: 14,
  },
});
