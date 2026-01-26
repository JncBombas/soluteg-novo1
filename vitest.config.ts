import { defineConfig } from "vite"; // Mudei de vitest para vite para garantir o build
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  // ADICIONE ESTA LINHA ABAIXO
  base: "/", 
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  // Se você usa o vitest, mantenha o bloco abaixo, 
  // mas certifique-se de que o import acima inclua 'vitest/config'
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});
