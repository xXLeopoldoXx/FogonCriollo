// ============================================================
//  El Fogón Criollo — services/backupService.js
//  Backup automático de PostgreSQL vía pg_dump
// ============================================================

const { execFile } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const logger = require('../utils/logger');

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(__dirname, '../../backups');
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS) || 7;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function nombreArchivo() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `fogon_backup_${ts}.sql`;
}

// Borra backups con más de RETENTION_DAYS días de antigüedad
function limpiarBackupsAntiguos() {
  const limite = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    const filePath = path.join(BACKUP_DIR, file);
    if (fs.statSync(filePath).mtimeMs < limite) {
      fs.unlinkSync(filePath);
      logger.info('Backup antiguo eliminado', { file });
    }
  }
}

// Ejecuta pg_dump y guarda el resultado en BACKUP_DIR
function runBackup() {
  return new Promise((resolve, reject) => {
    const destino = path.join(BACKUP_DIR, nombreArchivo());
    const args = [
      '-h', process.env.DB_HOST ?? 'localhost',
      '-p', process.env.DB_PORT ?? '5432',
      '-U', process.env.DB_USER ?? 'postgres',
      '-F', 'p',
      '-f', destino,
      process.env.DB_NAME ?? 'fogon_criollo',
    ];

    execFile('pg_dump', args, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (err) => {
      if (err) {
        logger.error('Backup de base de datos falló', { error: err.message });
        return reject(err);
      }
      const { size } = fs.statSync(destino);
      logger.info('Backup de base de datos completado', { file: path.basename(destino), sizeKB: Math.round(size / 1024) });
      limpiarBackupsAntiguos();
      resolve(destino);
    });
  });
}

module.exports = { runBackup, BACKUP_DIR };
