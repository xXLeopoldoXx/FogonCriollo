-- ============================================================
-- El Fogón Criollo – 02_extras.sql
-- Ejecutar SEGUNDO: auditoría, índices, funciones, vistas
-- ============================================================

-- Tabla auditoría
CREATE TABLE IF NOT EXISTS public.auditoria_pedido (
    id_auditoria    SERIAL        NOT NULL,
    id_pedido       INTEGER       NOT NULL,
    estado_anterior estado_pedido,
    estado_nuevo    estado_pedido NOT NULL,
    cambiado_por    VARCHAR(80),
    fecha_cambio    TIMESTAMP     NOT NULL DEFAULT NOW(),
    ip_origen       VARCHAR(45),
    observacion     TEXT,
    CONSTRAINT auditoria_pedido_pkey PRIMARY KEY (id_auditoria)
);

-- Log sistema
CREATE TABLE IF NOT EXISTS public.log_sistema (
    id_log     SERIAL       NOT NULL,
    username   VARCHAR(80),
    accion     VARCHAR(100) NOT NULL,
    detalle    TEXT,
    fecha_hora TIMESTAMP    NOT NULL DEFAULT NOW(),
    ip_origen  VARCHAR(45),
    exitoso    BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT log_sistema_pkey PRIMARY KEY (id_log)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedido_estado       ON public.pedido (estado);
CREATE INDEX IF NOT EXISTS idx_pedido_mesa         ON public.pedido (id_mesa);
CREATE INDEX IF NOT EXISTS idx_pedido_mesero       ON public.pedido (id_mesero);
CREATE INDEX IF NOT EXISTS idx_pedido_fecha        ON public.pedido (fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_estado_fecha ON public.pedido (estado, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido      ON public.detalle_pedido (id_pedido);
CREATE INDEX IF NOT EXISTS idx_detalle_producto    ON public.detalle_pedido (id_producto);
CREATE INDEX IF NOT EXISTS idx_producto_disponible ON public.producto (disponible) WHERE disponible = TRUE;
CREATE INDEX IF NOT EXISTS idx_producto_categoria  ON public.producto (id_categoria);
CREATE INDEX IF NOT EXISTS idx_mesa_piso           ON public.mesa (piso);
CREATE INDEX IF NOT EXISTS idx_usuario_rol         ON public.usuario (rol);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedido    ON public.auditoria_pedido (id_pedido, fecha_cambio DESC);
CREATE INDEX IF NOT EXISTS idx_log_username        ON public.log_sistema (username, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_log_accion          ON public.log_sistema (accion, fecha_hora DESC);

-- Función: crear pedido atómico
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
        INSERT INTO public.detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
        VALUES (v_id_pedido, (v_item->>'id_producto')::INTEGER, (v_item->>'cantidad')::INTEGER, v_precio);
    END LOOP;
    RETURN v_id_pedido;
END; $$;

-- Función: cambiar estado con validación
CREATE OR REPLACE FUNCTION public.fn_cambiar_estado_pedido(
    p_id_pedido    INTEGER,
    p_nuevo_estado estado_pedido,
    p_usuario      VARCHAR(80),
    p_ip           VARCHAR(45) DEFAULT NULL,
    p_observacion  TEXT        DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_estado_actual estado_pedido;
BEGIN
    SELECT estado INTO v_estado_actual FROM public.pedido
    WHERE id_pedido = p_id_pedido FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido % no existe', p_id_pedido; END IF;
    IF v_estado_actual = 'ENTREGADO'::estado_pedido THEN
        RAISE EXCEPTION 'No se puede modificar un pedido ENTREGADO'; END IF;
    IF v_estado_actual = 'LISTO'::estado_pedido AND p_nuevo_estado <> 'ENTREGADO'::estado_pedido THEN
        RAISE EXCEPTION 'Pedido LISTO solo puede pasar a ENTREGADO'; END IF;
    UPDATE public.pedido SET estado = p_nuevo_estado WHERE id_pedido = p_id_pedido;
    INSERT INTO public.auditoria_pedido (id_pedido, estado_anterior, estado_nuevo, cambiado_por, ip_origen, observacion)
    VALUES (p_id_pedido, v_estado_actual, p_nuevo_estado, p_usuario, p_ip, p_observacion);
END; $$;

-- Función: reporte ventas
CREATE OR REPLACE FUNCTION public.fn_reporte_ventas(p_desde TIMESTAMP, p_hasta TIMESTAMP)
RETURNS TABLE (fecha DATE, total_pedidos BIGINT, total_ingresos NUMERIC(10,2))
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT DATE(p.fecha_hora), COUNT(DISTINCT p.id_pedido),
           COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)
    FROM public.pedido p JOIN public.detalle_pedido dp ON dp.id_pedido = p.id_pedido
    WHERE p.estado = 'ENTREGADO'::estado_pedido AND p.fecha_hora BETWEEN p_desde AND p_hasta
    GROUP BY DATE(p.fecha_hora) ORDER BY DATE(p.fecha_hora);
END; $$;

-- Función: top productos
CREATE OR REPLACE FUNCTION public.fn_top_productos(p_limite INTEGER DEFAULT 10)
RETURNS TABLE (id_producto INTEGER, nombre VARCHAR, veces_pedido BIGINT, total_vendido NUMERIC(10,2))
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pr.id_producto, pr.nombre, SUM(dp.cantidad)::BIGINT,
           COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)
    FROM public.detalle_pedido dp
    JOIN public.pedido p ON p.id_pedido = dp.id_pedido
    JOIN public.producto pr ON pr.id_producto = dp.id_producto
    WHERE p.estado = 'ENTREGADO'::estado_pedido
    GROUP BY pr.id_producto, pr.nombre ORDER BY 3 DESC LIMIT p_limite;
END; $$;

-- Vista: cocina
CREATE OR REPLACE VIEW public.v_cocina_pedidos AS
SELECT p.id_pedido, p.fecha_hora,
    EXTRACT(EPOCH FROM (NOW() - p.fecha_hora))::INTEGER / 60 AS minutos_espera,
    p.estado, m.numero AS numero_mesa, m.piso, me.nombre AS mesero,
    jsonb_agg(jsonb_build_object('producto', pr.nombre, 'cantidad', dp.cantidad) ORDER BY pr.nombre) AS items
FROM public.pedido p
JOIN public.mesa m ON m.id_mesa = p.id_mesa
JOIN public.mesero me ON me.id_mesero = p.id_mesero
JOIN public.detalle_pedido dp ON dp.id_pedido = p.id_pedido
JOIN public.producto pr ON pr.id_producto = dp.id_producto
WHERE p.estado IN ('PENDIENTE'::estado_pedido, 'EN_PROCESO'::estado_pedido)
GROUP BY p.id_pedido, m.numero, m.piso, me.nombre ORDER BY p.fecha_hora ASC;

-- Vista: mesero
CREATE OR REPLACE VIEW public.v_mesero_pedidos AS
SELECT p.id_pedido, p.fecha_hora, p.estado, m.numero AS numero_mesa, m.piso,
    me.nombre AS mesero, SUM(dp.cantidad * dp.precio_unitario) AS total
FROM public.pedido p
JOIN public.mesa m ON m.id_mesa = p.id_mesa
JOIN public.mesero me ON me.id_mesero = p.id_mesero
JOIN public.detalle_pedido dp ON dp.id_pedido = p.id_pedido
WHERE p.estado <> 'ENTREGADO'::estado_pedido
GROUP BY p.id_pedido, m.numero, m.piso, me.nombre ORDER BY p.fecha_hora DESC;

-- Vista: resumen hoy
CREATE OR REPLACE VIEW public.v_resumen_hoy AS
SELECT
    COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'PENDIENTE'::estado_pedido)  AS pedidos_pendientes,
    COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'EN_PROCESO'::estado_pedido) AS pedidos_en_proceso,
    COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'LISTO'::estado_pedido)      AS pedidos_listos,
    COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'ENTREGADO'::estado_pedido)  AS pedidos_entregados,
    COALESCE(SUM(dp.cantidad * dp.precio_unitario) FILTER (WHERE p.estado = 'ENTREGADO'::estado_pedido), 0) AS ingresos_hoy
FROM public.pedido p LEFT JOIN public.detalle_pedido dp ON dp.id_pedido = p.id_pedido
WHERE DATE(p.fecha_hora) = CURRENT_DATE;

-- Vista: auditoría
CREATE OR REPLACE VIEW public.v_auditoria_pedidos AS
SELECT a.id_auditoria, a.id_pedido, m.numero AS mesa,
    a.estado_anterior, a.estado_nuevo, a.cambiado_por,
    a.fecha_cambio, a.ip_origen, a.observacion
FROM public.auditoria_pedido a
JOIN public.pedido p ON p.id_pedido = a.id_pedido
JOIN public.mesa m ON m.id_mesa = p.id_mesa
ORDER BY a.fecha_cambio DESC;

-- Trigger auditoría automática
CREATE OR REPLACE FUNCTION public.trg_fn_auditoria_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO public.auditoria_pedido (id_pedido, estado_anterior, estado_nuevo, cambiado_por)
        VALUES (NEW.id_pedido, OLD.estado, NEW.estado, current_user);
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auditoria_pedido ON public.pedido;
CREATE TRIGGER trg_auditoria_pedido
    AFTER UPDATE OF estado ON public.pedido
    FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auditoria_pedido();
