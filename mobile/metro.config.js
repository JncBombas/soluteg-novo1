const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// ── Intercepta imports problemáticos via resolveRequest ──────────
// 1. VirtualViewExperimentalNativeComponent (RN 0.79 bug de codegen):
//    VirtualView.js importa esse arquivo, que tem um tipo Flow que o
//    @react-native/codegen não consegue parsear. Como o componente é
//    privado/experimental e não é usado no app, devolvemos módulo vazio.
//    NOTA: blockList não funciona aqui — o Metro tenta resolver o import
//    antes de aplicar a blocklist, causando UnableToResolveError.
//
// 2. Imports relativos do servidor Node.js (../server/ ou ../../server/):
//    mobile/lib/trpc.ts usa "import type { AppRouter } from ../../server/routers"
//    O "import type" é apagado pelo Babel, mas o Metro tenta resolver antes
//    da transformação TypeScript — devolvemos módulo vazio para esses caminhos.
//    (Não afeta o pacote npm @trpc/server, que não começa com ../)
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Módulo vazio para os dois componentes VirtualView com bug de codegen no RN 0.79:
  //   VirtualViewExperimentalNativeComponent — onModeChange sem args de evento
  //   VirtualViewNativeComponent              — mesmo bug, mesmo arquivo privado
  // Ambos são componentes privados/experimentais não usados em produção.
  if (
    moduleName.includes("VirtualViewExperimentalNativeComponent") ||
    moduleName.includes("VirtualViewNativeComponent")
  ) {
    return { type: "empty" };
  }
  // Módulo vazio para imports do servidor Node.js
  if (
    /^\.\.\/server(\/|$)/.test(moduleName) ||
    /^\.\.\/\.\.\/server(\/|$)/.test(moduleName)
  ) {
    return { type: "empty" };
  }
  return originalResolve
    ? originalResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
