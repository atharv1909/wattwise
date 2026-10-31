require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/db');

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`⚡ WattWise Backend API running on http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Tariffs API:  http://localhost:${PORT}/api/v1/tariffs/msedcl`);
  });
}

bootstrap();
