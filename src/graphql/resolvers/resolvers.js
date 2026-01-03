import { userResolvers } from './userResolvers.js';
import  EVStationResolvers from './EVStationRevolvers.js';
import { estacionDeBicingResolver } from './EstacionDeBicingResolver.js'; 
import { friendshipResolvers } from './FriendshipResolvers.js';
import { recorridosResolver } from './RecorridoResolver.js';
import { assessmentResolver } from './AssessmentResolvers.js';
import routingResolvers  from './routingResolvers.js';
import favStationResolver from './FavStationResolver.js';
import ChatResolver from './ChatResolver.js';
import { challengesResolver } from './challengesResolver.js';
import  { rankingResolver }  from './RankingResolver.js';

export const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    me: userResolvers.Query.me,
    User: userResolvers.Query.User,
    Users: userResolvers.Query.Users,
    UsersByNickname: userResolvers.Query.UsersByNickname,
    UsersSearchHistory: userResolvers.Query.UsersSearchHistory,
    ExistsUser: userResolvers.Query.ExistsUser,
      
    stations: EVStationResolvers.Query.stations,
    station: EVStationResolvers.Query.station,
    nearbyStations: EVStationResolvers.Query.nearbyStations,
    stationsByAddress: EVStationResolvers.Query.stationsByAddress,

    getEstacionesDeBicing: estacionDeBicingResolver.Query.getEstacionesDeBicing,
    getEstacionDeBicing: estacionDeBicingResolver.Query.getEstacionDeBicing,
    getEstacionesDeBicingCercanas: estacionDeBicingResolver.Query.getEstacionesDeBicingCercanas,
    getEstacionesDeBicingPorDireccion: estacionDeBicingResolver.Query.getEstacionesDeBicingPorDireccion,
      
    ListFriends: friendshipResolvers.Query.ListFriends,
    AllFriends: friendshipResolvers.Query.AllFriends,

    recorridos: recorridosResolver.Query.recorridos, 
    recorrido: recorridosResolver.Query.recorrido, 
    recorridosByUser: recorridosResolver.Query.recorridosByUser, 
    ...routingResolvers.Query,

    getAssessmentsByStationId: assessmentResolver.Query.getAssessmentsByStationId,
    getStationAssessmentInfo: assessmentResolver.Query.getStationAssessmentInfo,
    checkAssessed: assessmentResolver.Query.checkAssessed,
    BlockList: friendshipResolvers.Query.BlockList,
    
    getFavBikeStations: favStationResolver.Query.getFavBikeStations,
    getFavCarStations: favStationResolver.Query.getFavCarStations,

    getAllChallenges: challengesResolver.Query.getAllChallenges,
    getEnrolledChallenges: challengesResolver.Query.getEnrolledChallenges,
    getTrophies: challengesResolver.Query.getTrophies,
    getPromotedCompanies: challengesResolver.Query.getPromotedCompanies,

    ranking: rankingResolver.Query.ranking, 
    userStats: rankingResolver.Query.userStats, 
    globalStats: rankingResolver.Query.globalStats, 
    topUsers: rankingResolver.Query.topUsers,

    ...ChatResolver.Query
  },
  Mutation: {
    createUser: userResolvers.Mutation.createUser,
    updateMe: userResolvers.Mutation.updateMe,
    deleteMe: userResolvers.Mutation.deleteMe,
    updateUser: userResolvers.Mutation.updateUser,
    deleteUser: userResolvers.Mutation.deleteUser,

    AddFriendship: friendshipResolvers.Mutation.AddFriendship,
    RemoveFriendship: friendshipResolvers.Mutation.RemoveFriendship,

    createRecorrido: recorridosResolver.Mutation.createRecorrido,
    updateRecorrido: recorridosResolver.Mutation.updateRecorrido,
    deleteRecorrido: recorridosResolver.Mutation.deleteRecorrido, 

    createEstacionDeBicing: estacionDeBicingResolver.Mutation.createEstacionDeBicing,
    updateEstacionDeBicing:  estacionDeBicingResolver.Mutation.updateEstacionDeBicing,
    deleteEstacionDeBicing: estacionDeBicingResolver.Mutation.deleteEstacionDeBicing,

    createAssessment: assessmentResolver.Mutation.createAssessment,
    deleteAssessment: assessmentResolver.Mutation.deleteAssessment,
    editAssessment: assessmentResolver.Mutation.editAssessment,

    BlockUser: friendshipResolvers.Mutation.BlockUser,
    UnBlockUser: friendshipResolvers.Mutation.UnBlockUser,

    addFavStation: favStationResolver.Mutation.addFavStation,
    deleteFavStation: favStationResolver.Mutation.deleteFavStation,

    enrollChallenge: challengesResolver.Mutation.enrollChallenge,
  
    ...ChatResolver.Mutation
  },
  Chat: ChatResolver.Chat,
  Message: ChatResolver.Message,
  ChatParticipant: ChatResolver.ChatParticipant
};
