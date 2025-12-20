import challengesRepository from '../../repositories/challengesRepository.js';

const challengesRepo = new challengesRepository();

export const challengesResolver = {
  Query: {
    getAllChallenges: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await challengesRepo.getAllChallenges();
      } catch (error) {
        error.message = "Error fetching challenges: " + error.message;
        throw error;
      }
    },
    getEnrolledChallenges: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        console.log("Fetching enrolled challenges for:", context.user.email);
        return await challengesRepo.getEnrolledChallenges(context.user.email);
      } catch (error) {
        error.message = "Error fetching enrolled challenges for " + context.user.email + ": " + error.message;
        throw error;
      }
    },
    getTrophies: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await challengesRepo.getTrophies(context.user.email);
      } catch (error) {
        error.message = "Error fetching trophies for " + context.user.email + ": " + error.message;
        throw error;
      }
    },
  },
  Mutation: {
    enrollChallenge: async (_, { challenge_id, total_distance }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        const challengeData = { challenge_id, email: context.user.email, total_distance };
        return await challengesRepo.enrollChallenge(challengeData);
      } catch (error) {
        if (error.code === '23503'){
          throw new Error('Nickname or Challenge ID incorrect.');
        }
        if (error.code === '23505'){
          if(error.detail.includes('usuario_retos_pkey'))
            throw new Error('User already enrolled in this challenge.');
          throw new Error('User can only enroll one challenge at a time.');
        }
        throw error;
      }
    },
  },
};