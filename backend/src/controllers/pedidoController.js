// ============================================================
// El Fogón Criollo – controllers/pedidoController.js
// ============================================================


const { query } = require('../db/pool');
let schemaReadyPromise = null;

const PRODUCT_IMAGES = [
  { test: /pollo entero/i, url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=640&q=80' },
  { test: /medio pollo/i, url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=640&q=80' },
  { test: /cuarto|leña|brasa|pollo/i, url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80' },
  { test: /inca|coca|chicha|agua|bebida/i, url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80' },
  { test: /papa|yuca|ensalada|guarn/i, url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80' },
  { test: /suspiro|mazamorra|postre/i, url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80' },
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

async function ensureProductoImageColumn() {
  await query('ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS imagen_url TEXT');
}

async function ensurePedidoExtras() {
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
  await ensureProductoImageColumn();
  await query('ALTER TABLE public.detalle_pedido ADD COLUMN IF NOT EXISTS nota TEXT');
  await query(`
    CREATE OR REPLACE FUNCTION public.fn_crear_pedido(
        p_id_mesa   INTEGER,
        p_id_mesero INTEGER,
        p_items     JSONB
    )
    RETURNS INTEGER LANGUAGE plpgsql AS $$
    DECLARE
        v_id_pedido INTEGER;
        v_item      JSONB;
        v_precio    NUMERIC(8,2);
    BEGIN
        INSERT INTO public.pedido (id_mesa, id_mesero)
        VALUES (p_id_mesa, p_id_mesero)
        RETURNING id_pedido INTO v_id_pedido;

      FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
              SELECT precio INTO v_precio FROM public.producto
              WHERE id_producto = (v_item->>'id_producto')::INTEGER AND disponible = TRUE;
              IF v_precio IS NULL THEN
                  RAISE EXCEPTION 'Producto % no disponible', v_item->>'id_producto';
              END IF;
              INSERT INTO public.detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, nota)
              VALUES (
                v_id_pedido,
                (v_item->>'id_producto')::INTEGER,
                (v_item->>'cantidad')::INTEGER,
                v_precio,
                NULLIF(TRIM(v_item->>'nota'), '')
              );
          END LOOP;
          RETURN v_id_pedido;
      END; $$;
    `);
  })().catch(err => {
    schemaReadyPromise = null;
    throw err;
  });
  return schemaReadyPromise;
}

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
    await ensurePedidoExtras();
    const soloDisponibles = req.query.disponible === 'true';
    const whereClause     = soloDisponibles ? 'WHERE p.disponible = true' : '';
    const { rows } = await query(
      `SELECT p.id_producto, p.nombre, p.precio, p.disponible, p.imagen_url,
              c.nombre AS categoria
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       ${whereClause}
       ORDER BY c.nombre, p.nombre`
    );
    res.json(withProductImages(rows));
  } catch (err) {
    console.error('[Productos]', err.message);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
}

//POST /api/pedidos
async function crearPedido(req, res) {
  const { id_mesa, id_mesero, items } = req.body;
  const requester = req.user ?? {};

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

  if (requester.rol === 'MESERO' && Number(requester.id_mesero) !== Number(id_mesero)) {
    return res.status(403).json({ message: 'No puedes crear pedidos para otro mesero.' });
  }

  const idsProductos = items.map(i => Number(i.id_producto));
  if (new Set(idsProductos).size !== idsProductos.length) {
    return res.status(400).json({ message: 'Hay productos repetidos en el pedido. Agrupa cantidades en una sola línea.' });
  }

  try {
    await ensurePedidoExtras();

    const { rows: productosDb } = await query(
      `SELECT id_producto, nombre, precio, disponible
       FROM producto
       WHERE id_producto = ANY($1::int[])`,
      [idsProductos]
    );

    if (productosDb.length !== idsProductos.length) {
      return res.status(400).json({ message: 'Uno o más productos no existen.' });
    }

    const noDisponible = productosDb.find(p => !p.disponible);
    if (noDisponible) {
      return res.status(409).json({ message: `Producto no disponible: ${noDisponible.nombre}` });
    }

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
                'nota',     dp.nota,
                'imagen_url', COALESCE(pr.imagen_url, '')
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
    await ensurePedidoExtras();
    const { rows } = await query(
      `SELECT p.id_pedido, p.fecha_hora,
              EXTRACT(EPOCH FROM (NOW() - p.fecha_hora))::INTEGER / 60 AS minutos_espera,
              p.estado, m.numero AS numero_mesa, m.piso, me.nombre AS mesero,
              jsonb_agg(jsonb_build_object(
                'producto', pr.nombre,
                'cantidad', dp.cantidad,
                'nota', dp.nota,
                'imagen_url', COALESCE(pr.imagen_url, '')
              ) ORDER BY dp.id_detalle) AS items
       FROM pedido p
       JOIN mesa m ON m.id_mesa = p.id_mesa
       JOIN mesero me ON me.id_mesero = p.id_mesero
       JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       JOIN producto pr ON pr.id_producto = dp.id_producto
       WHERE p.estado IN ('PENDIENTE'::estado_pedido, 'EN_PROCESO'::estado_pedido, 'LISTO'::estado_pedido)
       GROUP BY p.id_pedido, m.numero, m.piso, me.nombre
       ORDER BY p.fecha_hora ASC`
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
  const requester  = req.user ?? {};

  if (!id || isNaN(Number(id)))
    return res.status(400).json({ message: 'ID de pedido inválido.' });

const ESTADOS_VALIDOS = ['EN_PROCESO', 'LISTO', 'ENTREGADO'];
  if (!estado || !ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({
      message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}.`
    });

  try {
    const { rows: estadoRows } = await query(
      'SELECT estado, id_mesero FROM pedido WHERE id_pedido = $1',
      [id]
    );
    if (estadoRows.length === 0)
      return res.status(404).json({ message: 'Pedido no encontrado.' });

    const estadoActual = estadoRows[0].estado;
    const pedidoMesero = estadoRows[0].id_mesero;

    if (requester.rol === 'MESERO') {
      if (estado !== 'ENTREGADO') {
        return res.status(403).json({ message: 'El mesero solo puede marcar pedidos como entregados.' });
      }
      if (Number(requester.id_mesero) !== Number(pedidoMesero)) {
        return res.status(403).json({ message: 'No puedes entregar pedidos de otro mesero.' });
      }
    }

    const transiciones = {
      PENDIENTE: ['EN_PROCESO'],
      EN_PROCESO: ['LISTO'],
      LISTO: ['ENTREGADO'],
    };

    if (!transiciones[estadoActual]?.includes(estado)) {
      return res.status(409).json({
        message: `Cambio no permitido: ${estadoActual} → ${estado}.`,
      });
    }

    await query(
      `SELECT fn_cambiar_estado_pedido($1, $2::estado_pedido, $3)`,
      [id, estado, username]
    );

    req.io?.emitPedidoEstado
      ? req.io.emitPedidoEstado(Number(id), estado)
      : req.io?.emit('pedido:estado', { id_pedido: Number(id), estado });

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
    await ensurePedidoExtras();
    const { rows } = await query(
      `WITH cola AS (
         SELECT
           id_pedido,
           ROW_NUMBER() OVER (ORDER BY fecha_hora ASC) AS posicion_cola
         FROM pedido
         WHERE estado IN ('PENDIENTE'::estado_pedido, 'EN_PROCESO'::estado_pedido)
       )
       SELECT
         p.id_pedido,
         p.estado,
         p.fecha_hora,
         COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS total,
         m.numero AS numero_mesa,
         m.piso,
         c.posicion_cola,
         EXTRACT(EPOCH FROM (NOW() - p.fecha_hora))::INTEGER / 60 AS minutos_espera,
         (SELECT json_agg(json_build_object(
           'producto', pr.nombre,
           'cantidad', dp.cantidad,
           'nota',     dp.nota,
           'precio',   pr.precio,
           'imagen_url', COALESCE(pr.imagen_url, '')
         ) ORDER BY dp.id_detalle)
          FROM detalle_pedido dp
          JOIN producto pr ON pr.id_producto = dp.id_producto
          WHERE dp.id_pedido = p.id_pedido
         ) AS items
       FROM pedido p
       JOIN mesa m ON m.id_mesa = p.id_mesa
       JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       LEFT JOIN cola c ON c.id_pedido = p.id_pedido
       WHERE p.id_pedido = $1
       GROUP BY p.id_pedido, m.numero, m.piso, c.posicion_cola`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: 'Pedido no encontrado.' });

    const row = rows[0];
    const items = withProductImages(row.items ?? []);
    res.json({ ...row, items });
  } catch (err) {
    console.error('[Cliente pedido]', err.message);
    res.status(500).json({ message: 'Error al obtener el pedido.' });
  }
}

//GET /api/pedidos/cliente/espera  (PÚBLICA)
async function getClienteEspera(_req, res) {
  try {
    const { rows } = await query(
      `SELECT
         p.id_pedido,
         p.estado,
         p.fecha_hora,
         m.numero AS numero_mesa,
         m.piso,
         ROW_NUMBER() OVER (ORDER BY p.fecha_hora ASC) AS posicion_cola,
         EXTRACT(EPOCH FROM (NOW() - p.fecha_hora))::INTEGER / 60 AS minutos_espera,
         COUNT(*) OVER () AS total_en_espera
       FROM pedido p
       JOIN mesa m ON m.id_mesa = p.id_mesa
       WHERE p.estado IN ('PENDIENTE'::estado_pedido, 'EN_PROCESO'::estado_pedido, 'LISTO'::estado_pedido)
       ORDER BY
         CASE p.estado
           WHEN 'LISTO'::estado_pedido THEN 0
           WHEN 'EN_PROCESO'::estado_pedido THEN 1
           ELSE 2
         END,
         p.fecha_hora ASC
       LIMIT 25`
    );

    res.json(rows);
  } catch (err) {
    console.error('[Cliente espera]', err.message);
    res.status(500).json({ message: 'Error al obtener la lista de espera.' });
  }
}

// Legacy duplicated folder uses this file too in some project copies; keep exports explicit.
async function getClientePedidoLegacy(req, res) {
  return getClientePedido(req, res);
}

/*
 * Admin CRUD de productos. Se guarda imagen_url en producto y se crean columnas
 * automáticamente para que una BD existente no quede atrás del código.
 */
async function getAdminProductos(_req, res) {
  try {
    await ensureProductoImageColumn();
    const { rows } = await query(
      `SELECT p.id_producto, p.nombre, p.precio, p.disponible, p.imagen_url,
              p.id_categoria, c.nombre AS categoria
       FROM producto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       ORDER BY c.nombre, p.nombre`
    );
    res.json(withProductImages(rows));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getCategorias(_req, res) {
  try {
    const { rows } = await query(
      'SELECT id_categoria, nombre FROM categoria ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

function parseProductoBody(body) {
  const imagen = String(body.imagen_url ?? '').trim();
  return {
    nombre: String(body.nombre ?? '').trim().slice(0, 150),
    precio: Number(body.precio),
    disponible: body.disponible !== false,
    id_categoria: Number(body.id_categoria),
    imagen_url: imagen || null,
  };
}

function isSafeImageUrl(value) {
  if (!value) return true;
  if (value.length > 700) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function crearProducto(req, res) {
  const data = parseProductoBody(req.body);
  if (!data.nombre) return res.status(400).json({ message: 'Nombre requerido.' });
  if (!Number.isFinite(data.precio) || data.precio < 0) return res.status(400).json({ message: 'Precio inválido.' });
  if (!Number.isInteger(data.id_categoria)) return res.status(400).json({ message: 'Categoría inválida.' });
  if (!isSafeImageUrl(data.imagen_url)) return res.status(400).json({ message: 'URL de imagen inválida.' });

  try {
    await ensureProductoImageColumn();
    const { rows } = await query(
      `INSERT INTO producto (nombre, precio, disponible, id_categoria, imagen_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_producto, nombre, precio, disponible, id_categoria, imagen_url,
         (SELECT nombre FROM categoria c WHERE c.id_categoria = producto.id_categoria) AS categoria`,
      [data.nombre, data.precio, data.disponible, data.id_categoria, data.imagen_url]
    );
    res.status(201).json(withProductImages(rows)[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function actualizarProducto(req, res) {
  const { id } = req.params;
  const data = parseProductoBody(req.body);
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'ID inválido.' });
  if (!data.nombre) return res.status(400).json({ message: 'Nombre requerido.' });
  if (!Number.isFinite(data.precio) || data.precio < 0) return res.status(400).json({ message: 'Precio inválido.' });
  if (!Number.isInteger(data.id_categoria)) return res.status(400).json({ message: 'Categoría inválida.' });
  if (!isSafeImageUrl(data.imagen_url)) return res.status(400).json({ message: 'URL de imagen inválida.' });

  try {
    await ensureProductoImageColumn();
    const { rows } = await query(
      `UPDATE producto
       SET nombre = $1, precio = $2, disponible = $3, id_categoria = $4, imagen_url = $5
       WHERE id_producto = $6
       RETURNING id_producto, nombre, precio, disponible, id_categoria, imagen_url,
       (SELECT nombre FROM categoria c WHERE c.id_categoria = producto.id_categoria) AS categoria`,
      [data.nombre, data.precio, data.disponible, data.id_categoria, data.imagen_url, id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: 'Producto no encontrado.' });

    res.json(withProductImages(rows)[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function eliminarProducto(req, res) {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'ID inválido.' });

  try {
    const { rowCount } = await query('DELETE FROM producto WHERE id_producto = $1', [id]);
    if (!rowCount) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      await query('UPDATE producto SET disponible = false WHERE id_producto = $1', [id]);
      return res.json({
        message: 'Producto usado en pedidos anteriores. Se ocultó de la carta en lugar de eliminarse.',
        id_producto: Number(id),
        disponible: false,
      });
    }
    res.status(500).json({ message: err.message });
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
  getClientePedidoLegacy,
  getClienteEspera,
  getAdminProductos,
  getCategorias,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
