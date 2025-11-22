import FriendshipRepository from '../../repositories/FriendshipRepository.js';

const friendshipRepository = new FriendshipRepository();

export const friendshipResolvers = {
    Query: {
        ListFriends: async (_, { nickname }) => {
            return await friendshipRepository.getFriendships(nickname);
        },
        AllFriends: async () => {
            return await friendshipRepository.getAllFriendships();
        },
        BlockList: async (_, __, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            return await friendshipRepository.getBlockList(context.user.email);
        }
    },
    Mutation:{
        AddFriendship: async (_, { nickname1, nickname2 }) => {
            console.log("starting to add friendship");
            try{
                return await friendshipRepository.addFriendship(nickname1, nickname2);
            }
            catch(error){
                if(error.code === '23505'){
                    throw new Error('Friendship already exists.');
                }
                if(error.code === '23503'){
                    throw new Error('One or both users do not exist.');
                }
                throw error;
            }
        },
        RemoveFriendship: async (_, { nickname1, nickname2 }) => {
            return await friendshipRepository.removeFriendship(nickname1, nickname2);
        },
        BlockUser: async (_, { nickname }, context) => {
            try{
                if (!context.user) {
                    throw new Error('No autenticado');
                }
                return await friendshipRepository.blockUser(context.user.email, nickname);
            } catch (error) {
                if(error.code === '23503'){
                    throw new Error('User to block does not exist.');
                }
                if(error.code === '23505'){
                    throw new Error('User is already blocked.');
                }
                if(error.code === '23514'){
                    throw new Error('Cannot block yourself.');
                }
                throw error;
            }
        },
        UnBlockUser: async (_, { nickname }, context) => {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            return await friendshipRepository.unBlockUser(context.user.email, nickname);
        }
    }
};