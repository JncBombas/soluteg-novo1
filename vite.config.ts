import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// Plugins base — o PWA vem por último para envolver o build completo
const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  VitePWA({
    // Registra e atualiza o service worker automaticamente sem pedir confirmação
    registerType: "autoUpdate",

    // Gera o SW durante o build; em dev usa um SW "fake" para não quebrar o HMR
    devOptions: {
      enabled: false,
    },

    // Inclui arquivos extras no pré-cache do workbox
    includeAssets: ["favicon.ico", "favicon-192x192.png", "favicon-512x512.png", "apple-touch-icon.png"],

    // Web App Manifest — metadados do app instalável
    manifest: {
      name: "Soluteg Técnico",
      short_name: "Soluteg",
      description: "Portal do Técnico — ordens de serviço offline",
      theme_color: "#141820",
      background_color: "#141820",
      // "standalone" remove a barra de endereço do browser, dando aparência de app nativo
      display: "standalone",
      // URL aberta ao iniciar pelo ícone na tela inicial
      start_url: "/technician/login",
      // Limita o escopo do PWA ao portal do técnico; outras rotas abrem no browser normal
      scope: "/technician",
      lang: "pt-BR",
      orientation: "portrait",
      icons: [
        {
          src: "/favicon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          // "any maskable" garante que o ícone funcione em launchers Android que aplicam máscara
          purpose: "any maskable",
        },
        {
          src: "/favicon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },

    // Estratégia Workbox — rede primeiro para API, cache primeiro para assets estáticos
    workbox: {
      // Rotas que o SW deve gerenciar como SPA (404 → index.html)
      navigateFallback: "/index.html",
      // Exclui rotas de API do fallback — elas precisam de resposta real do servidor
      navigateFallbackDenylist: [/^\/api\//, /^\/trpc\//],
      // Pré-cache de todos os assets gerados pelo Vite (JS, CSS, imagens)
      globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
      // Exclui os assets muito pesados do pré-cache (laudos, fotos grandes, etc.)
      globIgnores: ["**/node_modules/**/*", "**/manutencao_*.{jpeg,webp}"],
      // O bundle do app é ~2.4 MB (SPA grande). Aumentamos o limite para garantir
      // que ele seja pré-cacheado — sem isso o modo offline não funciona.
      // 4 MiB = 4 * 1024 * 1024
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      // Cache runtime: estratégia "NetworkFirst" para o app shell
      runtimeCaching: [
        {
          // Assets estáticos — cache primeiro (raramente mudam)
          urlPattern: /\.(png|jpg|jpeg|svg|ico|webp|woff2)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "soluteg-assets-v1",
            expiration: {
              maxEntries: 60,
              // 30 dias de cache para assets
              maxAgeSeconds: 30 * 24 * 60 * 60,
            },
          },
        },
        {
          // JS e CSS do bundle — StaleWhileRevalidate: serve do cache imediatamente,
          // atualiza em background para a próxima visita
          urlPattern: /\.(js|css)$/,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "soluteg-static-v1",
          },
        },
      ],
    },
  }),
];

export default defineConfig({
  // Base path configurado para a raiz (necessário para o VPS)
  base: "/",

  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
