const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

const supabaseCjsAliases = {
  "@supabase/auth-js": "node_modules/@supabase/auth-js/dist/main/index.js",
  "@supabase/functions-js": "node_modules/@supabase/functions-js/dist/main/index.js",
  "@supabase/postgrest-js": "node_modules/@supabase/postgrest-js/dist/index.cjs",
  "@supabase/realtime-js": "node_modules/@supabase/realtime-js/dist/main/index.js",
  "@supabase/storage-js": "node_modules/@supabase/storage-js/dist/index.cjs"
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const alias = supabaseCjsAliases[moduleName];

  if (alias) {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, alias)
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
