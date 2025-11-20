import AssessmentRepository from '../../repositories/AssessmentRepository.js';

const assessmentRepository = new AssessmentRepository();

export const assessmentResolver = {
    Query:{
        getAssessmentsByStationId: async (_, { id }) => {
            try{
                return await assessmentRepository.getAssessmentsByStationId(id);
            } catch (error) {
                if(error.code === '22P02'){
                    throw new Error('Invalid data format provided.');
                }
                throw error;
            }
        }
    },
    Mutation:{
        createAssessment: async (_, { nickname, station_id, score, comments }) => {
            try{
                const assessmentData = { nickname, station_id, score, comments };
                return await assessmentRepository.createAssessment(assessmentData);
            } catch (error) {   
                if(error.code === '23503'){
                    throw new Error('Nickname or Station ID incorrect.');
                }
            }
        },
        deleteAssessment: async (_, { nickname, station_id, created_at }) => {
            try{
                const assessmentData = { nickname, station_id, created_at };
                return await assessmentRepository.DeleteAssessment(assessmentData);
            }
            catch(error){
                throw error;
            }
        },
        editAssessment: async (_, { nickname, station_id, created_at, score, comments }) => {
            try{
                const assessmentData = { nickname, station_id, created_at, score, comments };
                return await assessmentRepository.EditAssessment(assessmentData);
            } catch (error) {
                if(error.code === '23503'){
                    throw new Error('Nickname or Station ID incorrect.');
                }
                throw error;
            }
        }
    }
};