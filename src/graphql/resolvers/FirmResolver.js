import FirmRepository from '../../repositories/FirmRepository.js';

const firmRepo = new FirmRepository();

export const firmResolver = {
  Query: {
    getFirms: async (_, __, context) => {
      try{
        if (!context.user) {
          throw new Error('No autenticado');
        }
        return await firmRepo.getFirms();
      }
      catch (error){
        if(error.code === 'ETIMEDOUT'){
          throw new Error('Data base time out.');
        }
        throw new Error('Error retrieving firms.');
      }
    },
    getFirmByName: async (_, { name }, context) => {
      try{
        if (!context.user) {
          throw new Error('No autenticado');
        }
        return await firmRepo.getFirmByName(name);
      }
      catch (error){
        if(error.code === 'ETIMEDOUT'){
          throw new Error('Data base time out.');
        }
        throw new Error('Error retrieving firm by name.');
      }
    },
  },
};