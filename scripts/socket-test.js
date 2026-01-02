import { io } from 'socket.io-client';

// CONFIGURACIÓN
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.FIREBASE_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk1MTg5MTkxMTA3NjA1NDM0NGUxNWUyNTY0MjViYjQyNWVlYjNhNWMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiWHVhbnlpIFFpdSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKeC1zQ3c3R3lCcFZjTGxpTmNneHRJbXFISEtyeklMYkJlVmFZckZ1NllTRkJlYnc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbmV4dG1vdmUtNjljMzciLCJhdWQiOiJuZXh0bW92ZS02OWMzNyIsImF1dGhfdGltZSI6MTc2NTA1OTA0OCwidXNlcl9pZCI6ImRCM2sya21aS3pXbE9kcUVyWHFMeUVDSVFZNjMiLCJzdWIiOiJkQjNrMmttWkt6V2xPZHFFclhxTHlFQ0lRWTYzIiwiaWF0IjoxNzY1MDU5MDQ4LCJleHAiOjE3NjUwNjI2NDgsImVtYWlsIjoieHVhbnlpLnFpdUBlc3R1ZGlhbnRhdC51cGMuZWR1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDE0NDc0MDI1MjgxNzE3OTI3MDIiXSwiZW1haWwiOlsieHVhbnlpLnFpdUBlc3R1ZGlhbnRhdC51cGMuZWR1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.k5XWNsTH7k3FOpOce08nt2DfJ3BdVZjuvqC0Uy868EBh0K2VkdqEc0M-1UgSdTPYbHPMKLlEKXDsZwFlgAHjQSpKsO5j5aLTwsivsKWB611HQhRXFF7UPkGPDqVIHc8AFbWcMcTwG0sEezS5aDiwzxqaoVSrRwNRWWCLHf5Y1nIAQkyCX4M_Lp4-bN3f0NN1SWF0puAPlpRG9ATEnUtwuufldlcFn-csJiblf_EWTz-7SDqf0QkyJHHlWv0FfT0XHTia9wEIRp6XqXVrGyOYaSbBpUUDDuTR5rVPW8h6Oa6h_GyI12BsG2Lq6hodkNzbh5e_R2DQse4RSnFNU2W_9A';
const TEST_ROOM = 'test-room-1';

console.log('='.repeat(60));
console.log('NextMove - Socket.IO Test Client');
console.log('='.repeat(60));
console.log(`Server: ${SERVER_URL}`);
console.log(`Room: ${TEST_ROOM}`);
console.log('='.repeat(60));

// Verificar que haya un token
if (TEST_TOKEN === 'YOUR_FIREBASE_TOKEN_HERE') {
  console.error('❌ Error: Debes configurar un token de Firebase válido');
  console.log('\nOpciones:');
  console.log('1. Exportar variable de entorno: export FIREBASE_TOKEN="tu-token"');
  console.log('2. Editar el archivo y reemplazar YOUR_FIREBASE_TOKEN_HERE');
  process.exit(1);
}

// Crear conexión
const socket = io(SERVER_URL, {
  auth: { token: TEST_TOKEN },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Estado
let isConnected = false;
let roomJoined = false;

// Eventos de conexión
socket.on('connect', () => {
  console.log(`\n✅ Conectado al servidor`);
  console.log(`   Socket ID: ${socket.id}`);
  isConnected = true;
});

socket.on('connection:success', (data) => {
  console.log(`\n🎉 Autenticación exitosa`);
  console.log(`   User ID: ${data.userId}`);
  console.log(`   Timestamp: ${data.timestamp}`);
  
  // Unirse automáticamente a la sala de prueba
  console.log(`\n📥 Uniéndose a sala: ${TEST_ROOM}`);
  socket.emit('join:room', { roomId: TEST_ROOM });
});

socket.on('connect_error', (error) => {
  console.error(`\n❌ Error de conexión: ${error.message}`);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔌 Desconectado: ${reason}`);
  isConnected = false;
});

// Eventos de salas
socket.on('room:joined', (data) => {
  console.log(`\n✅ Te uniste a la sala: ${data.roomId}`);
  roomJoined = true;
  
  // Solicitar lista de usuarios
  setTimeout(() => {
    console.log(`\n📋 Solicitando lista de usuarios...`);
    socket.emit('room:users:get', { roomId: TEST_ROOM });
  }, 500);
  
  // Enviar mensaje de prueba después de 1 segundo
  setTimeout(() => {
    console.log(`\n💬 Enviando mensaje de prueba...`);
    socket.emit('message:send', {
      roomId: TEST_ROOM,
      content: 'Hola desde el cliente de prueba Node.js!'
    });
  }, 1000);
  
  // Simular typing después de 2 segundos
  setTimeout(() => {
    console.log(`\n⌨️  Simulando typing...`);
    socket.emit('typing:start', { roomId: TEST_ROOM });
    
    setTimeout(() => {
      socket.emit('typing:stop', { roomId: TEST_ROOM });
    }, 1500);
  }, 2000);
});

socket.on('room:left', (data) => {
  console.log(`\n👋 Saliste de la sala: ${data.roomId}`);
  roomJoined = false;
});

socket.on('user:joined', (data) => {
  console.log(`\n👤 Usuario se unió: ${data.userName || data.userId}`);
});

socket.on('user:left', (data) => {
  console.log(`\n👋 Usuario salió: ${data.userName || data.userId}`);
});

socket.on('user:disconnected', (data) => {
  console.log(`\n🔌 Usuario desconectado: ${data.userName || data.userId}`);
});

// Eventos de mensajes
socket.on('message:new', (data) => {
  console.log(`\n💬 Nuevo mensaje:`);
  console.log(`   De: ${data.senderName || data.senderId}`);
  console.log(`   Contenido: ${data.content}`);
  console.log(`   Timestamp: ${data.timestamp}`);
});

// Eventos de typing
socket.on('typing:user', (data) => {
  console.log(`\n⌨️  ${data.userName || data.userId} está escribiendo...`);
});

socket.on('typing:stop', (data) => {
  console.log(`\n⌨️  ${data.userName || data.userId} dejó de escribir`);
});

// Eventos de usuarios en sala
socket.on('room:users:list', (data) => {
  console.log(`\n👥 Usuarios en la sala (${data.count}):`);
  data.users.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.userName || user.userId}`);
  });
});

// Ping/Pong
socket.on('pong', (data) => {
  console.log(`\n🏓 Pong recibido: ${data.timestamp}`);
});

// Errores
socket.on('error', (data) => {
  console.error(`\n❌ Error: ${data.message}`);
});

// Manejo de señales para cerrar limpiamente
process.on('SIGINT', () => {
  console.log('\n\n🛑 Cerrando conexión...');
  if (roomJoined) {
    socket.emit('leave:room', { roomId: TEST_ROOM });
  }
  socket.disconnect();
  setTimeout(() => {
    console.log('👋 Desconectado. Adiós!');
    process.exit(0);
  }, 500);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Cerrando conexión...');
  socket.disconnect();
  process.exit(0);
});

// Test de ping cada 10 segundos
setInterval(() => {
  if (isConnected) {
    socket.emit('ping');
  }
}, 10000);

// Mantener el proceso corriendo
console.log('\n⏳ Esperando eventos... (Ctrl+C para salir)\n');