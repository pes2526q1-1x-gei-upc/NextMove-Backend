export default {
  testEnvironment: 'node',
  transform: {},
  collectCoverageFrom: [
    'src/**/*.js',              // Incluir todo en src/
    '!src/**/*.test.js',        // Excluir tests
    '!src/index.js',            // Excluir entry point 
    '!src/config/**',           // Excluir configuración 
  ], // disable Babel transforms unless needed
  testMatch: ["**/tests/**/*.js"],
  testPathIgnorePatterns: [
    "/tests/helpers/", // ignora toda la carpeta helpers dentro de tests
    "/node_modules/",
  ],
};