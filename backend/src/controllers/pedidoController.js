const mesaModel     = require('../models/mesaModel');
const productoModel = require('../models/productoModel');
const pedidoModel   = require('../models/pedidoModel');
const logger        = require('../utils/logger');

async function getMesas(req, res) {
  try { res.json(await mesaModel.getAll()); }
  catch (err) {
    logger.error('Error al obtener mesas', { error: err.message });
    res.status(500).json({ message: 'Error al obtener mesas.' });
  }
}

async function getProductos(req, res) {
  try {
    await pedidoModel.ensureExtras();
    const soloDisponibles = req.query.disponible === 'true';
    res.json(await productoModel.getAll(soloDisponibles));
  } catch (err) {
    logger.error('Error al obtener productos', { error: err.message });
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
}

async function crearPedido(req, res) {
  const { id_mesa, id_mesero, items } = req.body;
  const requester = req.user ?? {};

  if (requester.rol === 'MESERO' && Number(requester.id_mesero) !== Number(id_mesero))
    return res.status(403).json({ message: 'No puedes crear pedidos para otro mesero.' });

  const idsProductos = items.map(i => Number(i.id_producto));
  if (new Set(idsProductos).size !== idsProductos.length)
    return res.status(400).json({ message: 'Hay productos repetidos. Agrupa cantidades.' });

  try {
    await pedidoModel.ensureExtras();
    const productosDb = await productoModel.getByIds(idsProductos);
    if (productosDb.length !== idsProductos.length)
      return res.status(400).json({ message: 'Uno o más productos no existen.' });
    const noDisponible = productosDb.find(p => !p.disponible);
    if (noDisponible)
      return res.status(409).json({ message: `Producto no disponible: ${noDisponible.nombre}` });

    const itemsConNota = items.map(i => ({
      id_producto: Number(i.id_producto),
      cantidad:    Number(i.cantidad),
      ...(i.nota ? { nota: String(i.nota).trim() } : {}),
    }));

    const id_pedido = await pedidoModel.crear(id_mesa, id_mesero, itemsConNota);
    const pedido    = await pedidoModel.getFullById(id_pedido);
    req.io?.emit('pedido:nuevo', pedido);
    logger.info('Pedido creado', { id_pedido, id_mesa, id_mesero });
    res.status(201).json({ id_pedido, pedido });
  } catch (err) {
    logger.error('Error al crear pedido', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

async function getPedidosMesero(req, res) {
  const { id_mesero } = req.params;
  try { res.json(await pedidoModel.getPorMesero(id_mesero)); }
  catch (err) {
    logger.error('Error al obtener pedidos del mesero', { error: err.message, id_mesero: req.params.id_mesero });
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
}

async function getPedidosCocina(req, res) {
  try {
    await pedidoModel.ensureExtras();
    res.json(await pedidoModel.getCocinaActivos());
  } catch (err) {
    logger.error('Error al obtener pedidos de cocina', { error: err.message });
    res.status(500).json({ message: 'Error al obtener pedidos de cocina.' });
  }
}

async function cambiarEstado(req, res) {
  const { id }     = req.params;
  const { estado } = req.body;
  const username   = req.user?.username ?? 'sistema';
  const requester  = req.user ?? {};

  try {
    const registro = await pedidoModel.getEstado(id);
    if (!registro) return res.status(404).json({ message: 'Pedido no encontrado.' });

    const { estado: estadoActual, id_mesero: pedidoMesero } = registro;

    if (requester.rol === 'MESERO') {
      if (estado !== 'ENTREGADO')
        return res.status(403).json({ message: 'El mesero solo puede marcar pedidos como entregados.' });
      if (Number(requester.id_mesero) !== Number(pedidoMesero))
        return res.status(403).json({ message: 'No puedes entregar pedidos de otro mesero.' });
    }

    const transiciones = { PENDIENTE: ['EN_PROCESO'], EN_PROCESO: ['LISTO'], LISTO: ['ENTREGADO'] };
    if (!transiciones[estadoActual]?.includes(estado))
      return res.status(409).json({ message: `Cambio no permitido: ${estadoActual} → ${estado}.` });

    await pedidoModel.cambiarEstado(id, estado, username);
    req.io?.emitPedidoEstado
      ? req.io.emitPedidoEstado(Number(id), estado)
      : req.io?.emit('pedido:estado', { id_pedido: Number(id), estado });

    logger.info('Estado cambiado', { id_pedido: id, estado, username });
    res.json({ id_pedido: Number(id), estado });
  } catch (err) {
    logger.error('Error al cambiar estado', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

async function getClientePedido(req, res) {
  const { id } = req.params;
  try {
    await pedidoModel.ensureExtras();
    const pedido = await pedidoModel.getClientePedido(id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado.' });
    res.json(pedido);
  } catch (err) {
    logger.error('Error al obtener el pedido del cliente', { error: err.message, id: req.params.id });
    res.status(500).json({ message: 'Error al obtener el pedido.' });
  }
}

async function getClienteEspera(_req, res) {
  try { res.json(await pedidoModel.getClienteEspera()); }
  catch (err) {
    logger.error('Error al obtener la lista de espera', { error: err.message });
    res.status(500).json({ message: 'Error al obtener la lista de espera.' });
  }
}

async function getAdminProductos(_req, res) {
  try {
    await productoModel.ensureImageColumn();
    res.json(await productoModel.getAdmin());
  } catch (err) { res.status(500).json({ message: err.message }); }
}

async function getCategorias(_req, res) {
  try { res.json(await productoModel.getCategorias()); }
  catch (err) { res.status(500).json({ message: err.message }); }
}

async function crearProducto(req, res) {
  try {
    await productoModel.ensureImageColumn();
    res.status(201).json(await productoModel.create(req.body));
  } catch (err) { res.status(500).json({ message: err.message }); }
}

async function actualizarProducto(req, res) {
  const { id } = req.params;
  try {
    await productoModel.ensureImageColumn();
    const updated = await productoModel.update(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

async function eliminarProducto(req, res) {
  const { id } = req.params;
  try {
    const deleted = await productoModel.remove(id);
    if (!deleted) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      await productoModel.hide(id);
      return res.json({ message: 'Producto ocultado (tiene pedidos históricos).', id_producto: Number(id), disponible: false });
    }
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getMesas, getProductos, crearPedido,
  getPedidosMesero, getPedidosCocina, cambiarEstado,
  getClientePedido, getClienteEspera,
  getAdminProductos, getCategorias, crearProducto, actualizarProducto, eliminarProducto,
};
