import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Modal, ScrollView, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Menu, ChevronDown, Plus, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useChat } from '@/providers/ChatProvider';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { AVAILABLE_MODELS, ModelProvider } from '@/lib/ai/streaming-service';
import ChatInput from '@/components/ChatInput';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import { getMaxContentWidth, useBreakpoint, useIsDesktopLayout } from '@/lib/utils/responsive';

// Provider icons
const providerIcons: Record<ModelProvider, any> = {
  openai: require('@/assets/images/providers/openai.png'),
  anthropic: require('@/assets/images/providers/anthropic.png'),
  xai: require('@/assets/images/providers/grok.png'),
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { selectedModel, setSelectedModel, createConversation, activeConversation } = useChat();
  const isWeb = Platform.OS === 'web';
  const isDesktop = useIsDesktopLayout();
  const breakpoint = useBreakpoint();
  const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktop);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleOpenSettings = useCallback(() => {
    if (!isDesktop) setIsSidebarOpen(false);
    setIsSettingsOpen(true);
  }, [isDesktop]);

  const handleSelectModel = useCallback((model: typeof AVAILABLE_MODELS[0]) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedModel(model);
    setIsModelMenuOpen(false);
  }, [setSelectedModel]);

  const handleCloseSidebar = useCallback(() => {
    if (!isDesktop) setIsSidebarOpen(false);
  }, [isDesktop]);

  if (isWeb) {
    // Web Layout
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />

        {/* Web Layout: Sidebar + Main Content */}
        <View style={styles.webLayout}>
          {/* Sidebar - persistent on desktop, overlay on mobile/tablet web */}
          {(isDesktop || isSidebarOpen) && (
            <Sidebar
              isOpen={isDesktop || isSidebarOpen}
              onClose={handleCloseSidebar}
              onOpenSettings={handleOpenSettings}
            />
          )}

          {/* Main Content Area */}
          <View style={styles.webMainContent}>
            {/* Web Header */}
            <View style={[styles.webHeader, { paddingTop: spacing.md }]}>
              {/* Menu button for mobile web */}
              {!isDesktop && (
                <TouchableOpacity
                  style={styles.webMenuButton}
                  onPress={() => setIsSidebarOpen(true)}
                >
                  <View style={styles.menuLines}>
                    <View style={styles.menuLine} />
                    <View style={[styles.menuLine, styles.menuLineShort]} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Model Selector */}
              <TouchableOpacity
                style={styles.webModelSelector}
                onPress={() => setIsModelMenuOpen(true)}
                testID="header-model-selector"
              >
                <Image
                  source={providerIcons[selectedModel.provider]}
                  style={styles.headerModelIcon}
                  contentFit="contain"
                />
                <Text style={styles.modelName} numberOfLines={1}>
                  {selectedModel.name}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {/* New Chat Button */}
              <TouchableOpacity
                style={styles.webNewChatButton}
                onPress={handleNewChat}
                testID="header-new-chat"
              >
                <Plus size={18} color="#FFFFFF" />
                {breakpoint !== 'mobile' && (
                  <Text style={styles.webNewChatText}>New Chat</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Chat Content - Centered with max-width */}
            <View style={styles.webChatContainer}>
              <ChatInput />
            </View>
          </View>
        </View>

        <SettingsModal
          isVisible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Model Selection Dropdown - Web */}
        {isModelMenuOpen && (
          <Modal
            visible={isModelMenuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsModelMenuOpen(false)}
          >
            <TouchableOpacity
              style={styles.modelMenuOverlay}
              activeOpacity={1}
              onPress={() => setIsModelMenuOpen(false)}
            >
              <View style={[styles.webModelMenuContainer, !isDesktop && styles.webModelMenuContainerMobile]}>
                <View style={styles.modelMenuHeader}>
                  <Text style={styles.modelMenuTitle}>Select Model</Text>
                  <TouchableOpacity onPress={() => setIsModelMenuOpen(false)}>
                    <X size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modelMenuScroll} showsVerticalScrollIndicator={false}>
                  {AVAILABLE_MODELS.map((model) => (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelMenuItem,
                        selectedModel.id === model.id && styles.modelMenuItemSelected,
                      ]}
                      onPress={() => handleSelectModel(model)}
                    >
                      <Image
                        source={providerIcons[model.provider]}
                        style={styles.modelMenuItemIcon}
                        contentFit="contain"
                      />
                      <View style={styles.modelMenuItemContent}>
                        <Text style={styles.modelMenuItemName}>{model.name}</Text>
                        <Text style={styles.modelMenuItemProvider}>
                          {model.provider === 'openai' ? 'OpenAI' : model.provider === 'anthropic' ? 'Anthropic' : 'xAI'}
                        </Text>
                      </View>
                      {selectedModel.id === model.id && (
                        <Check size={18} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    );
  }

  // Mobile Layout
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header - Claude style */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {/* Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsSidebarOpen(true)}
          testID="menu-button"
        >
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, styles.menuLineShort]} />
          </View>
        </TouchableOpacity>

        {/* Model Selector - center */}
        <TouchableOpacity
          style={styles.modelSelector}
          onPress={() => {
            Haptics.selectionAsync();
            setIsModelMenuOpen(true);
          }}
          testID="header-model-selector"
        >
          <Text style={styles.modelName} numberOfLines={1}>
            {selectedModel.name}
          </Text>
          <ChevronDown size={18} color={colors.text} />
        </TouchableOpacity>

        {/* Ghost Icon / New Chat - Claude uses this icon */}
        <TouchableOpacity
          style={styles.ghostButton}
          onPress={handleNewChat}
          testID="header-new-chat"
        >
          <Plus size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ChatInput />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={handleOpenSettings}
      />

      <SettingsModal
        isVisible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Model Selection Dropdown */}
      <Modal
        visible={isModelMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModelMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modelMenuOverlay}
          activeOpacity={1}
          onPress={() => setIsModelMenuOpen(false)}
        >
          <View style={[styles.modelMenuContainer, { marginTop: insets.top + 60 }]}>
            <ScrollView style={styles.modelMenuScroll} showsVerticalScrollIndicator={false}>
              {AVAILABLE_MODELS.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelMenuItem,
                    selectedModel.id === model.id && styles.modelMenuItemSelected,
                  ]}
                  onPress={() => handleSelectModel(model)}
                >
                  <Image
                    source={providerIcons[model.provider]}
                    style={styles.modelMenuItemIcon}
                    contentFit="contain"
                  />
                  <View style={styles.modelMenuItemContent}>
                    <Text style={styles.modelMenuItemName}>{model.name}</Text>
                  </View>
                  {selectedModel.id === model.id && (
                    <Check size={18} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Web Layout Styles
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
    }),
  },
  webMainContent: {
    flex: 1,
    flexDirection: 'column',
    ...(Platform.OS === 'web' && {
      minWidth: 0,
      maxWidth: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    ...(Platform.OS === 'web' && {
      paddingHorizontal: spacing.xl,
      maxWidth: '100%',
      width: '100%',
    }),
  },
  webMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    }),
  },
  webModelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      userSelect: 'none',
    }),
  },
  headerModelIcon: {
    width: 20,
    height: 20,
  },
  webNewChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    marginLeft: 'auto',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease, transform 0.1s ease',
      userSelect: 'none',
    }),
  },
  webNewChatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  webChatContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      maxWidth: 900,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  webModelMenuContainer: {
    ...(Platform.OS === 'web' ? {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -200,
      marginLeft: -180,
      width: 360,
    } : {
      marginHorizontal: spacing.lg,
      marginTop: 60,
    }),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    maxHeight: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      borderWidth: 1,
      borderColor: colors.border,
    }),
  },
  webModelMenuContainerMobile: {
    ...(Platform.OS === 'web' && {
      position: 'absolute',
      top: 'auto',
      bottom: 0,
      left: 0,
      right: 0,
      marginTop: 0,
      marginLeft: 0,
      width: '100%',
      maxHeight: '70vh',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    }),
  },
  modelMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modelMenuItemProvider: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Mobile Layout Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLines: {
    gap: 5,
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  menuLineShort: {
    width: 12,
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modelName: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
  },
  ghostButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modelMenuContainer: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: 400,
    overflow: 'hidden',
  },
  modelMenuScroll: {
    padding: spacing.sm,
  },
  modelMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.surfaceHover,
      },
    }),
  },
  modelMenuItemSelected: {
    backgroundColor: colors.surfaceHover,
  },
  modelMenuItemIcon: {
    width: 24,
    height: 24,
  },
  modelMenuItemContent: {
    flex: 1,
  },
  modelMenuItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
});
