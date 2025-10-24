import admin from 'firebase-admin';
// import temporal_config from './temporal_config.json'
// import temporal_config from './temporal_config.json' assert { type: 'json' };

let instance = null;

class AuthService {
  static getInstance() {
    if (!instance) {
      instance = new AuthService();
    }
    
    return instance;
  }

  constructor() {
    this.validateEnvironment();
    this.initializeFirebase();
  }

  validateEnvironment() {
    const required = ["FIREBASE_PRIVATE_KEY"];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
    }
  }

  initializeFirebase() {
    if (!admin.apps.length) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        console.log('Firebase Admin initialized successfully');
      } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        throw error;
      }
    }
  }

  /**
   * Verifica y decodifica un token de Firebase
   */
  async verifyToken(token) {
 
    if (!token) {
      throw new Error('Token no proporcionado');
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      };
    } catch (error) {
      console.error('Error verificando token:', error.message);
      return null;
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.replace('Bearer ', '');
  }

  /**
   * Crea un usuario en Firebase Auth
   */
  async createUser(userData) {
    const { email, password, displayName, phoneNumber } = userData;
    
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        phoneNumber,
      });
      
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      };
    } catch (error) {
      throw new Error(`Error creando usuario: ${error.message}`);
    }
  }

  /**
   * Genera un custom token para un usuario
   */
  async createCustomToken(uid) {
    try {
      return await admin.auth().createCustomToken(uid);
    } catch (error) {
      throw new Error(`Error generando token: ${error.message}`);
    }
  }

  /**
   * Elimina un usuario de Firebase Auth
   */
  async deleteUser(uid) {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      throw new Error(`Error eliminando usuario: ${error.message}`);
    }
  }

  /**
   * Actualiza email de un usuario
   */
  async updateEmail(uid, newEmail) {
    try {
      await admin.auth().updateUser(uid, { email: newEmail });
    } catch (error) {
      throw new Error(`Error actualizando email: ${error.message}`);
    }
  }
}

export default new AuthService();