import pool from '../config/database.js';
class FriendshipRepository {
  /*Obtener todas las amistades de un usuario */
  async getFriendships(email){
    console.log("obteniendo amistades de ", email);
    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
        `, [email]);
    const nickname = user.rows[0].nickname;
    const result = await pool.query(`
        SELECT CASE WHEN nickname1 =$1 THEN nickname2 
        ELSE nickname1 
        END AS name, u.photo
        FROM amigos a, users u
        WHERE (a.nickname1 = $1 and a.nickname2 = u.nickname) OR (a.nickname2 = $1 and a.nickname1 = u.nickname)
        `, [nickname]);
    console.log("resultados de la query de amistades", result.rows);
    return result.rows;
  }
  async getAllFriendships(){
    const result = await pool.query(`
        SELECT * FROM amigos
        `);
    return result.rows;
  }
  async addFriendship(email, nickname2){
    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
        `, [email]);
    const nickname1 = user.rows[0].nickname;
    const result = await pool.query(`
        INSERT INTO amigos (nickname1, nickname2)
        VALUES ($1, $2)
        RETURNING *
        `, [nickname1, nickname2]);
    return result.rows[0];
  }
  async removeFriendship(email, nickname2){
    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
        `, [email]);
    const nickname1 = user.rows[0].nickname;
    await pool.query(`
        DELETE FROM amigos
        WHERE (nickname1 = $1 AND nickname2 = $2) OR (nickname1 = $2 AND nickname2 = $1)
        RETURNING *
        `, [nickname1, nickname2]);
        
    return nickname1;
  }
  async getBlockList(email){   //nickname1=blocker, nickname2=blocked
    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
        `, [email]);
    const result = await pool.query(`
        SELECT b.nickname2 AS blocked, u.photo
        FROM bloqueados b, users u
        WHERE b.nickname1 = $1 AND b.nickname2 = u.nickname
        `, [user.rows[0].nickname]);
    return result.rows;
  }
  async blockUser(email, nickname2){
    const nickname1 = await this.removeFriendship(email, nickname2);
    const result = await pool.query(`
        INSERT INTO bloqueados (nickname1, nickname2)
        VALUES ($1, $2)
        `, [nickname1, nickname2]);
    return result.rowCount > 0;
  }
  async unBlockUser(email, nickname2){
    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
        `, [email]);
    const result = await pool.query(`
        DELETE FROM bloqueados
        WHERE nickname1 = $1 AND nickname2 = $2
        `, [user.rows[0].nickname, nickname2]);
    return result.rowCount > 0;
  }
}

export default FriendshipRepository;