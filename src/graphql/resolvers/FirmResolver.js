import FirmRepository from '../../repositories/FirmRepository.js';

const firmRepo = new FirmRepository();

export const firmResolver = {
  Query: {
    getFirms: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await firmRepo.getFirms();
      }
      catch (error){
        if (error.code === 'ETIMEDOUT'){
          throw new Error('Data base time out.');
        }
        throw error;
      }
    },
    getFirmByName: async (_, { nombre }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await firmRepo.getFirmByName(nombre);
      }
      catch (error){
        if (error.code === 'ETIMEDOUT'){
          throw new Error('Data base time out.');
        }
        throw error;
      }
    },
  },
};