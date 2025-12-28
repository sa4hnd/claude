import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { colors, spacing, borderRadius, typography } from "@/constants/theme";

const claudeLogoImage = require("@/assets/images/claude-logo.png");

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (isSignUp && !name.trim()) {
      setError("Please enter your name");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
      console.log("Auth successful! Waiting for state update...");
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorMessage = err?.message || (isSignUp ? "Failed to create account" : "Failed to sign in");
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, isWeb && styles.webContent]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={claudeLogoImage} style={styles.logo} contentFit="contain" />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Sign up to save your conversations across devices"
              : "Sign in to access your conversations"}
          </Text>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <User size={20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!isSubmitting}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle sign up/sign in */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.toggleLink}>
                {isSignUp ? "Sign in" : "Sign up"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy note */}
          <Text style={styles.privacyNote}>
            Your conversations are securely stored and synced across devices.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  webContent: {
    ...(Platform.OS === "web" && {
      maxWidth: 440,
      backgroundColor: colors.surface,
      padding: spacing.xxl,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    }),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    ...typography.bodySmall,
    color: "#EF4444",
    textAlign: "center",
  },
  formContainer: {
    gap: spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: spacing.md,
    height: 52,
    ...(Platform.OS === "web" && {
      transition: "border-color 0.2s ease",
    }),
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    height: "100%",
    ...(Platform.OS === "web" && {
      outline: "none",
    }),
  },
  passwordToggle: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.sm,
    ...(Platform.OS === "web" && {
      cursor: "pointer",
      transition: "background-color 0.15s ease, transform 0.1s ease",
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  toggleLink: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  privacyNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    opacity: 0.7,
  },
});
