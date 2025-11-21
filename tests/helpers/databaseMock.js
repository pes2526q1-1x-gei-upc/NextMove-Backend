import { jest } from '@jest/globals';

// Mock reutilizable del pool de Postgres
export const mockQuery = jest.fn();

// Llama a esta función ANTES de importar el repositorio en cada test file
export async function applyDatabaseMock() {
  // La ruta debe resolverse desde tests/helpers, por eso subimos dos niveles
  await jest.unstable_mockModule('../../src/config/database.js', () => ({
    default: { query: mockQuery }
  }));
}
