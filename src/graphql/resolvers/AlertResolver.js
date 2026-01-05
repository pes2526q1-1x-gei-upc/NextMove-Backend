import AlertRepository from '../../repositories/AlertRepository.js';
import FavStationRepository from '../../repositories/FavStationRepository.js';

const alertRepo = new AlertRepository();
const favStationRepo = new FavStationRepository();

// Mapear campos de la BD a GraphQL
function mapAlertToGraphQL(alert) {
  return {
    id: alert.id.toString(),
    userEmail: alert.user_email,
    stationId: alert.station_id,
    horas: alert.horas || [],
    diasSemana: alert.dias_semana || [],
    activa: alert.activa,
    createdAt: alert.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: alert.updated_at?.toISOString() || new Date().toISOString(),
    stationNombre: alert.station_nombre,
    stationDireccion: alert.station_direccion,
  };
}

const alertResolver = {
  Query: {
    getStationAlerts: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        const alerts = await alertRepo.getAlertsByUser(context.user.email);
        return alerts.map(mapAlertToGraphQL);
      } catch (error) {
        console.error('Error retrieving station alerts:', error);
        throw new Error('Error al obtener las alertas de estaciones.');
      }
    },

    getStationAlert: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        const alert = await alertRepo.getAlertById(id, context.user.email);
        if (!alert) {
          throw new Error('Alerta no encontrada');
        }
        return mapAlertToGraphQL(alert);
      } catch (error) {
        console.error('Error retrieving station alert:', error);
        throw new Error('Error al obtener la alerta de estación.');
      }
    }
  },

  Mutation: {
    createStationAlert: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        const { stationId, horas, diasSemana } = input;
        
        // Verificar que la estación esté en favoritas
        const favStationIds = await favStationRepo.getFavStationIds(context.user.email, 'BIKE');
        if (!favStationIds.has(stationId)) {
          throw new Error('La estación debe estar en tus favoritas para crear una alerta.');
        }

        const alert = await alertRepo.createAlert(
          context.user.email,
          stationId,
          horas,
          diasSemana
        );
        return mapAlertToGraphQL(alert);
      } catch (error) {
        console.error('Error creating station alert:', error);
        if (error.code === '23503') {
          throw new Error('La estación no existe.');
        }
        if (error.message.includes('favoritas')) {
          throw error;
        }
        throw new Error('Error al crear la alerta de estación.');
      }
    },

    updateStationAlert: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        const { id, horas, diasSemana, activa } = input;
        const updated = await alertRepo.updateAlert(
          id,
          context.user.email,
          horas,
          diasSemana,
          activa !== undefined ? activa : true
        );
        if (!updated) {
          throw new Error('Alerta no encontrada');
        }
        return mapAlertToGraphQL(updated);
      } catch (error) {
        console.error('Error updating station alert:', error);
        throw new Error('Error al actualizar la alerta de estación.');
      }
    },

    deleteStationAlert: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        return await alertRepo.deleteAlert(id, context.user.email);
      } catch (error) {
        console.error('Error deleting station alert:', error);
        throw new Error('Error al eliminar la alerta de estación.');
      }
    },

    toggleStationAlert: async (_, { id, activa }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        const updated = await alertRepo.toggleAlert(id, context.user.email, activa);
        if (!updated) {
          throw new Error('Alerta no encontrada');
        }
        return mapAlertToGraphQL(updated);
      } catch (error) {
        console.error('Error toggling station alert:', error);
        throw new Error('Error al cambiar el estado de la alerta.');
      }
    }
  }
};

export default alertResolver;

