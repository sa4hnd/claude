import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Keyboard,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Modal,
  ActionSheetIOS,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useMarkdown, type MarkedStyles, type useMarkdownHookOptions } from 'react-native-marked';
import {
  Plus,
  X,
  Mic,
  Square,
  Image as ImageIcon,
  Camera,
  FileText,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Brain,
  Copy,
  RefreshCw,
  Globe,
} from 'lucide-react-native';
import { useChat } from '@/providers/ChatProvider';
import { ImageAttachment, FileAttachment, Message } from '@/lib/types/chat';
import { AVAILABLE_MODELS } from '@/lib/ai/streaming-service';
import { transcribeFromBase64 } from '@/lib/ai/transcription-service';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { getMaxContentWidth } from '@/lib/utils/responsive';

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
  if (Platform.OS === 'web') return;
  switch (type) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'selection':
      Haptics.selectionAsync();
      break;
  }
};

const NUM_WAVEFORM_BARS = 20;
const METERING_INTERVAL = 50;

// Claude logo image (PNG with transparent background)
const claudeLogoImage = require('@/assets/images/claude-logo.png');

// Spinning Claude Logo for loading states - spins in place
const SpinningClaudeLogo = React.memo<{ size?: number }>(({ size = 24 }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.Image
        source={claudeLogoImage}
        style={{
          width: size,
          height: size,
          transform: [{ rotate }],
        }}
        resizeMode="contain"
      />
    </View>
  );
});
SpinningClaudeLogo.displayName = 'SpinningClaudeLogo';

// Markdown styles for react-native-marked
const getMarkdownStyles = (isUser: boolean): MarkedStyles => ({
  text: {
    color: isUser ? colors.userBubbleText : colors.assistantBubbleText,
    fontSize: 16,
    lineHeight: 24,
  },
  h1: {
    color: isUser ? colors.userBubbleText : colors.assistantBubbleText,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  h2: {
    color: isUser ? colors.userBubbleText : colors.assistantBubbleText,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    color: isUser ? colors.userBubbleText : colors.assistantBubbleText,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  codespan: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : colors.surface,
    color: isUser ? colors.userBubbleText : colors.accent,
  },
  code: {
    backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : colors.surface,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  strong: {
    fontWeight: '600',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  list: {
    marginVertical: 4,
  },
  li: {
    color: isUser ? colors.userBubbleText : colors.assistantBubbleText,
    marginBottom: 4,
  },
  blockquote: {
    backgroundColor: isUser ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginVertical: 8,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tableCell: {
    padding: 8,
  },
});

const getMarkdownTheme = (isUser: boolean) => ({
  colors: {
    code: isUser ? 'rgba(255,255,255,0.1)' : colors.surface,
    link: colors.accent,
    text: isUser ? colors.userBubbleText : colors.assistantBubbleText,
    border: colors.border,
  },
});

// Simple markdown text component using useMarkdown hook
const MarkdownText = React.memo<{ content: string; isUser: boolean }>(({ content, isUser }) => {
  const elements = useMarkdown(content, {
    colorScheme: 'dark',
    styles: getMarkdownStyles(isUser),
    theme: getMarkdownTheme(isUser),
  });

  return (
    <View>
      {elements.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </View>
  );
});
MarkdownText.displayName = 'MarkdownText';

// Message Bubble - Claude style
interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  onRetry?: (messageId: string) => void;
}

const CollapsibleThinking = React.memo<{ thinking: string; isStreaming?: boolean }>(({ thinking, isStreaming }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    triggerHaptic('light');
    setIsExpanded(prev => !prev);
  }, []);

  if (!thinking) return null;

  return (
    <View style={thinkingStyles.container}>
      <TouchableOpacity
        style={thinkingStyles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Brain size={14} color={colors.textMuted} />
        <Text style={thinkingStyles.headerText}>
          {isStreaming ? 'Thinking...' : 'Thought process'}
        </Text>
        {isExpanded ? (
          <ChevronUp size={16} color={colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={thinkingStyles.content}>
          <ThinkingMarkdownText content={thinking} />
        </View>
      )}
    </View>
  );
});
CollapsibleThinking.displayName = 'CollapsibleThinking';

// Thinking markdown styles
const thinkingMarkdownStyles: MarkedStyles = {
  text: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
  codespan: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: colors.textMuted,
  },
  code: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 8,
    borderRadius: 6,
    marginVertical: 6,
  },
  strong: {
    fontWeight: '600',
    color: colors.text,
  },
  em: {
    fontStyle: 'italic',
  },
  li: {
    color: colors.textMuted,
  },
};

const thinkingTheme = {
  colors: {
    code: 'rgba(255,255,255,0.04)',
    link: colors.accent,
    text: colors.textMuted,
    border: colors.border,
  },
};

// Thinking markdown text component
const ThinkingMarkdownText = React.memo<{ content: string }>(({ content }) => {
  const elements = useMarkdown(content, {
    colorScheme: 'dark',
    styles: thinkingMarkdownStyles,
    theme: thinkingTheme,
  });

  return (
    <View>
      {elements.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </View>
  );
});
ThinkingMarkdownText.displayName = 'ThinkingMarkdownText';

const thinkingStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
});

const MessageBubble = React.memo<MessageBubbleProps>(({ message, isLast, onRetry }) => {
  const isUser = message.role === 'user';
  const content = message.content || (message.isStreaming ? '' : '');

  // Get model name from modelId
  const modelName = message.modelId
    ? AVAILABLE_MODELS.find(m => m.id === message.modelId)?.name || message.modelId
    : null;

  const handleCopy = useCallback(() => {
    Clipboard.setStringAsync(content);
    triggerHaptic('light');
  }, [content]);

  const handleRetry = useCallback(() => {
    onRetry?.(message.id);
  }, [message.id, onRetry]);

  const handleLongPress = useCallback(() => {
    triggerHaptic('medium');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Copy Message', 'Retry'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCopy();
          } else if (buttonIndex === 2 && !isUser) {
            handleRetry();
          }
        }
      );
    } else {
      // Android: show Alert as action sheet alternative
      Alert.alert(
        'Message Actions',
        undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Copy Message', onPress: handleCopy },
          ...(!isUser ? [{ text: 'Retry', onPress: handleRetry }] : []),
        ]
      );
    }
  }, [handleCopy, handleRetry, isUser]);

  const isStreaming = message.isStreaming && isLast;

  // Check if content has complex markdown
  const hasComplexMarkdown = /[#*`\[\]|>-]/.test(content);

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
      {message.images && message.images.length > 0 && (
        <View style={styles.messageImages}>
          {message.images.map((img) => (
            <Image key={img.id} source={{ uri: img.uri }} style={styles.messageImage} contentFit="cover" />
          ))}
        </View>
      )}
      {message.files && message.files.length > 0 && (
        <View style={styles.messageFiles}>
          {message.files.map((file) => (
            <View key={file.id} style={styles.messageFileItem}>
              <FileText size={16} color={colors.accent} />
              <Text style={styles.messageFileName} numberOfLines={1}>{file.name}</Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        delayLongPress={300}
      >
        {!isUser && message.thinking && (
          <CollapsibleThinking thinking={message.thinking} isStreaming={isStreaming && !content} />
        )}
        {content ? (
          <View style={styles.streamingContent}>
            {hasComplexMarkdown ? (
              <MarkdownText content={content} isUser={isUser} />
            ) : (
              <Text
                selectable={true}
                style={{
                  color: isUser ? colors.userBubbleText : colors.assistantBubbleText,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                {content}
              </Text>
            )}
            {isStreaming && (
              <View style={styles.inlineSpinner}>
                <SpinningClaudeLogo size={18} />
              </View>
            )}
          </View>
        ) : isStreaming ? (
          <SpinningClaudeLogo size={24} />
        ) : null}
      </TouchableOpacity>
      {/* Action buttons for non-streaming messages */}
      {!isStreaming && content && !isUser && (
        <View style={styles.messageActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
            <Copy size={14} color={colors.textMuted} />
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
            <RefreshCw size={14} color={colors.textMuted} />
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
          {modelName && (
            <Text style={styles.modelNameText}>{modelName}</Text>
          )}
        </View>
      )}
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Waveform for recording - Claude style
interface WaveformProps {
  levels: number[];
  isRecording: boolean;
  duration: number;
}

const RecordingWaveform = React.memo<WaveformProps>(({ levels, duration }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.waveformContainer}>
      <View style={styles.waveformBars}>
        {levels.map((level, index) => {
          const normalizedLevel = Math.max(0.1, Math.min(1, (level + 60) / 60));
          const height = 4 + normalizedLevel * 28;
          return (
            <View
              key={index}
              style={[styles.waveformBar, { height }]}
            />
          );
        })}
      </View>
      <Text style={styles.waveformTime}>{formatTime(duration)}</Text>
    </View>
  );
});

RecordingWaveform.displayName = 'RecordingWaveform';

// Attachment Modal - iOS style sheet
interface AttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onPickImage: (useCamera: boolean) => void;
  onPickFile: () => void;
}

const AttachmentModal = React.memo<AttachmentModalProps>(({ visible, onClose, onPickImage, onPickFile }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayOpacity]);

  const handlePickImage = useCallback((useCamera: boolean) => {
    console.log('[AttachmentModal] handlePickImage called, useCamera:', useCamera);
    triggerHaptic('selection');
    onClose();
    // Delay the picker to allow modal to close
    setTimeout(() => {
      onPickImage(useCamera);
    }, 300);
  }, [onPickImage, onClose]);

  const handlePickFile = useCallback(() => {
    console.log('[AttachmentModal] handlePickFile called');
    triggerHaptic('selection');
    onClose();
    setTimeout(() => {
      onPickFile();
    }, 300);
  }, [onPickFile, onClose]);

  const handleClose = useCallback(() => {
    console.log('[AttachmentModal] handleClose called');
    triggerHaptic('light');
    onClose();
  }, [onClose]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.attachmentSheet, { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.attachmentGrid}>
            <TouchableOpacity
              style={styles.attachmentGridItem}
              onPress={() => handlePickImage(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.attachmentIconCircle, { backgroundColor: '#FF9500' }]}>
                <Camera size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.attachmentGridText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentGridItem}
              onPress={() => handlePickImage(false)}
              activeOpacity={0.7}
            >
              <View style={[styles.attachmentIconCircle, { backgroundColor: '#34C759' }]}>
                <ImageIcon size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.attachmentGridText}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentGridItem}
              onPress={handlePickFile}
              activeOpacity={0.7}
            >
              <View style={[styles.attachmentIconCircle, { backgroundColor: '#5856D6' }]}>
                <FileText size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.attachmentGridText}>Files</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
});

AttachmentModal.displayName = 'AttachmentModal';

export default function ChatInput() {
  const insets = useSafeAreaInsets();
  const { sendMessage, isStreaming, stopStreaming, selectedModel, activeConversation, retryMessage, webSearchEnabled, setWebSearchEnabled } = useChat();
  const [inputText, setInputText] = useState('');
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(Array(NUM_WAVEFORM_BARS).fill(-60));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContentLengthRef = useRef(0);

  const messages = activeConversation?.messages || [];

  useEffect(() => {
    return () => {
      if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setUserScrolled(!isAtBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  // Scroll when user sends a new message (not when scrolled up)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const currentLength = lastMessage.content?.length || 0;
      if (currentLength !== lastContentLengthRef.current) {
        lastContentLengthRef.current = currentLength;
        if (!userScrolled) requestAnimationFrame(scrollToBottom);
      }
    }
  }, [messages, scrollToBottom, userScrolled]);

  // Always scroll when messages count increases (new message sent)
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // New message added - scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setUserScrolled(false);
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom when keyboard appears and track keyboard height
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom with a small delay to let the layout adjust
        setTimeout(() => {
          if (!userScrolled && flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [userScrolled, messages.length]);

  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText && attachedImages.length === 0 && attachedFiles.length === 0) return;
    if (isStreaming) return;

    triggerHaptic('medium');
    const imagesToSend = attachedImages.length > 0 ? [...attachedImages] : undefined;
    const filesToSend = attachedFiles.length > 0 ? [...attachedFiles] : undefined;

    // Debug: Log what we're sending
    console.log('[ChatInput] handleSend - files to send:', filesToSend?.length || 0);
    if (filesToSend) {
      filesToSend.forEach((f, i) => {
        console.log(`[ChatInput] File ${i}: name=${f.name}, mimeType=${f.mimeType}, hasBase64=${!!f.base64}, base64Length=${f.base64?.length || 0}`);
      });
    }

    setInputText('');
    setAttachedImages([]);
    setAttachedFiles([]);
    setUserScrolled(false);
    Keyboard.dismiss();

    await sendMessage(trimmedText, imagesToSend, filesToSend);

    // Force scroll to bottom after sending message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [inputText, attachedImages, attachedFiles, isStreaming, sendMessage]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    console.log('[ChatInput] pickImage called, useCamera:', useCamera);

    try {
      // Check/request permission first
      console.log('[ChatInput] Checking permissions...');
      const permissionResult = useCamera
        ? await ImagePicker.getCameraPermissionsAsync()
        : await ImagePicker.getMediaLibraryPermissionsAsync();

      let hasPermission = permissionResult.granted;

      if (!hasPermission) {
        console.log('[ChatInput] Requesting permissions...');
        const requestResult = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = requestResult.granted;
      }

      console.log('[ChatInput] Permission granted:', hasPermission);
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          `Please grant permission to access your ${useCamera ? 'camera' : 'photos'} in Settings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      console.log('[ChatInput] Launching picker...');
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
            base64: true,
          });

      console.log('[ChatInput] Picker result:', result.canceled ? 'canceled' : 'selected');
      if (!result.canceled && result.assets) {
        const newImages: ImageAttachment[] = result.assets.map((asset) => {
          // Detect image type from base64 header or default to jpeg
          let mimeType = 'image/jpeg';
          if (asset.base64) {
            // Check magic bytes to detect actual image format
            const header = asset.base64.substring(0, 20);
            if (header.startsWith('/9j/')) {
              mimeType = 'image/jpeg';
            } else if (header.startsWith('iVBORw')) {
              mimeType = 'image/png';
            } else if (header.startsWith('R0lGOD')) {
              mimeType = 'image/gif';
            } else if (header.startsWith('UklGR')) {
              mimeType = 'image/webp';
            }
            console.log('[ChatInput] Detected image type:', mimeType);
          }

          return {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            uri: asset.uri,
            base64: asset.base64 ? `data:${mimeType};base64,${asset.base64}` : undefined,
            width: asset.width,
            height: asset.height,
          };
        });
        setAttachedImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('[ChatInput] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, []);

  const pickFile = useCallback(async () => {
    console.log('[ChatInput] pickFile called');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/csv', 'application/json', 'text/markdown'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      console.log('[ChatInput] Document picker result:', result.canceled ? 'canceled' : 'selected');

      if (!result.canceled && result.assets) {
        const successfulFiles: FileAttachment[] = [];
        const failedFiles: string[] = [];

        for (const asset of result.assets) {
          let base64: string | undefined;

          // Read file as base64
          if (asset.uri) {
            try {
              console.log('[ChatInput] Reading file:', asset.name, 'from:', asset.uri);
              const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: 'base64',
              });

              if (fileContent && fileContent.length > 0) {
                base64 = `data:${asset.mimeType || 'application/pdf'};base64,${fileContent}`;
                console.log('[ChatInput] File loaded successfully:', asset.name, 'base64 length:', base64.length);

                successfulFiles.push({
                  id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                  uri: asset.uri,
                  name: asset.name,
                  mimeType: asset.mimeType || 'application/octet-stream',
                  size: asset.size || 0,
                  base64,
                });
              } else {
                console.error('[ChatInput] File content is empty:', asset.name);
                failedFiles.push(asset.name);
              }
            } catch (err) {
              console.error('[ChatInput] Error reading file:', asset.name, err);
              failedFiles.push(asset.name);
            }
          } else {
            console.log('[ChatInput] No URI for file:', asset.name);
            failedFiles.push(asset.name);
          }
        }

        // Add successful files
        if (successfulFiles.length > 0) {
          console.log('[ChatInput] Adding', successfulFiles.length, 'successful files');
          setAttachedFiles((prev) => [...prev, ...successfulFiles]);
        }

        // Alert user about failed files
        if (failedFiles.length > 0) {
          Alert.alert(
            'File Read Error',
            `Could not read the following file(s): ${failedFiles.join(', ')}. Please try again.`
          );
        }
      }
    } catch (error) {
      console.error('[ChatInput] Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const removeImage = useCallback((id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Voice recording is not supported on web.');
      return;
    }

    triggerHaptic('medium');
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission.');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      meteringIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && typeof status.metering === 'number') {
              setWaveformLevels((prev) => [...prev.slice(1), status.metering ?? -60]);
            }
          } catch {}
        }
      }, METERING_INTERVAL);
    } catch {
      Alert.alert('Error', 'Failed to start recording.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    triggerHaptic('light');
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setWaveformLevels(Array(NUM_WAVEFORM_BARS).fill(-60));
    setRecordingDuration(0);

    if (!recordingRef.current) {
      setIsRecording(false);
      return;
    }

    try {
      setIsTranscribing(true);
      setIsRecording(false);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      const response = await fetch(uri);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const transcription = await transcribeFromBase64(base64);
          if (transcription) setInputText((prev) => prev + (prev ? ' ' : '') + transcription);
        } catch {}
        setIsTranscribing(false);
      };
      reader.onerror = () => setIsTranscribing(false);
      reader.readAsDataURL(blob);
    } catch {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setWaveformLevels(Array(NUM_WAVEFORM_BARS).fill(-60));
    setRecordingDuration(0);

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble message={item} isLast={index === messages.length - 1} onRetry={retryMessage} />
    ),
    [messages.length, retryMessage]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const canSend = (inputText.trim().length > 0 || attachedImages.length > 0) && !isStreaming && !isRecording && !isTranscribing;
  const supportsImages = selectedModel.supportsImages;
  const isWeb = Platform.OS === 'web';

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  return (
    <View style={styles.container}>
      {messages.length === 0 ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.emptyState, isWeb && styles.webEmptyState]}>
            <Image source={claudeLogoImage} style={styles.claudeLogo} contentFit="contain" />
            <Text style={styles.emptyTitle}>How can I help you{'\n'}this {getGreeting()}?</Text>
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messageList}
          contentContainerStyle={[styles.messageListContent, isWeb && styles.webMessageListContent]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (!userScrolled) scrollToBottom();
          }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        />
      )}

      <AttachmentModal
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        onPickImage={pickImage}
        onPickFile={pickFile}
      />

      {/* Attachment Preview */}
      {(attachedImages.length > 0 || attachedFiles.length > 0) && (
        <View style={styles.attachmentPreview}>
          {attachedImages.map((img) => (
            <View key={img.id} style={styles.attachmentItem}>
              <Image source={{ uri: img.uri }} style={styles.attachmentImage} contentFit="cover" />
              <TouchableOpacity style={styles.removeAttachment} onPress={() => removeImage(img.id)}>
                <X size={12} color={colors.text} />
              </TouchableOpacity>
            </View>
          ))}
          {attachedFiles.map((file) => (
            <View key={file.id} style={styles.fileAttachmentItem}>
              <View style={styles.fileIconContainer}>
                <FileText size={24} color={colors.accent} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
              </View>
              <TouchableOpacity style={styles.removeFileButton} onPress={() => removeFile(file.id)}>
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Recording Bar - Claude style */}
      {isRecording && (
        <View style={styles.recordingBar}>
          <TouchableOpacity style={styles.recordingCancelButton} onPress={cancelRecording}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
          <RecordingWaveform levels={waveformLevels} isRecording={isRecording} duration={recordingDuration} />
          <TouchableOpacity style={styles.recordingSendButton} onPress={stopRecording}>
            <ArrowUp size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Container - Claude style */}
      {!isRecording && (
        <View style={[
          styles.inputContainer,
          {
            paddingBottom: isWeb
              ? spacing.lg
              : keyboardHeight > 0
                ? spacing.sm
                : Math.max(insets.bottom, spacing.md),
            marginBottom: Platform.OS === 'ios' ? keyboardHeight : 0,
          },
          isWeb && styles.webInputContainer
        ]}>
          <View style={[styles.inputWrapper, isWeb && styles.webInputWrapper]}>
            {isTranscribing ? (
              <View style={styles.transcribingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.transcribingText}>Transcribing...</Text>
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Reply to Claude"
                placeholderTextColor={colors.inputPlaceholder}
                multiline
                maxLength={10000}
              />
            )}
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[styles.inputActionButton, webSearchEnabled && styles.inputActionButtonActive]}
                onPress={() => {
                  triggerHaptic('light');
                  setWebSearchEnabled(!webSearchEnabled);
                }}
              >
                <Globe size={20} color={webSearchEnabled ? colors.accent : colors.textMuted} />
              </TouchableOpacity>
              {supportsImages && (
                <TouchableOpacity style={styles.inputActionButton} onPress={() => setShowAttachMenu(true)}>
                  <Plus size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              {Platform.OS !== 'web' && !isTranscribing && (
                <TouchableOpacity style={styles.inputActionButton} onPress={startRecording}>
                  <Mic size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.sendButton, (canSend || isStreaming) && styles.sendButtonActive]}
                onPress={isStreaming ? stopStreaming : handleSend}
                disabled={!canSend && !isStreaming}
              >
                {isStreaming ? (
                  <Square size={14} color={colors.background} />
                ) : (
                  <ArrowUp size={18} color={canSend ? colors.background : colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  webMessageListContent: {
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 0,
      maxWidth: '100%',
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    }),
  },
  messageContainer: {
    marginBottom: spacing.xl,
    maxWidth: '90%',
    ...(Platform.OS === 'web' && {
      maxWidth: '85%',
      marginBottom: spacing.xxl,
    }),
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    ...(Platform.OS === 'web' && {
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    }),
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: borderRadius.xs,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  assistantBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  streamingContent: {
    flexDirection: 'column',
  },
  inlineSpinner: {
    marginTop: spacing.sm,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  contextMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  contextMenuText: {
    fontSize: 16,
    color: colors.text,
  },
  messageActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionButtonText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  modelNameText: {
    fontSize: 12,
    color: colors.textMuted,
    opacity: 0.6,
    marginLeft: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  messageImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  messageImage: {
    width: 80,
    height: 60,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  messageFiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  messageFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  messageFileName: {
    fontSize: 13,
    color: colors.text,
    maxWidth: 150,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  webEmptyState: {
    ...(Platform.OS === 'web' && {
      paddingHorizontal: spacing.xxl,
      maxWidth: 600,
      alignSelf: 'center',
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.xxxl,
    }),
  },
  claudeLogo: {
    width: 64,
    height: 64,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xxl,
    lineHeight: 38,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    ...(Platform.OS === 'web' && {
      fontSize: 'clamp(24px, 3vw, 32px)',
      lineHeight: 'clamp(32px, 4vw, 42px)',
    }),
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  webInputContainer: {
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 0,
      maxWidth: '100%',
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    }),
  },
  inputWrapper: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 52,
    maxHeight: 120,
    ...(Platform.OS === 'web' && {
      maxHeight: 200,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxShadow: 'none',
      ':focus-within': {
        borderColor: colors.inputFocusBorder,
        boxShadow: `0 0 0 2px ${colors.inputFocusBorder}20`,
      },
    }),
  },
  webInputWrapper: {
    ...(Platform.OS === 'web' && {
      minHeight: 56,
    }),
  },
  textInput: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    ...typography.body,
    color: colors.text,
    maxHeight: 80,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    ...(Platform.OS === 'web' && {
      outline: 'none',
      resize: 'none',
      lineHeight: 24,
      '&::placeholder': {
        color: colors.inputPlaceholder,
      },
    }),
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  transcribingText: {
    fontSize: 16,
    color: colors.accent,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  inputActionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.2s',
      ':hover': {
        opacity: 0.7,
      },
    }),
  },
  inputActionButtonActive: {
    backgroundColor: 'rgba(217, 119, 87, 0.15)',
    borderRadius: 18,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease, transform 0.1s ease',
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.surfaceHover,
        transform: 'scale(1.05)',
      },
      ':active': {
        transform: 'scale(0.95)',
      },
    }),
  },
  sendButtonActive: {
    backgroundColor: colors.text,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      ':hover': {
        backgroundColor: colors.primaryMuted,
        transform: 'scale(1.05)',
      },
      ':active': {
        transform: 'scale(0.95)',
      },
    }),
  },
  attachmentPreview: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    maxWidth: 200,
  },
  fileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(217, 119, 87, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  fileSize: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  removeFileButton: {
    padding: spacing.xs,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  recordingCancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  waveformBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    backgroundColor: colors.text,
    borderRadius: 2,
    opacity: 0.8,
  },
  waveformTime: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    minWidth: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  attachmentSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: colors.textMuted,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    opacity: 0.4,
  },
  attachmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  attachmentGridItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  attachmentIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  attachmentGridText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  cancelButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.accent,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  attachmentOptions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  attachmentOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  attachmentIconBox: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentOptionText: {
    fontSize: 14,
    color: colors.text,
  },
});
