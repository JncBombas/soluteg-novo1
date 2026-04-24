const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// ── Bloqueia imports do servidor Node.js ──────────────────────────
// O arquivo mobile/lib/trpc.ts usa "import type { AppRouter }" do servidor.
// "import type" é apagado pelo Babel antes do bundle — não vai para o runtime.
// Mas o Metro tenta resolver todos os módulos antes da transformação Babel,
// então sem este bloco ele tentaria fazer bundle do código Node.js (mysql2, express...)
// e falharia com erro 500.
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Qualquer import que venha do diretório server/ é type-only — retorna módulo vazio
  if (
    moduleName.includes("/server/") ||
    /^\.\.\/server/.test(moduleName) ||
    /^\.\.\/\.\.\/server/.test(moduleName)
  ) {
    return { type: "empty" };
  }
  // Mantém o comportamento padrão para todos os outros módulos
  return originalResolve
    ? originalResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// withNativeWind integra o compilador Tailwind CSS ao Metro bundler
module.exports = withNativeWind(config, { input: "./global.css" });
