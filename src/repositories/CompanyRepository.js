import pool from '../config/database.js';

class CompanyRepository {
  
  /**
   * Crear una nueva API key para una empresa
   */
  async createApiKey(companyName, keyHash, rateLimitPerHour = 1000) {
    const result = await pool.query(`
      INSERT INTO api_keys (company_name, key_hash, rate_limit_per_hour)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        company_name AS "companyName",
        rate_limit_per_hour AS "rateLimitPerHour",
        total_requests AS "totalRequests",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
    `, [companyName, keyHash, rateLimitPerHour]);

    return result.rows[0];
  }

  /**
   * Verificar API key por hash e incrementar contador
   */
  async verifyAndIncrementApiKey(keyHash) {
    const result = await pool.query(`
      UPDATE api_keys 
      SET last_used_at = NOW(),
          total_requests = total_requests + 1
      WHERE key_hash = $1
      RETURNING 
        id,
        company_name AS "companyName",
        rate_limit_per_hour AS "rateLimitPerHour",
        total_requests AS "totalRequests"
    `, [keyHash]);

    return result.rows[0];
  }

  /**
   * Obtener todas las API keys con estadísticas
   */
  async getAllApiKeys() {
    const result = await pool.query(`
      SELECT 
        id,
        company_name AS "companyName",
        rate_limit_per_hour AS "rateLimitPerHour",
        total_requests AS "totalRequests",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
        TO_CHAR(last_used_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "lastUsedAt"
      FROM api_keys
      ORDER BY created_at DESC
    `);

    return result.rows;
  }

  /**
   * Obtener estadísticas de uso de una API key
   */
  async getApiKeyStats(keyHash) {
    const result = await pool.query(`
      SELECT 
        company_name AS "companyName",
        rate_limit_per_hour AS "rateLimitPerHour",
        total_requests AS "totalRequests",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
        TO_CHAR(last_used_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "lastUsedAt",
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS "daysActive"
      FROM api_keys
      WHERE key_hash = $1
    `, [keyHash]);

    if (result.rows.length === 0) {
      return null;
    }

    const stats = result.rows[0];
    
    return {
      ...stats,
      avgRequestsPerDay: stats.daysActive > 0 
        ? Math.round(stats.totalRequests / stats.daysActive) 
        : stats.totalRequests
    };
  }

  /**
   * Actualizar rate limit de una empresa
   */
  async updateRateLimit(keyHash, newRateLimit) {
    const result = await pool.query(`
      UPDATE api_keys 
      SET rate_limit_per_hour = $1
      WHERE key_hash = $2
      RETURNING 
        id,
        company_name AS "companyName",
        rate_limit_per_hour AS "rateLimitPerHour"
    `, [newRateLimit, keyHash]);

    return result.rows[0];
  }

  /**
   * Eliminar una API key
   */
  async deleteApiKey(keyHash) {
    const result = await pool.query(`
      DELETE FROM api_keys 
      WHERE key_hash = $1 
      RETURNING id
    `, [keyHash]);

    return result.rows.length > 0;
  }
}

const companyRepository = new CompanyRepository();
export default companyRepository;