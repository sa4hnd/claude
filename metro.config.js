// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");

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
    // Prioritize main field for CommonJS resolution (important for Supabase)
    resolverMainFields: ["react-native", "main", "browser", "module"],
    // Enable package exports for proper module resolution
    unstable_enablePackageExports: true,
    unstable_conditionNames: ["require", "react-native", "import", "default"],
    // Ensure .js files are resolved
    assetExts: defaultConfig.resolver.assetExts.filter((ext) => ext !== "js"),
  },
};
