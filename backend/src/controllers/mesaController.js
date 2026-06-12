const mesaModel  = require('../models/mesaModel');
const { query }  = require('../db/pool');

async function getMesas(req, res) {
  try { res.json(await mesaModel.getAll()); }
  catch (err) { res.status(500).json({ message: err.message }); }
}

async function getPedidosActivosMesa(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT p.id_pedido, p.estado, p.fecha_hora,
              SUM(dp.cantidad * dp.precio_unitario) AS total
       FROM pedido p
       JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       WHERE p.id_mesa = $1 AND p.estado != 'ENTREGADO'
       GROUP BY p.id_pedido`,
      [id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

module.exports = { getMesas, getPedidosActivosMesa };
