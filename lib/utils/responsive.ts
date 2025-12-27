import { Platform, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';

export const isWeb = Platform.OS === 'web';
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// Responsive breakpoints (web)
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  wide: 1920,
};

// Get current breakpoint (non-hook version for use in styles)
export const getBreakpoint = (): 'mobile' | 'tablet' | 'desktop' | 'wide' => {
  if (!isWeb) return 'mobile';

  const { width } = Dimensions.get('window');
  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'mobile';
};

// Hook to get current breakpoint (updates on resize)
export const useBreakpoint = (): 'mobile' | 'tablet' | 'desktop' | 'wide' => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop' | 'wide'>(getBreakpoint);

  useEffect(() => {
    if (!isWeb) return;

    const updateBreakpoint = () => {
      setBreakpoint(getBreakpoint());
    };

    const subscription = Dimensions.addEventListener('change', updateBreakpoint);
    return () => subscription?.remove();
  }, []);

  return breakpoint;
};

// Hook to get window dimensions
export const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  return dimensions;
};

// Max width for content containers on web
export const getMaxContentWidth = (): number | string => {
  if (!isWeb) return '100%';

  const breakpoint = getBreakpoint();
  const widths: Record<string, number> = {
    mobile: 100, // percentage
    tablet: 720,
    desktop: 800,
    wide: 900,
  };

  if (breakpoint === 'mobile') return '100%';
  return widths[breakpoint] || 800;
};

// Hook version of max content width
export const useMaxContentWidth = () => {
  const breakpoint = useBreakpoint();

  if (!isWeb) return '100%';

  const widths: Record<string, number | string> = {
    mobile: '100%',
    tablet: 720,
    desktop: 800,
    wide: 900,
  };

  return widths[breakpoint] || 800;
};

// Sidebar width based on screen size
export const getSidebarWidth = (): number => {
  if (!isWeb) return 320;

  const breakpoint = getBreakpoint();
  const widths: Record<string, number> = {
    mobile: 280,
    tablet: 280,
    desktop: 300,
    wide: 320,
  };

  return widths[breakpoint] || 300;
};

// Get responsive padding for web
export const getResponsivePadding = (): { horizontal: number; vertical: number } => {
  if (!isWeb) return { horizontal: 16, vertical: 16 };

  const breakpoint = getBreakpoint();
  const paddings: Record<string, { horizontal: number; vertical: number }> = {
    mobile: { horizontal: 16, vertical: 16 },
    tablet: { horizontal: 32, vertical: 24 },
    desktop: { horizontal: 48, vertical: 28 },
    wide: { horizontal: 64, vertical: 32 },
  };

  return paddings[breakpoint] || paddings.desktop;
};

// Check if screen is wide enough for desktop layout
export const isDesktopLayout = (): boolean => {
  if (!isWeb) return false;
  return Dimensions.get('window').width >= breakpoints.tablet;
};

// Hook for desktop layout detection
export const useIsDesktopLayout = (): boolean => {
  const breakpoint = useBreakpoint();
  if (!isWeb) return false;
  return breakpoint === 'tablet' || breakpoint === 'desktop' || breakpoint === 'wide';
};

// Check if sidebar should be visible (persistent on larger screens)
export const useSidebarVisible = (): boolean => {
  const breakpoint = useBreakpoint();
  if (!isWeb) return false;
  return breakpoint !== 'mobile';
};

// Get responsive font sizes for web
export const getWebFontSize = (base: number): number | string => {
  if (!isWeb) return base;

  const breakpoint = getBreakpoint();
  const scales: Record<string, number> = {
    mobile: 1,
    tablet: 1,
    desktop: 1.05,
    wide: 1.1,
  };

  return Math.round(base * (scales[breakpoint] || 1));
};

// Get message container max width for web
export const getMessageMaxWidth = (): number | string => {
  if (!isWeb) return '90%';

  const breakpoint = getBreakpoint();
  const widths: Record<string, number | string> = {
    mobile: '90%',
    tablet: '85%',
    desktop: '80%',
    wide: '75%',
  };

  return widths[breakpoint] || '80%';
};
