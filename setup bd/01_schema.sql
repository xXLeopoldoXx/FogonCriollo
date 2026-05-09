-- ============================================================
-- El Fogón Criollo – 01_schema.sql
-- Ejecutar PRIMERO: ENUMs + tablas base
-- ============================================================

-- ENUMs
CREATE TYPE estado_pedido AS ENUM ('PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO');
CREATE TYPE rol_usuario   AS ENUM ('MESERO', 'COCINERO', 'ADMIN');

-- Categorías
CREATE TABLE IF NOT EXISTS public.categoria (
    id_categoria SERIAL      NOT NULL,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  VARCHAR(255),
    CONSTRAINT categoria_pkey PRIMARY KEY (id_categoria)
);

-- Mesas
CREATE TABLE IF NOT EXISTS public.mesa (
    id_mesa   SERIAL  NOT NULL,
    numero    INTEGER NOT NULL,
    piso      INTEGER NOT NULL CHECK (piso BETWEEN 1 AND 3),
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    CONSTRAINT mesa_pkey       PRIMARY KEY (id_mesa),
    CONSTRAINT mesa_numero_key UNIQUE (numero)
);

-- Meseros
CREATE TABLE IF NOT EXISTS public.mesero (
    id_mesero SERIAL       NOT NULL,
    nombre    VARCHAR(150) NOT NULL,
    turno     VARCHAR(50),
    CONSTRAINT mesero_pkey PRIMARY KEY (id_mesero)
);

-- Usuarios
CREATE TABLE IF NOT EXISTS public.usuario (
    id_usuario SERIAL      NOT NULL,
    username   VARCHAR(80) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    rol        rol_usuario  NOT NULL DEFAULT 'MESERO'::rol_usuario,
    id_mesero  INTEGER     NOT NULL,
    CONSTRAINT usuario_pkey          PRIMARY KEY (id_usuario),
    CONSTRAINT usuario_username_key  UNIQUE (username),
    CONSTRAINT usuario_id_mesero_key UNIQUE (id_mesero)
);

-- Productos
CREATE TABLE IF NOT EXISTS public.producto (
    id_producto  SERIAL        NOT NULL,
    nombre       VARCHAR(150)  NOT NULL,
    precio       NUMERIC(8,2)  NOT NULL CHECK (precio >= 0),
    disponible   BOOLEAN       NOT NULL DEFAULT TRUE,
    id_categoria INTEGER       NOT NULL,
    CONSTRAINT producto_pkey PRIMARY KEY (id_producto)
);

-- Pedidos
CREATE TABLE IF NOT EXISTS public.pedido (
    id_pedido  SERIAL        NOT NULL,
    fecha_hora TIMESTAMP     NOT NULL DEFAULT NOW(),
    estado     estado_pedido NOT NULL DEFAULT 'PENDIENTE'::estado_pedido,
    id_mesa    INTEGER       NOT NULL,
    id_mesero  INTEGER       NOT NULL,
    CONSTRAINT pedido_pkey PRIMARY KEY (id_pedido)
);

-- Detalle pedido
CREATE TABLE IF NOT EXISTS public.detalle_pedido (
    id_detalle      SERIAL       NOT NULL,
    id_pedido       INTEGER      NOT NULL,
    id_producto     INTEGER      NOT NULL,
    cantidad        INTEGER      NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(8,2) NOT NULL CHECK (precio_unitario >= 0),
    CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id_detalle)
);

-- Foreign keys
ALTER TABLE public.detalle_pedido
    ADD CONSTRAINT fk_detalle_pedido   FOREIGN KEY (id_pedido)    REFERENCES public.pedido    (id_pedido)    ON DELETE CASCADE;
ALTER TABLE public.detalle_pedido
    ADD CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)  REFERENCES public.producto  (id_producto);
ALTER TABLE public.pedido
    ADD CONSTRAINT fk_pedido_mesa      FOREIGN KEY (id_mesa)      REFERENCES public.mesa      (id_mesa);
ALTER TABLE public.pedido
    ADD CONSTRAINT fk_pedido_mesero    FOREIGN KEY (id_mesero)    REFERENCES public.mesero    (id_mesero);
ALTER TABLE public.producto
    ADD CONSTRAINT fk_producto_cat     FOREIGN KEY (id_categoria) REFERENCES public.categoria (id_categoria);
ALTER TABLE public.usuario
    ADD CONSTRAINT fk_usuario_mesero   FOREIGN KEY (id_mesero)    REFERENCES public.mesero    (id_mesero);
