import FavStationRepository from '../../repositories/FavStationRepository.js';

const favStationRepo = new FavStationRepository();

const favStationResolver = {
    Query: {
        getFavStations: async (_, __, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.getFavStations(context.user.email);
            }
            catch(error){
                throw new Error('Error retrieving favorite stations.');
            }
        },
    },
    Mutation:{
        addFavStation: async (_, { stationId }, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.addFavStation(context.user.email, stationId);
            }
            catch(error){
                if (error.code === '23505'){
                    throw new Error('Station already in favorites.');
                }
                if (error.code === '23503'){
                    throw new Error('Station or userdoes not exist.');
                }
                throw new Error('Error adding favorite station.');
            }
        },
        deleteFavStation: async (_, { stationId }, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.deleteFavStation(context.user.email, stationId);
            }
            catch(error){
                throw new Error('Error deleting favorite station.');
            }
        }
    }
};

export default favStationResolver;