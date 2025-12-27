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
    // Add mjs support
    sourceExts: [...defaultConfig.resolver.sourceExts, "mjs", "cjs"],
    // Prioritize main field for CommonJS resolution
    resolverMainFields: ["react-native", "main", "browser", "module"],
    // Unstable settings to help with package resolution
    unstable_enablePackageExports: true,
    unstable_conditionNames: ["require", "import", "react-native"],
  },
};
