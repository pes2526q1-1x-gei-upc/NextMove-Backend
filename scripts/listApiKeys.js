import 'dotenv/config'; 
import authService from '../src/services/AuthService.js';

async function listKeys() {
  try {
    const keys = await authService.listApiKeys();
    
    if (keys.length === 0) {
      console.log('\nNo hay API keys registradas.\n');
      process.exit(0);
    }

    console.log('\nAPI Keys registradas:\n');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    keys.forEach((key, index) => {
      console.log(`\n${index + 1}. ${key.companyName}`);
      console.log(`   ID:             ${key.id}`);
      console.log(`   Rate Limit:     ${key.rateLimitPerHour} req/hora`);
      console.log(`   Total Requests: ${key.totalRequests}`);
      console.log(`   Creada:         ${key.createdAt}`);
      console.log(`   Último uso:     ${key.lastUsedAt || 'Nunca'}`);
      
      if (key.lastUsedAt) {
        const daysSinceCreation = Math.floor(
          (new Date() - new Date(key.createdAt)) / (1000 * 60 * 60 * 24)
        );
        const avgPerDay = daysSinceCreation > 0 
          ? Math.round(key.totalRequests / daysSinceCreation)
          : key.totalRequests;
        console.log(`   Promedio:       ${avgPerDay} req/día`);
      }
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error(' Error:', error.message);
    process.exit(1);
  }
}

listKeys();