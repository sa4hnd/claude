import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, ChevronRight, Cpu } from 'lucide-react-native';
import { useChat } from '@/providers/ChatProvider';
import { Model } from '@/lib/ai/streaming-service';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isVisible, onClose }: SettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { selectedModel, changeModel, availableModels } = useChat();
  const [showModelPicker, setShowModelPicker] = useState(false);

  const handleSelectModel = useCallback(
    (model: Model) => {
      changeModel(model);
      setShowModelPicker(false);
    },
    [changeModel]
  );

  const groupedModels = React.useMemo(() => {
    const groups: Record<string, Model[]> = {
      OpenAI: [],
      Anthropic: [],
      xAI: [],
    };

    availableModels.forEach((model) => {
      if (model.provider === 'openai') groups['OpenAI'].push(model);
      else if (model.provider === 'anthropic') groups['Anthropic'].push(model);
      else if (model.provider === 'xai') groups['xAI'].push(model);
    });

    return groups;
  }, [availableModels]);

  const isWeb = Platform.OS === 'web';

  return (
    <Modal
      visible={isVisible}
      animationType={isWeb ? "fade" : "slide"}
      presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      {isWeb ? (
        <View style={styles.webModalOverlay}>
          <TouchableOpacity 
            style={styles.webModalBackdrop} 
            activeOpacity={1} 
            onPress={onClose}
          />
          <View style={styles.webModalContainer}>
            <View style={styles.webHeader}>
              <Text style={styles.headerTitle}>Settings</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} testID="close-settings">
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.webContent} showsVerticalScrollIndicator={false}>
              {!showModelPicker ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Model</Text>
                    <TouchableOpacity
                      style={styles.settingRow}
                      onPress={() => setShowModelPicker(true)}
                      testID="model-selector"
                    >
                      <View style={styles.settingInfo}>
                        <Cpu size={20} color={colors.textSecondary} />
                        <View style={styles.settingText}>
                          <Text style={styles.settingLabel}>{selectedModel.name}</Text>
                          <Text style={styles.settingDescription}>
                            {selectedModel.supportsImages ? 'Supports images' : 'Text only'}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.aboutCard}>
                      <Text style={styles.aboutTitle}>AI Chat</Text>
                      <Text style={styles.aboutDescription}>
                        A professional AI assistant powered by the latest language models from OpenAI,
                        Anthropic, and xAI.
                      </Text>
                      <View style={styles.features}>
                        <Text style={styles.featureItem}>• Multi-model support</Text>
                        <Text style={styles.featureItem}>• Image understanding</Text>
                        <Text style={styles.featureItem}>• Voice transcription</Text>
                        <Text style={styles.featureItem}>• Streaming responses</Text>
                        <Text style={styles.featureItem}>• Local storage</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.modelPicker}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowModelPicker(false)}
                  >
                    <ChevronRight
                      size={20}
                      color={colors.textSecondary}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  {Object.entries(groupedModels).map(([provider, models]) => (
                    <View key={provider} style={styles.modelGroup}>
                      <Text style={styles.modelGroupTitle}>{provider}</Text>
                      {models.map((model) => (
                        <TouchableOpacity
                          key={model.id}
                          style={[
                            styles.modelOption,
                            selectedModel.id === model.id && styles.modelOptionSelected,
                          ]}
                          onPress={() => handleSelectModel(model)}
                          testID={`model-option-${model.id}`}
                        >
                          <View style={styles.modelInfo}>
                            <Text
                              style={[
                                styles.modelName,
                                selectedModel.id === model.id && styles.modelNameSelected,
                              ]}
                            >
                              {model.name}
                            </Text>
                            <Text style={styles.modelMeta}>
                              {model.supportsImages ? 'Vision • ' : ''}
                              {Math.round(model.contextWindow / 1000)}K context
                            </Text>
                          </View>
                          {selectedModel.id === model.id && (
                            <Check size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} testID="close-settings">
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!showModelPicker ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Model</Text>
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setShowModelPicker(true)}
                  testID="model-selector"
                >
                  <View style={styles.settingInfo}>
                    <Cpu size={20} color={colors.textSecondary} />
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>{selectedModel.name}</Text>
                      <Text style={styles.settingDescription}>
                        {selectedModel.supportsImages ? 'Supports images' : 'Text only'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.aboutCard}>
                  <Text style={styles.aboutTitle}>AI Chat</Text>
                  <Text style={styles.aboutDescription}>
                    A professional AI assistant powered by the latest language models from OpenAI,
                    Anthropic, and xAI.
                  </Text>
                  <View style={styles.features}>
                    <Text style={styles.featureItem}>• Multi-model support</Text>
                    <Text style={styles.featureItem}>• Image understanding</Text>
                    <Text style={styles.featureItem}>• Voice transcription</Text>
                    <Text style={styles.featureItem}>• Streaming responses</Text>
                    <Text style={styles.featureItem}>• Local storage</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.modelPicker}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowModelPicker(false)}
              >
                <ChevronRight
                  size={20}
                  color={colors.textSecondary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              {Object.entries(groupedModels).map(([provider, models]) => (
                <View key={provider} style={styles.modelGroup}>
                  <Text style={styles.modelGroupTitle}>{provider}</Text>
                  {models.map((model) => (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelOption,
                        selectedModel.id === model.id && styles.modelOptionSelected,
                      ]}
                      onPress={() => handleSelectModel(model)}
                      testID={`model-option-${model.id}`}
                    >
                      <View style={styles.modelInfo}>
                        <Text
                          style={[
                            styles.modelName,
                            selectedModel.id === model.id && styles.modelNameSelected,
                          ]}
                        >
                          {model.name}
                        </Text>
                        <Text style={styles.modelMeta}>
                          {model.supportsImages ? 'Vision • ' : ''}
                          {Math.round(model.contextWindow / 1000)}K context
                        </Text>
                      </View>
                      {selectedModel.id === model.id && (
                        <Check size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Web Modal Styles
  webModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    }),
  },
  webModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  webModalContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90vh',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      borderWidth: 1,
      borderColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }),
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webContent: {
    flex: 1,
    padding: spacing.xl,
    ...(Platform.OS === 'web' && {
      maxHeight: 'calc(90vh - 80px)',
      overflowY: 'auto',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      borderRadius: borderRadius.md,
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.surface,
      },
    }),
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.surfaceHover,
      },
    }),
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingText: {
    gap: 2,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  aboutTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  aboutDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  features: {
    gap: spacing.xs,
  },
  featureItem: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  modelPicker: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.15s ease',
      userSelect: 'none',
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      alignSelf: 'flex-start',
      ':hover': {
        backgroundColor: colors.surface,
        opacity: 0.9,
      },
    }),
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modelGroup: {
    marginBottom: spacing.xl,
  },
  modelGroupTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease, border-color 0.15s ease',
      userSelect: 'none',
      ':hover': {
        backgroundColor: colors.surfaceHover,
        borderColor: colors.borderLight,
      },
    }),
  },
  modelOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHover,
  },
  modelInfo: {
    gap: 2,
  },
  modelName: {
    ...typography.body,
    color: colors.text,
  },
  modelNameSelected: {
    fontWeight: '600' as const,
  },
  modelMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
