module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource: "nativewind" — ativa suporte a className no React Native
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // Reanimated DEVE ser o último plugin registrado
      "react-native-reanimated/plugin",
    ],
  };
};
