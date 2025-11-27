import FavStationRepository from '../../repositories/FavStationRepository.js';

const favStationRepo = new FavStationRepository();

const favStationResolver = {
    Query: {
        getFavBikeStations: async (_, __, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.getFavStations(context.user.email, 'BIKE');
            }
            catch(error){
                throw error;
                throw new Error('Error retrieving favorite bike stations.');
            }
        },
        getFavCarStations: async (_, __, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.getFavStations(context.user.email, 'CAR');
            }
            catch(error){
                throw error;
                throw new Error('Error retrieving favorite car stations.');
            }
        }
    },
    Mutation:{
        addFavStation: async (_, { station_id,type }, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.addFavStation(context.user.email, station_id, type);
            }
            catch(error){
                if (error.code === '23505'){
                    throw new Error('Station already in favorites.');
                }
                if (error.code === '23503'){
                    throw new Error('Station or userdoes not exist.');
                }
                throw error;
                throw new Error('Error adding favorite station.');
            }
        },
        deleteFavStation: async (_, { stationId, type }, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            try{
                return await favStationRepo.deleteFavStation(context.user.email, stationId, type);
            }
            catch(error){
                throw new Error('Error deleting favorite station.');
            }
        }
    }
};

export default favStationResolver;