const users = [
  { id: '1', nombre: 'Juan Pérez', email: 'juan@example.com', createdAt: new Date().toISOString() },
  { id: '2', nombre: 'María García', email: 'maria@example.com', createdAt: new Date().toISOString() },
];

export const userResolvers = {
  Query: {
    User: (_, { id }) => {
      const user = users.find(u => u.id === id);
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
    createUser: (_, { nombre, email, password }) => {
      const newUser = {
        id: String(users.length + 1),
        nombre,
        email,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      return newUser;
    },
    updateUser: (_, { id, nombre, email }) => {
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      if (nombre) users[userIndex].nombre = nombre;
      if (email) users[userIndex].email = email;
      
      return users[userIndex];
    },
    deleteUser: (_, { id }) => {
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return false;
      }
      users.splice(userIndex, 1);
      return true;
    },
  },
};