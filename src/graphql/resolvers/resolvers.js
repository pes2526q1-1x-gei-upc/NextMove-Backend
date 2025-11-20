  import { userResolvers } from './userResolvers.js';
  import  EVStationResolvers from './EVStationRevolvers.js';
  import { estacionDeBicingResolver } from './EstacionDeBicingResolver.js'; 
  import { friendshipResolvers } from './FriendshipResolvers.js';
  import { recorridosResolver } from './RecorridoResolver.js';
  import { assessmentResolver } from './AssessmentResolvers.js';
  import { createSourceEventStream } from 'graphql';


  export const resolvers = {
    Query: {
      hello: () => 'Hello world!',
      me: userResolvers.Query.me,
      User: userResolvers.Query.User,
      Users: userResolvers.Query.Users,
      stations: EVStationResolvers.Query.stations,
      station: EVStationResolvers.Query.station,
      nearbyStations: EVStationResolvers.Query.nearbyStations,
      getEstacionesDeBicing: estacionDeBicingResolver.Query.getEstacionesDeBicing,
      getEstacionDeBicing: estacionDeBicingResolver.Query.getEstacionDeBicing,
      getEstacionesDeBicingCercanas: estacionDeBicingResolver.Query.getEstacionesDeBicingCercanas,
      ListFriends: friendshipResolvers.Query.ListFriends,
      AllFriends: friendshipResolvers.Query.AllFriends,
      recorridos: recorridosResolver.Query.recorridos, 
      recorrido: recorridosResolver.Query.recorrido, 
      recorridosByUser: recorridosResolver.Query.recorridosByUser,
      getAssessmentsByStationId: assessmentResolver.Query.getAssessmentsByStationId,
      getStationAssessmentInfo: assessmentResolver.Query.getStationAssessmentInfo,
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
      editAssessment: assessmentResolver.Mutation.editAssessment
    }
  };
