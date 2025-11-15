import FriendshipRepository from '../../repositories/FriendshipRepository.js';

const friendshipRepository = new FriendshipRepository();

export const friendshipResolvers = {
    Query: {
        ListFriends: async (_, { nickname }) => {
            return await friendshipRepository.getFriendships(nickname);
        },
        AllFriends: async () => {
            return await friendshipRepository.getAllFriendships();
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
        }
    }
};