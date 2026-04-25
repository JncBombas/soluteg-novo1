module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource: "nativewind" ativa suporte a className no React Native
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    // react-native-reanimated/plugin foi removido — não usamos animações no app
    plugins: [],
  };
};
