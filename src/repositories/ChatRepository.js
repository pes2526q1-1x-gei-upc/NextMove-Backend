import pool from '../config/database.js';

class ChatRepository {
  
  /**
   * Obtener todos los chats de un usuario
   */
  async getUserChats(userEmail) {
    const query = `
      SELECT 
        c.id,
        c.type,
        c.name,
        c.description,
        c.photo,
        c.created_at,
        c.updated_at,
        (SELECT content FROM chat_messages 
         WHERE chat_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_content,
        (SELECT created_at FROM chat_messages 
         WHERE chat_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT u.nickname FROM chat_messages m
         JOIN users u ON m.sender_email = u.email
         WHERE m.chat_id = c.id 
         ORDER BY m.created_at DESC LIMIT 1) as last_message_sender
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_email = $1
      ORDER BY c.updated_at DESC
    `;
    
    const result = await pool.query(query, [userEmail]);
    return result.rows;
  }

  /**
   * Obtener participantes de un chat
   */
  async getChatParticipants(chatId) {
    const query = `
      SELECT 
        cp.user_email,
        cp.is_admin,
        u.nickname,
        u.photo,
        cp.joined_at
      FROM chat_participants cp
      JOIN users u ON cp.user_email = u.email
      WHERE cp.chat_id = $1
      ORDER BY cp.joined_at ASC
    `;
    
    const result = await pool.query(query, [chatId]);
    return result.rows;
  }

  /**
   * Buscar chat directo entre dos usuarios
   */
  async findDirectChat(userEmail1, userEmail2) {
    const query = `
      SELECT c.id 
      FROM chats c
      WHERE c.type = 'direct'
      AND EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_id = c.id AND user_email = $1
      )
      AND EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_id = c.id AND user_email = $2
      )
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userEmail1, userEmail2]);
    return result.rows[0] || null;
  }

  /**
   * Crear chat directo
   */
  async createDirectChat(userEmail1, userEmail2) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Crear chat
      const chatResult = await client.query(
        `INSERT INTO chats (type) VALUES ('direct') RETURNING id`,
      );
      const chatId = chatResult.rows[0].id;
      
      // Agregar participantes
      await client.query(
        `INSERT INTO chat_participants (chat_id, user_email) VALUES ($1, $2), ($1, $3)`,
        [chatId, userEmail1, userEmail2]
      );
      
      await client.query('COMMIT');
      return chatId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

/**
 * Crear chat grupal
 * El primer email en participantEmails debe ser el creador (admin)
 */
async createGroupChat(name, description, participantEmails, photo) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Crear chat
    const chatResult = await client.query(
      `INSERT INTO chats (type, name, description, photo) 
       VALUES ('group', $1, $2, $3) RETURNING id`,
      [name, description, photo]
    );
    const chatId = chatResult.rows[0].id;
    
    // El primer participante es el creador (admin)
    const creatorEmail = participantEmails[0];
    
    // Agregar creador como admin
    await client.query(
      `INSERT INTO chat_participants (chat_id, user_email, is_admin) 
       VALUES ($1, $2, true)`,
      [chatId, creatorEmail]
    );
    
    // Agregar resto de participantes (no admin)
    if (participantEmails.length > 1) {
      const otherParticipants = participantEmails.slice(1);
      const values = otherParticipants.map((email, i) => 
        `($1, $${i + 2}, false)`
      ).join(', ');
      
      await client.query(
        `INSERT INTO chat_participants (chat_id, user_email, is_admin) VALUES ${values}`,
        [chatId, ...otherParticipants]
      );
    }
    
    await client.query('COMMIT');
    return chatId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

  /**
   * Verificar si usuario pertenece a un chat
   */
  async isParticipant(chatId, userEmail) {
    const query = `
      SELECT 1 FROM chat_participants 
      WHERE chat_id = $1 AND user_email = $2
    `;
    
    const result = await pool.query(query, [chatId, userEmail]);
    return result.rows.length > 0;
  }

  /**
   * Guardar mensaje
   */
  async createMessage(chatId, senderEmail, content, type = 'text') {
    const query = `
      INSERT INTO chat_messages (chat_id, sender_email, content, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [chatId, senderEmail, content, type]);
    return result.rows[0];
  }

  /**
   * Obtener mensajes de un chat (con paginación)
   */
  async getChatMessages(chatId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        m.id,
        m.chat_id,
        m.sender_email,
        m.content,
        m.type,
        m.created_at,
        m.deleted,
        m.deleted_at,
        m.edited,
        m.edited_at,
        u.nickname as sender_nickname,
        u.photo as sender_photo
      FROM chat_messages m
      JOIN users u ON m.sender_email = u.email
      WHERE m.chat_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [chatId, limit, offset]);
    return result.rows.reverse(); // Más reciente al final
  }

  /**
   * Eliminar mensaje (soft delete)
   */
  async deleteMessage(messageId, senderEmail) {
    const query = `
      UPDATE chat_messages 
      SET deleted = true, deleted_at = NOW()
      WHERE id = $1 AND sender_email = $2 AND deleted = false
      RETURNING id
    `;
    
    const result = await pool.query(query, [messageId, senderEmail]);
    return result.rows.length > 0;
  }

  /**
   * Editar mensaje
   */
  async editMessage(messageId, senderEmail, newContent) {
    const query = `
      UPDATE chat_messages 
      SET content = $3, edited = true, edited_at = NOW()
      WHERE id = $1 AND sender_email = $2 AND deleted = false
      RETURNING *
    `;
    
    const result = await pool.query(query, [messageId, senderEmail, newContent]);
    return result.rows[0] || null;
  }

  /**
   * Agregar participante a grupo
   */
  async addParticipant(chatId, userEmail) {
    const query = `
      INSERT INTO chat_participants (chat_id, user_email)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    
    const result = await pool.query(query, [chatId, userEmail]);
    return result.rows[0];
  }

  /**
   * Eliminar participante de grupo
   */
  async removeParticipant(chatId, userEmail) {
    const query = `
      DELETE FROM chat_participants 
      WHERE chat_id = $1 AND user_email = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [chatId, userEmail]);
    return result.rows.length > 0;
  }

  /**
   * Eliminar chat completo
   */
  async deleteChat(chatId) {
    // Primero eliminar todos los participantes (si hay restricción CASCADE, esto se hará automáticamente)
    // Pero lo hacemos explícitamente para asegurarnos
    await pool.query(`DELETE FROM chat_participants WHERE chat_id = $1`, [chatId]);
    
    // Luego eliminar el chat
    const query = `DELETE FROM chats WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [chatId]);
    return result.rows.length > 0;
  }

  /**
   * Obtener info de un chat
   */
  async getChatById(chatId) {
    const query = `SELECT * FROM chats WHERE id = $1`;
    const result = await pool.query(query, [chatId]);
    return result.rows[0] || null;
  }

  /**
   * Actualizar info de grupo
   */
  async updateGroupChat(chatId, name, description, photo) {
    const query = `
      UPDATE chats 
      SET name = $2, description = $3, photo = $4, updated_at = NOW()
      WHERE id = $1 AND type = 'group'
      RETURNING *
    `;
    
    const result = await pool.query(query, [chatId, name, description, photo]);
    return result.rows[0];
  }

  /**
  * Obtener amigos con info de chat
   */
  async getFriendshipsWithChatInfo(email) {
    console.log("Obteniendo amistades con info de chat de", email);
    
    const user = await pool.query(`SELECT nickname FROM users WHERE email = $1`, [email]);
    
    if (user.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const nickname = user.rows[0].nickname;
    
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN a.nickname1 = $1 THEN a.nickname2 
          ELSE a.nickname1 
        END AS friend_nickname,
        u.email AS friend_email,
        u.photo AS friend_photo,
        c.id AS chat_id,
        (SELECT content FROM chat_messages 
        WHERE chat_id = c.id 
        ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM chat_messages 
        WHERE chat_id = c.id 
        ORDER BY created_at DESC LIMIT 1) AS last_message_time
      FROM amigos a
      JOIN users u ON (
        (a.nickname1 = $1 AND a.nickname2 = u.nickname) OR 
        (a.nickname2 = $1 AND a.nickname1 = u.nickname)
      )
      LEFT JOIN chat_participants cp1 ON cp1.user_email = $2
      LEFT JOIN chat_participants cp2 ON cp2.user_email = u.email AND cp2.chat_id = cp1.chat_id
      LEFT JOIN chats c ON c.id = cp1.chat_id AND c.type = 'direct'
      ORDER BY 
        CASE WHEN c.id IS NOT NULL THEN c.updated_at ELSE NOW() END DESC
    `, [nickname, email]);
    
    return result.rows;
  }

  async isAdmin(chatId, userEmail) {
    const query = `
      SELECT is_admin FROM chat_participants 
      WHERE chat_id = $1 AND user_email = $2
    `;
   
    const result = await pool.query(query, [chatId, userEmail]);
    
    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].is_admin;
  }

  /**
   * Alternar estado de admin de un participante
   */
  async toggleAdminStatus(chatId, userEmail) {
    const query = `
      UPDATE chat_participants 
      SET is_admin = NOT is_admin
      WHERE chat_id = $1 AND user_email = $2
      RETURNING is_admin
    `;
    
    const result = await pool.query(query, [chatId, userEmail]);
    
    if (result.rows.length === 0) {
      throw new Error('Participant not found');
    }
    
    return result.rows[0].is_admin;
  }
  }

export default new ChatRepository();