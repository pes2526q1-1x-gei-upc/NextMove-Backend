import { jest } from '@jest/globals';

// Mock del query principal
export const mockQuery = jest.fn();

// Mock del cliente para transacciones
export const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Mock del pool completo
export const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn(),
  end: jest.fn()
};

// Llama a esta función ANTES de importar el repositorio en cada test file
export async function applyDatabaseMock() {
  await jest.unstable_mockModule('../../src/config/database.js', () => ({
    default: mockPool
  }));
}