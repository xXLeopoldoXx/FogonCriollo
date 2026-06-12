// ============================================================
// El Fogón Criollo – models/productoModel.js
// Acceso a datos: tablas producto y categoria
// ============================================================

const { query } = require('../db/pool');

// ── Imágenes fallback ────────────────────────────────────────
const PRODUCT_IMAGES = [
  // Pollos — orden de más específico a más genérico
  { test: /pollo entero/i,         url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=640&q=80' },
  { test: /medio pollo/i,          url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=640&q=80' },
  { test: /cuarto/i,               url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80' },
  { test: /alita|bbq/i,            url: 'https://images.unsplash.com/photo-1527477396000-e3d10cbe0078?auto=format&fit=crop&w=640&q=80' },
  { test: /pechuga/i,              url: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=640&q=80' },
  { test: /combo/i,                url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=640&q=80' },
  { test: /le[ñn]a|brasa|pollo/i,  url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=640&q=80' },
  // Bebidas
  { test: /inca/i,                 url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=640&q=80' },
  { test: /coca/i,                 url: 'https://images.unsplash.com/photo-1561758033-7e924f619af0?auto=format&fit=crop&w=640&q=80' },
  { test: /chicha morada/i,        url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=640&q=80' },
  { test: /chicha de jora/i,       url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=640&q=80' },
  { test: /agua/i,                 url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=640&q=80' },
  { test: /maracuy[aá]/i,          url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=640&q=80' },
  { test: /caf[eé]/i,              url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&q=80' },
  { test: /gaseosa/i,              url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=640&q=80' },
  { test: /bebida/i,               url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80' },
  // Guarniciones
  { test: /papa.*(frita|grande)/i, url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80' },
  { test: /huanca[ií]na/i,         url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80' },
  { test: /yuca/i,                 url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=80' },
  { test: /ensalada/i,             url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80' },
  { test: /tacu/i,                 url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=80' },
  { test: /choclo/i,               url: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?auto=format&fit=crop&w=640&q=80' },
  { test: /chaufa/i,               url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=640&q=80' },
  { test: /papa|guarn/i,           url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80' },
  // Postres
  { test: /suspiro/i,              url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80' },
  { test: /mazamorra/i,            url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=640&q=80' },
  { test: /arroz con leche/i,      url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=640&q=80' },
  { test: /picar[oó]n/i,           url: 'https://images.unsplash.com/photo-1541420937988-702d78cb9dc4?auto=format&fit=crop&w=640&q=80' },
  { test: /flan/i,                 url: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=640&q=80' },
  { test: /postre|dulce/i,         url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80' },
];

function fallbackProductImage(nombre = '') {
  return PRODUCT_IMAGES.find(item => item.test.test(nombre))?.url
    ?? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=640&q=80';
}

function withProductImages(rows) {
  return rows.map(row => ({
    ...row,
    imagen_url: row.imagen_url || fallbackProductImage(row.nombre ?? row.producto),
  }));
}

async function ensureImageColumn() {
  await query('ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS imagen_url TEXT');
}

// ── Queries ──────────────────────────────────────────────────

async function getAll(soloDisponibles = false) {
  const whereClause = soloDisponibles ? 'WHERE p.disponible = true' : '';
  const { rows } = await query(
    `SELECT p.id_producto, p.nombre, p.precio, p.disponible, p.imagen_url,
            c.nombre AS categoria
     FROM producto p
     JOIN categoria c ON c.id_categoria = p.id_categoria
     ${whereClause}
     ORDER BY c.nombre, p.nombre`
  );
  return withProductImages(rows);
}

async function getByIds(ids) {
  const { rows } = await query(
    `SELECT id_producto, nombre, precio, disponible
     FROM producto
     WHERE id_producto = ANY($1::int[])`,
    [ids]
  );
  return rows;
}

async function getAdmin() {
  const { rows } = await query(
    `SELECT p.id_producto, p.nombre, p.precio, p.disponible, p.imagen_url,
            p.id_categoria, c.nombre AS categoria
     FROM producto p
     JOIN categoria c ON c.id_categoria = p.id_categoria
     ORDER BY c.nombre, p.nombre`
  );
  return withProductImages(rows);
}

async function getCategorias() {
  const { rows } = await query(
    'SELECT id_categoria, nombre FROM categoria ORDER BY nombre'
  );
  return rows;
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO producto (nombre, precio, disponible, id_categoria, imagen_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_producto, nombre, precio, disponible, id_categoria, imagen_url,
       (SELECT nombre FROM categoria c WHERE c.id_categoria = producto.id_categoria) AS categoria`,
    [data.nombre, data.precio, data.disponible, data.id_categoria, data.imagen_url]
  );
  return withProductImages(rows)[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE producto
     SET nombre = $1, precio = $2, disponible = $3, id_categoria = $4, imagen_url = $5
     WHERE id_producto = $6
     RETURNING id_producto, nombre, precio, disponible, id_categoria, imagen_url,
     (SELECT nombre FROM categoria c WHERE c.id_categoria = producto.id_categoria) AS categoria`,
    [data.nombre, data.precio, data.disponible, data.id_categoria, data.imagen_url, id]
  );
  return rows.length > 0 ? withProductImages(rows)[0] : null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM producto WHERE id_producto = $1', [id]);
  return rowCount > 0;
}

async function hide(id) {
  await query('UPDATE producto SET disponible = false WHERE id_producto = $1', [id]);
}

module.exports = {
  withProductImages,
  ensureImageColumn,
  getAll,
  getByIds,
  getAdmin,
  getCategorias,
  create,
  update,
  remove,
  hide,
};
