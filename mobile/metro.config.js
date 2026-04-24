const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Configuração base do Metro para Expo
const config = getDefaultConfig(__dirname);

// withNativeWind integra o compilador Tailwind CSS ao Metro bundler
module.exports = withNativeWind(config, { input: "./global.css" });
