import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["tests/**/*.js"], // Ajústalo si tus tests están en otro sitio
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest   // ¡Aquí activas Jest!
      }
    },
  },
]);
