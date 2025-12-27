// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for .mjs files (needed for Supabase)
defaultConfig.resolver.sourceExts.push('mjs');

// Ensure proper resolution of Supabase packages
defaultConfig.resolver.resolverMainFields = ['react-native', 'browser', 'main', 'module'];

module.exports = {
  ...defaultConfig,
  watcher: {
    ...defaultConfig.watcher,
    unstable_lazySha1: true,
  },
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs'],
    resolverMainFields: ['react-native', 'browser', 'main'],
  },
};
