// ============================================================
//  El Fogón Criollo — cron/index.js
//  Tareas programadas del backend
// ============================================================

const cron = require('node-cron');
const logger = require('../utils/logger');
const { runBackup } = require('../services/backupService');

// Por defecto: todos los días a las 3:00 AM (hora del contenedor)
const BACKUP_CRON = process.env.BACKUP_CRON ?? '0 3 * * *';

function iniciarCronJobs() {
  cron.schedule(BACKUP_CRON, () => {
    logger.info('Iniciando backup automático de la base de datos...');
    runBackup().catch(() => {}); // el error ya queda registrado dentro de runBackup
  });
  logger.info(`Cron de backup programado (${BACKUP_CRON})`);
}

module.exports = { iniciarCronJobs };
