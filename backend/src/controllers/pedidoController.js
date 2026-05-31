// ============================================================
// El Fogón Criollo – controllers/pedidoController.js
// ============================================================

const mesaModel     = require('../models/mesaModel');
const productoModel = require('../models/productoModel');
const pedidoModel   = require('../models/pedidoModel');

// ── Helpers de validación ────────────────────────────────────

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

function parseProductoBody(body) {
  const imagen = String(body.imagen_url ?? '').trim();
  return {
    nombre:       String(body.nombre ?? '').trim().slice(0, 150),
    precio:       Number(body.precio),
    disponible:   body.disponible !== false,
    id_categoria: Number(body.id_categoria),
    imagen_url:   imagen || null,
  };
}

// ── Mesas ────────────────────────────────────────────────────

async function getMesas(req, res) {
  try {
    res.json(await mesaModel.getAll());
  } catch (err) {
    console.error('[Mesas]', err.message);
    res.status(500).json({ message: 'Error al obtener mesas.' });
  }
}

// ── Productos ────────────────────────────────────────────────

async function getProductos(req, res) {
  try {
    await pedidoModel.ensureExtras();
    const soloDisponibles = req.query.disponible === 'true';
    res.json(await productoModel.getAll(soloDisponibles));
  } catch (err) {
    console.error('[Productos]', err.message);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
}

// ── Pedidos ──────────────────────────────────────────────────

async function crearPedido(req, res) {
  const { id_mesa, id_mesero, items } = req.body;
  const requester = req.user ?? {};

  if (!id_mesa)    return res.status(400).json({ message: 'Mesa requerida.' });
  if (!id_mesero)  return res.status(400).json({ message: 'Mesero requerido.' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'El pedido debe tener al menos un ítem.' });
  if (items.length > 20)
    return res.status(400).json({ message: 'Máximo 20 ítems por pedido.' });

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
    await pedidoModel.ensureExtras();

    const productosDb = await productoModel.getByIds(idsProductos);

    if (productosDb.length !== idsProductos.length) {
      return res.status(400).json({ message: 'Uno o más productos no existen.' });
    }

    const noDisponible = productosDb.find(p => !p.disponible);
    if (noDisponible) {
      return res.status(409).json({ message: `Producto no disponible: ${noDisponible.nombre}` });
    }

    const itemsConNota = items.map(i => ({
      id_producto: Number(i.id_producto),
      cantidad:    Number(i.cantidad),
      ...(i.nota ? { nota: String(i.nota).trim() } : {}),
    }));

    const id_pedido = await pedidoModel.crear(id_mesa, id_mesero, itemsConNota);
    const pedido    = await pedidoModel.getFullById(id_pedido);

    req.io?.emit('pedido:nuevo', pedido);

    res.status(201).json({ id_pedido, pedido });
  } catch (err) {
    console.error('[Pedido] Error al crear:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getPedidosMesero(req, res) {
  const { id_mesero } = req.params;
  if (!id_mesero || isNaN(Number(id_mesero)))
    return res.status(400).json({ message: 'ID de mesero inválido.' });

  try {
    res.json(await pedidoModel.getPorMesero(id_mesero));
  } catch (err) {
    console.error('[Pedidos mesero]', err.message);
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
}

async function getPedidosCocina(req, res) {
  try {
    await pedidoModel.ensureExtras();
    res.json(await pedidoModel.getCocinaActivos());
  } catch (err) {
    console.error('[Cocina]', err.message);
    res.status(500).json({ message: 'Error al obtener pedidos de cocina.' });
  }
}

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
    const registro = await pedidoModel.getEstado(id);
    if (!registro)
      return res.status(404).json({ message: 'Pedido no encontrado.' });

    const { estado: estadoActual, id_mesero: pedidoMesero } = registro;

    if (requester.rol === 'MESERO') {
      if (estado !== 'ENTREGADO')
        return res.status(403).json({ message: 'El mesero solo puede marcar pedidos como entregados.' });
      if (Number(requester.id_mesero) !== Number(pedidoMesero))
        return res.status(403).json({ message: 'No puedes entregar pedidos de otro mesero.' });
    }

    const transiciones = {
      PENDIENTE:  ['EN_PROCESO'],
      EN_PROCESO: ['LISTO'],
      LISTO:      ['ENTREGADO'],
    };

    if (!transiciones[estadoActual]?.includes(estado)) {
      return res.status(409).json({
        message: `Cambio no permitido: ${estadoActual} → ${estado}.`,
      });
    }

    await pedidoModel.cambiarEstado(id, estado, username);

    req.io?.emitPedidoEstado
      ? req.io.emitPedidoEstado(Number(id), estado)
      : req.io?.emit('pedido:estado', { id_pedido: Number(id), estado });

    res.json({ id_pedido: Number(id), estado });
  } catch (err) {
    console.error('[Estado pedido]', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getClientePedido(req, res) {
  const { id } = req.params;
  if (!id || isNaN(Number(id)))
    return res.status(400).json({ message: 'ID de pedido inválido.' });

  try {
    await pedidoModel.ensureExtras();
    const pedido = await pedidoModel.getClientePedido(id);
    if (!pedido)
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    res.json(pedido);
  } catch (err) {
    console.error('[Cliente pedido]', err.message);
    res.status(500).json({ message: 'Error al obtener el pedido.' });
  }
}

async function getClientePedidoLegacy(req, res) {
  return getClientePedido(req, res);
}

async function getClienteEspera(_req, res) {
  try {
    res.json(await pedidoModel.getClienteEspera());
  } catch (err) {
    console.error('[Cliente espera]', err.message);
    res.status(500).json({ message: 'Error al obtener la lista de espera.' });
  }
}

// ── Admin CRUD productos ─────────────────────────────────────

async function getAdminProductos(_req, res) {
  try {
    await productoModel.ensureImageColumn();
    res.json(await productoModel.getAdmin());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getCategorias(_req, res) {
  try {
    res.json(await productoModel.getCategorias());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function crearProducto(req, res) {
  const data = parseProductoBody(req.body);
  if (!data.nombre)                                     return res.status(400).json({ message: 'Nombre requerido.' });
  if (!Number.isFinite(data.precio) || data.precio < 0) return res.status(400).json({ message: 'Precio inválido.' });
  if (!Number.isInteger(data.id_categoria))             return res.status(400).json({ message: 'Categoría inválida.' });
  if (!isSafeImageUrl(data.imagen_url))                 return res.status(400).json({ message: 'URL de imagen inválida.' });

  try {
    await productoModel.ensureImageColumn();
    res.status(201).json(await productoModel.create(data));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function actualizarProducto(req, res) {
  const { id } = req.params;
  const data = parseProductoBody(req.body);
  if (!id || isNaN(Number(id)))                         return res.status(400).json({ message: 'ID inválido.' });
  if (!data.nombre)                                     return res.status(400).json({ message: 'Nombre requerido.' });
  if (!Number.isFinite(data.precio) || data.precio < 0) return res.status(400).json({ message: 'Precio inválido.' });
  if (!Number.isInteger(data.id_categoria))             return res.status(400).json({ message: 'Categoría inválida.' });
  if (!isSafeImageUrl(data.imagen_url))                 return res.status(400).json({ message: 'URL de imagen inválida.' });

  try {
    await productoModel.ensureImageColumn();
    const updated = await productoModel.update(id, data);
    if (!updated)
      return res.status(404).json({ message: 'Producto no encontrado.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function eliminarProducto(req, res) {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'ID inválido.' });

  try {
    const deleted = await productoModel.remove(id);
    if (!deleted) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      await productoModel.hide(id);
      return res.json({
        message: 'Producto usado en pedidos anteriores. Se ocultó de la carta en lugar de eliminarse.',
        id_producto: Number(id),
        disponible:  false,
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
