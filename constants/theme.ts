// Claude App Design System - Exact match
import { Platform } from 'react-native';

// System font - SF Pro on iOS, Roboto/system on Android
const systemFont = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export const colors = {
  // Backgrounds - Claude uses a warm dark tone
  background: '#191919',
  surface: '#2A2A2A',
  surfaceHover: '#333333',
  surfaceActive: '#3D3D3D',

  // Borders
  border: '#3D3D3D',
  borderLight: '#4A4A4A',

  // Text colors
  text: '#ECECEC',
  textSecondary: '#A0A0A0',
  textMuted: '#7A7A7A',
  textInverse: '#191919',

  // Primary (white for buttons)
  primary: '#ECECEC',
  primaryMuted: '#D0D0D0',

  // Accent - Claude's coral/orange color
  accent: '#D97757',
  accentLight: '#E8956F',
  accentMuted: '#B85C3D',

  // Status colors
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Message bubbles
  userBubble: '#3D3D3D',
  userBubbleText: '#ECECEC',
  assistantBubble: 'transparent',
  assistantBubbleText: '#ECECEC',

  // Input
  inputBackground: '#2A2A2A',
  inputBorder: '#3D3D3D',
  inputFocusBorder: '#5A5A5A',
  inputPlaceholder: '#7A7A7A',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  // Sidebar
  sidebarBackground: '#191919',

  // Special
  proBadge: '#2563EB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  // Claude title style
  largeTitle: {
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    fontFamily: systemFont,
  },
  title: {
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    fontFamily: systemFont,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500' as const,
    letterSpacing: -0.3,
    fontFamily: systemFont,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    fontFamily: systemFont,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    fontFamily: systemFont,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: systemFont,
  },
  button: {
    fontSize: 16,
    fontWeight: '500' as const,
    fontFamily: systemFont,
  },
  sidebarTitle: {
    fontSize: 32,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
    fontFamily: systemFont,
  },
  sidebarItem: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 24,
    fontFamily: systemFont,
  },
};
