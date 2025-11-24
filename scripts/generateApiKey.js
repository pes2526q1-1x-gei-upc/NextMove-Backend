import 'dotenv/config'; 
import authService from '../src/services/AuthService.js';


async function generateKey() {
  const companyName = process.argv[2];
  const rateLimit = parseInt(process.argv[3]) || 1000;

  if (!companyName) {
    console.error('Uso: node scripts/generateApiKey.js "Nombre Empresa" [rate_limit]');
    console.error('Ejemplo: node scripts/generateApiKey.js "Acme Corp" 5000');
    process.exit(1);
  }

  try {
    const result = await authService.createApiKey(companyName, rateLimit);
    
    console.log('\n API Key generada exitosamente\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Empresa:      ', result.companyName);
    console.log('Rate Limit:   ', result.rateLimitPerHour, 'peticiones/hora');
    console.log('Creada:       ', result.createdAt);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n  IMPORTANTE: Guarda esta API key, NO se podrá recuperar:\n');
    console.log('    ' + result.apiKey);
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateKey();