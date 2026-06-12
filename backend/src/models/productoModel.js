const { query } = require('../db/pool');

const PRODUCT_IMAGES = [
  { test: /pollo entero/i,              url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=640&q=80' },
  { test: /medio pollo/i,               url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=640&q=80' },
  { test: /cuarto|leña|brasa|pollo/i,   url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80' },
  { test: /inca|coca|chicha|agua|bebida/i, url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80' },
  { test: /papa|yuca|ensalada/i,        url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80' },
  { test: /suspiro|mazamorra|postre/i,  url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80' },
];

function fallbackImg(nombre = '') {
  return PRODUCT_IMAGES.find(i => i.test.test(nombre))?.url
    ?? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=640&q=80';
}

function withImages(rows) {
  return rows.map(r => ({ ...r, imagen_url: r.imagen_url || fallbackImg(r.nombre ?? r.producto) }));
}

async function ensureImageColumn() {
  await query('ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS imagen_url TEXT');
}

async function getAll(soloDisponibles = false) {
  const where = soloDisponibles ? 'WHERE p.disponible = true' : '';
  const { rows } = await query(
    `SELECT p.id_producto, p.nombre, p.precio, p.disponible, p.imagen_url,
            c.nombre AS categoria
     FROM producto p JOIN categoria c ON c.id_categoria = p.id_categoria
     ${where} ORDER BY c.nombre, p.nombre`
  );
  return withImages(rows);
}

async function getByIds(ids) {
  const { rows } = await query(
    `SELECT id_producto, nombre, precio, disponible FROM producto WHERE id_producto = ANY($1::int[])`,
    [ids]
  );
  return rows;
}

async function getAdmin() {
  const { rows } = await query(
    `SELECT p.id_producto, p.nombre, p.precio, p.disponible, p.imagen_url,
            p.id_categoria, c.nombre AS categoria
     FROM producto p JOIN categoria c ON c.id_categoria = p.id_categoria
     ORDER BY c.nombre, p.nombre`
  );
  return withImages(rows);
}

async function getCategorias() {
  const { rows } = await query('SELECT id_categoria, nombre FROM categoria ORDER BY nombre');
  return rows;
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO producto (nombre, precio, disponible, id_categoria, imagen_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *, (SELECT nombre FROM categoria c WHERE c.id_categoria = producto.id_categoria) AS categoria`,
    [data.nombre, data.precio, data.disponible ?? true, data.id_categoria, data.imagen_url ?? null]
  );
  return withImages(rows)[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE producto SET nombre=$1, precio=$2, disponible=$3, id_categoria=$4, imagen_url=$5
     WHERE id_producto=$6
     RETURNING *, (SELECT nombre FROM categoria c WHERE c.id_categoria = producto.id_categoria) AS categoria`,
    [data.nombre, data.precio, data.disponible ?? true, data.id_categoria, data.imagen_url ?? null, id]
  );
  return rows.length ? withImages(rows)[0] : null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM producto WHERE id_producto = $1', [id]);
  return rowCount > 0;
}

async function hide(id) {
  await query('UPDATE producto SET disponible = false WHERE id_producto = $1', [id]);
}

module.exports = { withImages, ensureImageColumn, getAll, getByIds, getAdmin, getCategorias, create, update, remove, hide };
