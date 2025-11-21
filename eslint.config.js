import js from "@eslint/js";
import globals from "globals";


export default ([
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'logs/',
      '*.log',
      'coverage/',
      'migrations/*.cjs'
    ]
  },
  js.configs.recommended,
  { 
    files: ["**/*.{js,mjs,cjs}"], 
    plugins: { js }, 
    languageOptions: { 
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },

    rules: {

      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-undef': 'error',
      
      // Permitir console.log 
      'no-console': 'off',
      
      // Estilo de código (arreglables con --fix)
      'indent': ['error', 2, { SwitchCase: 1 }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'array-bracket-spacing': ['error', 'never'],
      'keyword-spacing': ['error', { before: true, after: true }],
      
      // Mejores prácticas
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
    },

    
  },
]);
