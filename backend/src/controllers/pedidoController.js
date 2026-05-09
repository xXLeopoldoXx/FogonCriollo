// ============================================================
// El Fogón Criollo – controllers/pedidoController.js
// ============================================================

const { query } = require('../db/pool');

// GET /api/mesas
async function getMesas(req, res) {
  try {
    const { rows } = await query(
      'SELECT id_mesa, numero, piso, capacidad FROM mesa ORDER BY piso, numero'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/productos?disponible=true
async function getProductos(req, res) {
  try {
    const { rows } = await query(
      `SELECT p.id_producto, p.nombre, p.precio, p.disponible,
              c.nombre AS categoria
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       WHERE p.disponible = true
       ORDER BY c.nombre, p.nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/pedidos  → llama fn_crear_pedido
async function crearPedido(req, res) {
  const { id_mesa, id_mesero, items } = req.body;

  if (!id_mesa || !id_mesero || !items?.length) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    const { rows } = await query(
      `SELECT fn_crear_pedido($1, $2, $3::jsonb) AS id_pedido`,
      [id_mesa, id_mesero, JSON.stringify(items)]
    );

    const id_pedido = rows[0].id_pedido;

    // Obtener datos del pedido recién creado para emitir por socket
    const { rows: pedidoRows } = await query(
      `SELECT p.id_pedido, p.fecha_hora, p.estado,
              m.numero AS numero_mesa, m.piso,
              me.nombre AS mesero,
              (SELECT json_agg(json_build_object(
                'producto', pr.nombre,
                'cantidad', dp.cantidad
              ))
               FROM detalle_pedido dp
               JOIN producto pr ON pr.id_producto = dp.id_producto
               WHERE dp.id_pedido = p.id_pedido
              ) AS items
       FROM pedido p
       JOIN mesa m    ON m.id_mesa    = p.id_mesa
       JOIN mesero me ON me.id_mesero = p.id_mesero
       WHERE p.id_pedido = $1`,
      [id_pedido]
    );

    // Emitir a cocina por socket (se adjunta en server.js)
    req.io?.emit('pedido:nuevo', pedidoRows[0]);

    res.status(201).json({ id_pedido, pedido: pedidoRows[0] });
  } catch (err) {
    console.error('[Pedido] Error al crear:', err.message);
    res.status(500).json({ message: err.message });
  }
}

// GET /api/pedidos/mesero/:id_mesero  → usa v_mesero_pedidos
async function getPedidosMesero(req, res) {
  const { id_mesero } = req.params;
  try {
    const { rows } = await query(
      `SELECT * FROM v_mesero_pedidos WHERE mesero = (
         SELECT nombre FROM mesero WHERE id_mesero = $1
       ) LIMIT 50`,
      [id_mesero]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/pedidos/cocina  → usa v_cocina_pedidos
async function getPedidosCocina(req, res) {
  try {
    const { rows } = await query('SELECT * FROM v_cocina_pedidos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PATCH /api/pedidos/:id/estado  → llama fn_cambiar_estado_pedido
async function cambiarEstado(req, res) {
  const { id }    = req.params;
  const { estado } = req.body;
  const username  = req.user?.username ?? 'sistema';

  if (!estado) return res.status(400).json({ message: 'Estado requerido' });

  try {
    await query(
      `SELECT fn_cambiar_estado_pedido($1, $2::estado_pedido, $3)`,
      [id, estado, username]
    );

    // Notificar a todos los clientes conectados
    req.io?.emit('pedido:estado', { id_pedido: Number(id), estado });

    res.json({ id_pedido: Number(id), estado });
  } catch (err) {
    console.error('[Pedido] Error al cambiar estado:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getMesas, getProductos, crearPedido, getPedidosMesero, getPedidosCocina, cambiarEstado };
