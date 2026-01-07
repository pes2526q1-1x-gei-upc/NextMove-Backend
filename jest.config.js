export default {
  testEnvironment: 'node',
  transform: {},
  collectCoverageFrom: [
    'src/repositories/RecorridosRepository.js',
    'src/repositories/EVStationsRepository.js',
    'src/repositories/estacionDeBicingRepository.js',
    'src/utils/EVStationsMapper.js'
  ], // disable Babel transforms unless needed
  testMatch: ["**/tests/**/*.js"],
  testPathIgnorePatterns: [
    "/tests/helpers/", // ignora toda la carpeta helpers dentro de tests
    "/node_modules/",
  ],
};