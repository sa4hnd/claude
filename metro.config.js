// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  watcher: {
    ...defaultConfig.watcher,
    unstable_lazySha1: true,
  },
  resolver: {
    ...defaultConfig.resolver,
    // Add mjs and cjs support for Supabase packages
    sourceExts: [...defaultConfig.resolver.sourceExts, "mjs", "cjs"],
    // Use default resolver fields - don't override
    resolverMainFields: ["react-native", "browser", "main"],
    // Ensure .js files are resolved
    assetExts: defaultConfig.resolver.assetExts.filter((ext) => ext !== "js"),
    // Add explicit extra node modules resolution for supabase
    extraNodeModules: {
      "@supabase/auth-js": path.resolve(__dirname, "node_modules/@supabase/auth-js"),
      "@supabase/functions-js": path.resolve(__dirname, "node_modules/@supabase/functions-js"),
      "@supabase/postgrest-js": path.resolve(__dirname, "node_modules/@supabase/postgrest-js"),
      "@supabase/realtime-js": path.resolve(__dirname, "node_modules/@supabase/realtime-js"),
      "@supabase/storage-js": path.resolve(__dirname, "node_modules/@supabase/storage-js"),
    },
  },
};
