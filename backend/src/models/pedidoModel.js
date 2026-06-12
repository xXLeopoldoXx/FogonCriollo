const { query } = require('../db/pool');
const { withImages, ensureImageColumn } = require('./productoModel');

let schemaReadyPromise = null;

async function ensureExtras() {
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
    await ensureImageColumn();
    await query('ALTER TABLE public.detalle_pedido ADD COLUMN IF NOT EXISTS nota TEXT');
  })().catch(err => { schemaReadyPromise = null; throw err; });
  return schemaReadyPromise;
}

async function crear(id_mesa, id_mesero, items) {
  const { rows } = await query(
    `SELECT fn_crear_pedido($1, $2, $3::jsonb) AS id_pedido`,
    [id_mesa, id_mesero, JSON.stringify(items)]
  );
  return rows[0].id_pedido;
}

async function getFullById(id_pedido) {
  const { rows } = await query(
    `SELECT p.id_pedido, p.fecha_hora, p.estado,
            m.numero AS numero_mesa, m.piso, me.nombre AS mesero,
            (SELECT json_agg(json_build_object('producto',pr.nombre,'cantidad',dp.cantidad,'nota',dp.nota,'imagen_url',COALESCE(pr.imagen_url,''))
             ORDER BY dp.id_detalle)
             FROM detalle_pedido dp JOIN producto pr ON pr.id_producto=dp.id_producto
             WHERE dp.id_pedido=p.id_pedido) AS items
     FROM pedido p
     JOIN mesa m ON m.id_mesa=p.id_mesa
     JOIN mesero me ON me.id_mesero=p.id_mesero
     WHERE p.id_pedido=$1`,
    [id_pedido]
  );
  return rows[0] ?? null;
}

async function getPorMesero(id_mesero) {
  const { rows } = await query(
    `SELECT * FROM v_mesero_pedidos
     WHERE mesero=(SELECT nombre FROM mesero WHERE id_mesero=$1)
     ORDER BY fecha_hora DESC LIMIT 50`,
    [id_mesero]
  );
  return rows;
}

async function getCocinaActivos() {
  const { rows } = await query(
    `SELECT p.id_pedido, p.fecha_hora,
            EXTRACT(EPOCH FROM (NOW()-p.fecha_hora))::INTEGER/60 AS minutos_espera,
            p.estado, m.numero AS numero_mesa, m.piso, me.nombre AS mesero,
            jsonb_agg(jsonb_build_object('producto',pr.nombre,'cantidad',dp.cantidad,'nota',dp.nota,'imagen_url',COALESCE(pr.imagen_url,''))
            ORDER BY dp.id_detalle) AS items
     FROM pedido p
     JOIN mesa m ON m.id_mesa=p.id_mesa
     JOIN mesero me ON me.id_mesero=p.id_mesero
     JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
     JOIN producto pr ON pr.id_producto=dp.id_producto
     WHERE p.estado IN ('PENDIENTE','EN_PROCESO','LISTO')
     GROUP BY p.id_pedido,m.numero,m.piso,me.nombre
     ORDER BY p.fecha_hora ASC`
  );
  return rows;
}

async function getEstado(id) {
  const { rows } = await query('SELECT estado, id_mesero FROM pedido WHERE id_pedido=$1', [id]);
  return rows[0] ?? null;
}

async function cambiarEstado(id, estado, username) {
  await query(`SELECT fn_cambiar_estado_pedido($1,$2::estado_pedido,$3)`, [id, estado, username]);
}

async function getClientePedido(id) {
  const { rows } = await query(
    `WITH cola AS (
       SELECT id_pedido, ROW_NUMBER() OVER (ORDER BY fecha_hora ASC) AS posicion_cola
       FROM pedido WHERE estado IN ('PENDIENTE','EN_PROCESO')
     )
     SELECT p.id_pedido, p.estado, p.fecha_hora,
            COALESCE(SUM(dp.cantidad*dp.precio_unitario),0) AS total,
            m.numero AS numero_mesa, m.piso, c.posicion_cola,
            EXTRACT(EPOCH FROM (NOW()-p.fecha_hora))::INTEGER/60 AS minutos_espera,
            (SELECT json_agg(json_build_object('producto',pr.nombre,'cantidad',dp2.cantidad,'nota',dp2.nota,'precio',pr.precio,'imagen_url',COALESCE(pr.imagen_url,''))
             ORDER BY dp2.id_detalle)
             FROM detalle_pedido dp2 JOIN producto pr ON pr.id_producto=dp2.id_producto
             WHERE dp2.id_pedido=p.id_pedido) AS items
     FROM pedido p
     JOIN mesa m ON m.id_mesa=p.id_mesa
     JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
     LEFT JOIN cola c ON c.id_pedido=p.id_pedido
     WHERE p.id_pedido=$1
     GROUP BY p.id_pedido,m.numero,m.piso,c.posicion_cola`,
    [id]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return { ...row, items: withImages(row.items ?? []) };
}

async function getClienteEspera() {
  const { rows } = await query(
    `SELECT p.id_pedido, p.estado, p.fecha_hora,
            m.numero AS numero_mesa, m.piso,
            ROW_NUMBER() OVER (ORDER BY p.fecha_hora ASC) AS posicion_cola,
            EXTRACT(EPOCH FROM (NOW()-p.fecha_hora))::INTEGER/60 AS minutos_espera
     FROM pedido p JOIN mesa m ON m.id_mesa=p.id_mesa
     WHERE p.estado IN ('PENDIENTE','EN_PROCESO','LISTO')
     ORDER BY CASE p.estado WHEN 'LISTO' THEN 0 WHEN 'EN_PROCESO' THEN 1 ELSE 2 END, p.fecha_hora ASC
     LIMIT 25`
  );
  return rows;
}

module.exports = { ensureExtras, crear, getFullById, getPorMesero, getCocinaActivos, getEstado, cambiarEstado, getClientePedido, getClienteEspera };
