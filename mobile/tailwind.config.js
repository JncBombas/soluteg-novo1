/** @type {import('tailwindcss').Config} */
module.exports = {
  // Arquivos onde o Tailwind vai procurar classes para gerar o CSS
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  // nativewind/preset adapta o Tailwind para funcionar no React Native
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Cor primária do sistema JNC Elétrica
        primary: "#1d4ed8",
      },
    },
  },
  plugins: [],
};
