import FCMTokenRepository from '../../repositories/FCMTokenRepository.js';

const fcmTokenRepo = new FCMTokenRepository();

// Mapear campos de la BD a GraphQL
function mapTokenToGraphQL(token) {
  return {
    id: token.id.toString(),
    userEmail: token.user_email,
    fcmToken: token.fcm_token,
    deviceId: token.device_id,
    platform: token.platform,
    createdAt: token.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: token.updated_at?.toISOString() || new Date().toISOString(),
  };
}

const fcmTokenResolver = {
  Mutation: {
    registerFCMToken: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        const { fcmToken, deviceId, platform } = input;
        const token = await fcmTokenRepo.upsertToken(
          context.user.email,
          fcmToken,
          deviceId,
          platform
        );
        return mapTokenToGraphQL(token);
      } catch (error) {
        console.error('Error registering FCM token:', error);
        throw new Error('Error al registrar el token FCM.');
      }
    },

    deleteFCMToken: async (_, { fcmToken }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que el token pertenece al usuario
        const existingToken = await fcmTokenRepo.getTokenByFCMToken(fcmToken);
        if (existingToken && existingToken.user_email !== context.user.email) {
          throw new Error('No tienes permiso para eliminar este token');
        }

        return await fcmTokenRepo.deleteToken(fcmToken);
      } catch (error) {
        console.error('Error deleting FCM token:', error);
        throw new Error('Error al eliminar el token FCM.');
      }
    }
  }
};

export default fcmTokenResolver;

