// ============================================================
// El Fogón Criollo – controllers/pedidoController.js
// ============================================================


const { query } = require('../db/pool');

//GET /api/mesas
async function getMesas(req, res) {
  try {
    const { rows } = await query(
      'SELECT id_mesa, numero, piso, capacidad FROM mesa ORDER BY piso, numero'
    );
    res.json(rows);
  } catch (err) {
    console.error('[Mesas]', err.message);
    res.status(500).json({ message: 'Error al obtener mesas.' });
  }
}

//GET /api/productos?disponible=true
async function getProductos(req, res) {
  try {
    const soloDisponibles = req.query.disponible === 'true';
    const whereClause     = soloDisponibles ? 'WHERE p.disponible = true' : '';
    const { rows } = await query(
      `SELECT p.id_producto, p.nombre, p.precio, p.disponible,
              c.nombre AS categoria
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       ${whereClause}
       ORDER BY c.nombre, p.nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error('[Productos]', err.message);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
}

//POST /api/pedidos
async function crearPedido(req, res) {
  const { id_mesa, id_mesero, items } = req.body;

  // Validaciones de entrada
  if (!id_mesa)          return res.status(400).json({ message: 'Mesa requerida.' });
  if (!id_mesero)        return res.status(400).json({ message: 'Mesero requerido.' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'El pedido debe tener al menos un ítem.' });
  if (items.length > 20)
    return res.status(400).json({ message: 'Máximo 20 ítems por pedido.' });

  // Validar cada ítem
  for (const item of items) {
    if (!item.id_producto || !Number.isInteger(Number(item.id_producto)))
      return res.status(400).json({ message: 'ID de producto inválido.' });
    if (!item.cantidad || item.cantidad < 1 || item.cantidad > 20)
      return res.status(400).json({ message: `Cantidad inválida para el producto ${item.id_producto}.` });
    if (item.nota && typeof item.nota === 'string' && item.nota.length > 100)
      return res.status(400).json({ message: 'La nota de un ítem no puede superar 100 caracteres.' });
  }

  try {
    // Llamar a la función de BD (nota incluida en el JSON si existe)
    const itemsConNota = items.map(i => ({
      id_producto: Number(i.id_producto),
      cantidad:    Number(i.cantidad),
      ...(i.nota ? { nota: String(i.nota).trim() } : {}),
    }));

    const { rows } = await query(
      `SELECT fn_crear_pedido($1, $2, $3::jsonb) AS id_pedido`,
      [id_mesa, id_mesero, JSON.stringify(itemsConNota)]
    );
    const id_pedido = rows[0].id_pedido;

    // Obtener datos completos del pedido para emitir por socket
    const { rows: pedidoRows } = await query(
      `SELECT p.id_pedido, p.fecha_hora, p.estado,
              m.numero AS numero_mesa, m.piso,
              me.nombre AS mesero,
              (SELECT json_agg(json_build_object(
                'producto', pr.nombre,
                'cantidad', dp.cantidad,
                'nota',     dp.nota
              ) ORDER BY dp.id_detalle)
               FROM detalle_pedido dp
               JOIN producto pr ON pr.id_producto = dp.id_producto
               WHERE dp.id_pedido = p.id_pedido
              ) AS items
       FROM pedido p
       JOIN mesa   m  ON m.id_mesa    = p.id_mesa
       JOIN mesero me ON me.id_mesero = p.id_mesero
       WHERE p.id_pedido = $1`,
      [id_pedido]
    );

    req.io?.emit('pedido:nuevo', pedidoRows[0]);

    res.status(201).json({ id_pedido, pedido: pedidoRows[0] });
  } catch (err) {
    console.error('[Pedido] Error al crear:', err.message);
    res.status(500).json({ message: err.message });
  }
}

//GET /api/pedidos/mesero/:id_mesero
async function getPedidosMesero(req, res) {
  const { id_mesero } = req.params;
  if (!id_mesero || isNaN(Number(id_mesero)))
    return res.status(400).json({ message: 'ID de mesero inválido.' });

  try {
    const { rows } = await query(
      `SELECT * FROM v_mesero_pedidos
       WHERE mesero = (SELECT nombre FROM mesero WHERE id_mesero = $1)
       ORDER BY fecha_hora DESC
       LIMIT 50`,
      [id_mesero]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Pedidos mesero]', err.message);
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
}

//GET /api/pedidos/cocina
async function getPedidosCocina(req, res) {
  try {
    const { rows } = await query(
      'SELECT * FROM v_cocina_pedidos ORDER BY fecha_hora ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[Cocina]', err.message);
    res.status(500).json({ message: 'Error al obtener pedidos de cocina.' });
  }
}

//PATCH /api/pedidos/:id/estado
async function cambiarEstado(req, res) {
  const { id }     = req.params;
  const { estado } = req.body;
  const username   = req.user?.username ?? 'sistema';

  if (!id || isNaN(Number(id)))
    return res.status(400).json({ message: 'ID de pedido inválido.' });

  const ESTADOS_VALIDOS = ['EN_PROCESO', 'LISTO', 'ENTREGADO'];
  if (!estado || !ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({
      message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}.`
    });

  try {
    await query(
      `SELECT fn_cambiar_estado_pedido($1, $2::estado_pedido, $3)`,
      [id, estado, username]
    );

    req.io?.emit('pedido:estado', { id_pedido: Number(id), estado });

    res.json({ id_pedido: Number(id), estado });
  } catch (err) {
    console.error('[Estado pedido]', err.message);
    res.status(500).json({ message: err.message });
  }
}

//GET /api/pedidos/:id/cliente  (PÚBLICA)
async function getClientePedido(req, res) {
  const { id } = req.params;

  if (!id || isNaN(Number(id)))
    return res.status(400).json({ message: 'ID de pedido inválido.' });

  try {
    const { rows } = await query(
      `SELECT
         p.id_pedido,
         p.estado,
         p.fecha_hora,
         p.total,
         m.numero   AS numero_mesa,
         m.piso,
         (SELECT json_agg(json_build_object(
           'producto', pr.nombre,
           'cantidad', dp.cantidad,
           'nota',     dp.nota,
           'precio',   pr.precio
         ) ORDER BY dp.id_detalle)
          FROM detalle_pedido dp
          JOIN producto pr ON pr.id_producto = dp.id_producto
          WHERE dp.id_pedido = p.id_pedido
         ) AS items
       FROM pedido p
       JOIN mesa m ON m.id_mesa = p.id_mesa
       WHERE p.id_pedido = $1`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: 'Pedido no encontrado.' });

    // No exponer datos del mesero ni información sensible al cliente
    const { id_pedido, estado, fecha_hora, total, numero_mesa, piso, items } = rows[0];
    res.json({ id_pedido, estado, fecha_hora, total, numero_mesa, piso, items });
  } catch (err) {
    console.error('[Cliente pedido]', err.message);
    res.status(500).json({ message: 'Error al obtener el pedido.' });
  }
}

module.exports = {
  getMesas,
  getProductos,
  crearPedido,
  getPedidosMesero,
  getPedidosCocina,
  cambiarEstado,
  getClientePedido,   
};
