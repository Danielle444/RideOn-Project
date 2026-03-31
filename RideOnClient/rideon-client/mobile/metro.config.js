const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// מאפשר למטרו לראות תיקיות מחוץ ל-mobile
config.watchFolders = [workspaceRoot];

// מאפשר import מחוץ לפרויקט
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// מאפשר גישה ל-shared
config.resolver.extraNodeModules = {
  shared: path.resolve(workspaceRoot, "shared"),
};

module.exports = config;