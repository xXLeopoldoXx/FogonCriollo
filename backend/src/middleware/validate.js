// ============================================================
//  El Fogón Criollo — middleware/validate.js
//  Validación con Zod — middleware reutilizable
// ============================================================

const { z } = require('zod');

// ── Middleware factory ────────────────────────────────────
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'body'   ? req.body
                 : source === 'params' ? req.params
                 : source === 'query'  ? req.query
                 : req.body;

      const parsed = schema.parse(data);

      if (source === 'body')   req.body   = parsed;
      if (source === 'params') req.params = parsed;
      if (source === 'query')  req.query  = parsed;

      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({
          field:   e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          message: 'Datos inválidos.',
          errors,
        });
      }
      next(err);
    }
  };
}

// ── Schemas ───────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1).max(80).trim(),
  password: z.string().min(6).max(100),
});

const itemPedidoSchema = z.object({
  id_producto: z.number().int().positive(),
  cantidad:    z.number().int().min(1).max(20),
  nota:        z.string().max(100).optional().nullable(),
});

const crearPedidoSchema = z.object({
  id_mesa:   z.number().int().positive(),
  id_mesero: z.number().int().positive(),
  items:     z.array(itemPedidoSchema)
               .min(1, 'El pedido debe tener al menos un ítem.')
               .max(20, 'Máximo 20 ítems por pedido.')
               .refine(
                 (items) => new Set(items.map(i => i.id_producto)).size === items.length,
                 { message: 'Hay productos repetidos. Agrupa cantidades en una línea.' }
               ),
});

const cambiarEstadoSchema = z.object({
  estado: z.enum(['EN_PROCESO', 'LISTO', 'ENTREGADO']),
});

const productoSchema = z.object({
  nombre:       z.string().min(1).max(150).trim(),
  precio:       z.number().min(0).finite(),
  disponible:   z.boolean().default(true),
  id_categoria: z.number().int().positive(),
  imagen_url:   z.string().url().max(700).optional().nullable().or(z.literal('')).transform(v => v || null),
});

const reporteVentasSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido.'),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido.'),
  formato: z.enum(['json', 'xlsx', 'pdf']).default('json'),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const paginacionSchema = z.object({
  page:  z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
});

module.exports = {
  validate,
  schemas: {
    loginSchema,
    crearPedidoSchema,
    cambiarEstadoSchema,
    productoSchema,
    reporteVentasSchema,
    idParamSchema,
    paginacionSchema,
  },
};
