import AuthService from "../../services/AuthService.js";

const users = [
  {  name: 'Juan Pérez', email: 'juan@example.com', createdAt: new Date().toISOString(), preferredMode: "CAR" },
  {  name: 'María García', email: 'maria@example.com', createdAt: new Date().toISOString(), preferredMode: "BIKE"},
];

export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      try {
        
        // El usuario ya está verificado en el context
        if (!context.user) {
          throw new Error('No autenticado');
        }

        const user = context.user;

        const userResponse = {
          name: user.displayName || user.name || 'Usuario de prueba',
          email: user.email || 'sinemail@example.com',
          photo: null,
          bioDescription: "Fib - UPC",
          birthDate: "4/10/2020",
          phoneNumber: "123456789",
          preferredMode: "CAR",
          createdAt: new Date().toISOString(),
        };
        
        return userResponse;
        
      } catch (err) {
        console.error('Mensaje:', err.message);
        throw err;
      }
    },
    User: (_, { email }) => {
      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      return user;
    },
    Users: () => {
      return users;
    },
  },
  Mutation: {
    createUser: (_, { name, email, preferredMode }) => {
      const newUser = {
        name,
        email,
        preferredMode, 
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      return newUser;
    },
    updateMe: (_, { email, name,  preferredMode }) => {
      const userIndex = users.findIndex(u => u.email === email);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      if (name) users[userIndex].name = name;
      if (email) users[userIndex].email = email;
      if (preferredMode) userIndex.preferredMode = preferredMode;
      return users[userIndex];
    },
    deleteMe: (_, { email }) => {
      const userIndex = users.findIndex(u => u.email === id);
      if (userIndex === -1) {
        return false;
      }
      users.splice(userIndex, 1);
      return true;
    },
  },
};