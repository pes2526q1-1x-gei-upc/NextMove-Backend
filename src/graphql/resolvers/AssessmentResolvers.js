import AssessmentRepository from '../../repositories/AssessmentRepository.js';

const assessmentRepository = new AssessmentRepository();

export const assessmentResolver = {
  Query:{
    getAssessmentsByStationId: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await assessmentRepository.getAssessmentsByStationId(id);
      } catch (error) {
        if (error.code === '22P02'){
          throw new Error('Invalid data format provided.');
        }
        throw error;
      }
    },
    getStationAssessmentInfo: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await assessmentRepository.getStationAssessmentInfo(id);
      } catch (error) {
        if (error.code === '22P02'){
          throw new Error('Invalid data format provided.');
        }
        throw error;
      }
    }
  },
  Mutation:{
    createAssessment: async (_, { station_id, score, comments }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        const assessmentData = { email:context.user.email, station_id, score, comments };
        return await assessmentRepository.createAssessment(assessmentData);
      } catch (error) {   
        if (error.code === '23503'){
          throw new Error('Nickname or Station ID incorrect.');
        }
        if (error.code === '22P02'){
          throw new Error('Invalid data format provided.');
        }
        if (error.code === '23514'){
          throw new Error('Score must be between 1 and 5.');
        }
        if (error.code === '23505'){
          throw new Error('Assessment already exists for this user and station.');
        }
      }
    },
    deleteAssessment: async (_, {  station_id }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      // eslint-disable-next-line no-useless-catch
      try {
        const assessmentData = { email:context.user.email, station_id };
        return await assessmentRepository.DeleteAssessment(assessmentData);
      }
      catch (error){
        throw error;
      }
    },
    editAssessment: async (_, { station_id, score, comments }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        const assessmentData = { email:context.user.email, station_id, score, comments };
        return await assessmentRepository.EditAssessment(assessmentData);
      } catch (error) {
        if (error.code === '23503'){
          throw new Error('Nickname or Station ID incorrect.');
        }
        throw error;
      }
    }
  }
};