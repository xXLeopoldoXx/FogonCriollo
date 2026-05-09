--
-- PostgreSQL database dump
--

\restrict JPmIUolDQkbQeJGgXudiK4kAiZzAfMvgk9dFGpH61nYCeNNygt1PceK4u7CqJey

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-05-08 20:59:52

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5000 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 875 (class 1247 OID 16982)
-- Name: estado_pedido; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_pedido AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'LISTO',
    'ENTREGADO'
);


ALTER TYPE public.estado_pedido OWNER TO postgres;

--
-- TOC entry 872 (class 1247 OID 16974)
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rol_usuario AS ENUM (
    'ADMIN',
    'MESERO',
    'COCINERO'
);


ALTER TYPE public.rol_usuario OWNER TO postgres;

--
-- TOC entry 251 (class 1255 OID 17162)
-- Name: fn_cambiar_estado_pedido(integer, public.estado_pedido, character varying, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_cambiar_estado_pedido(p_id_pedido integer, p_nuevo_estado public.estado_pedido, p_usuario character varying, p_ip character varying DEFAULT NULL::character varying, p_observacion text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_estado_actual estado_pedido;
BEGIN
    SELECT estado INTO v_estado_actual
    FROM public.pedido
    WHERE id_pedido = p_id_pedido
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido % no existe', p_id_pedido;
    END IF;

    IF v_estado_actual = 'ENTREGADO'::estado_pedido THEN
        RAISE EXCEPTION 'No se puede modificar un pedido ENTREGADO';
    END IF;

    IF v_estado_actual = 'LISTO'::estado_pedido
       AND p_nuevo_estado <> 'ENTREGADO'::estado_pedido THEN
        RAISE EXCEPTION 'Pedido LISTO solo puede pasar a ENTREGADO';
    END IF;

    UPDATE public.pedido
    SET estado = p_nuevo_estado
    WHERE id_pedido = p_id_pedido;

    INSERT INTO public.auditoria_pedido
        (id_pedido, estado_anterior, estado_nuevo, cambiado_por, ip_origen, observacion)
    VALUES
        (p_id_pedido, v_estado_actual, p_nuevo_estado, p_usuario, p_ip, p_observacion);
END;
$$;


ALTER FUNCTION public.fn_cambiar_estado_pedido(p_id_pedido integer, p_nuevo_estado public.estado_pedido, p_usuario character varying, p_ip character varying, p_observacion text) OWNER TO postgres;

--
-- TOC entry 5001 (class 0 OID 0)
-- Dependencies: 251
-- Name: FUNCTION fn_cambiar_estado_pedido(p_id_pedido integer, p_nuevo_estado public.estado_pedido, p_usuario character varying, p_ip character varying, p_observacion text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.fn_cambiar_estado_pedido(p_id_pedido integer, p_nuevo_estado public.estado_pedido, p_usuario character varying, p_ip character varying, p_observacion text) IS 'Cambia estado validando flujo: PENDIENTE→EN_PROCESO→LISTO→ENTREGADO. Registra auditoría.';


--
-- TOC entry 250 (class 1255 OID 17161)
-- Name: fn_crear_pedido(integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_crear_pedido(p_id_mesa integer, p_id_mesero integer, p_items jsonb) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_pedido INTEGER;
    v_item      JSONB;
    v_precio    NUMERIC(8,2);
BEGIN
    INSERT INTO public.pedido (id_mesa, id_mesero)
    VALUES (p_id_mesa, p_id_mesero)
    RETURNING id_pedido INTO v_id_pedido;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT precio INTO v_precio
        FROM public.producto
        WHERE id_producto = (v_item->>'id_producto')::INTEGER
          AND disponible = TRUE;

        IF v_precio IS NULL THEN
            RAISE EXCEPTION 'Producto % no disponible o no existe',
                            v_item->>'id_producto';
        END IF;

        INSERT INTO public.detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
        VALUES (
            v_id_pedido,
            (v_item->>'id_producto')::INTEGER,
            (v_item->>'cantidad')::INTEGER,
            v_precio
        );
    END LOOP;

    RETURN v_id_pedido;
END;
$$;


ALTER FUNCTION public.fn_crear_pedido(p_id_mesa integer, p_id_mesero integer, p_items jsonb) OWNER TO postgres;

--
-- TOC entry 5002 (class 0 OID 0)
-- Dependencies: 250
-- Name: FUNCTION fn_crear_pedido(p_id_mesa integer, p_id_mesero integer, p_items jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.fn_crear_pedido(p_id_mesa integer, p_id_mesero integer, p_items jsonb) IS 'Crea pedido y detalles atómicamente. Items como JSON array [{id_producto, cantidad}].';


--
-- TOC entry 252 (class 1255 OID 17163)
-- Name: fn_reporte_ventas(timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_reporte_ventas(p_desde timestamp without time zone, p_hasta timestamp without time zone) RETURNS TABLE(fecha date, total_pedidos bigint, total_ingresos numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(p.fecha_hora),
        COUNT(DISTINCT p.id_pedido),
        COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)
    FROM public.pedido p
    JOIN public.detalle_pedido dp ON dp.id_pedido = p.id_pedido
    WHERE p.estado = 'ENTREGADO'::estado_pedido
      AND p.fecha_hora BETWEEN p_desde AND p_hasta
    GROUP BY DATE(p.fecha_hora)
    ORDER BY DATE(p.fecha_hora);
END;
$$;


ALTER FUNCTION public.fn_reporte_ventas(p_desde timestamp without time zone, p_hasta timestamp without time zone) OWNER TO postgres;

--
-- TOC entry 5003 (class 0 OID 0)
-- Dependencies: 252
-- Name: FUNCTION fn_reporte_ventas(p_desde timestamp without time zone, p_hasta timestamp without time zone); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.fn_reporte_ventas(p_desde timestamp without time zone, p_hasta timestamp without time zone) IS 'Ventas por día en rango de fechas. Solo pedidos ENTREGADO.';


--
-- TOC entry 253 (class 1255 OID 17164)
-- Name: fn_top_productos(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_top_productos(p_limite integer DEFAULT 10) RETURNS TABLE(id_producto integer, nombre character varying, veces_pedido bigint, total_vendido numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id_producto,
        pr.nombre,
        SUM(dp.cantidad)::BIGINT,
        COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)
    FROM public.detalle_pedido dp
    JOIN public.pedido   p  ON p.id_pedido    = dp.id_pedido
    JOIN public.producto pr ON pr.id_producto = dp.id_producto
    WHERE p.estado = 'ENTREGADO'::estado_pedido
    GROUP BY pr.id_producto, pr.nombre
    ORDER BY 3 DESC
    LIMIT p_limite;
END;
$$;


ALTER FUNCTION public.fn_top_productos(p_limite integer) OWNER TO postgres;

--
-- TOC entry 5004 (class 0 OID 0)
-- Dependencies: 253
-- Name: FUNCTION fn_top_productos(p_limite integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.fn_top_productos(p_limite integer) IS 'Productos más vendidos. Solo pedidos ENTREGADO.';


--
-- TOC entry 254 (class 1255 OID 17185)
-- Name: trg_fn_auditoria_pedido(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_auditoria_pedido() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO public.auditoria_pedido
            (id_pedido, estado_anterior, estado_nuevo, cambiado_por)
        VALUES
            (NEW.id_pedido, OLD.estado, NEW.estado, current_user);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_fn_auditoria_pedido() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 232 (class 1259 OID 17127)
-- Name: auditoria_pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria_pedido (
    id_auditoria integer NOT NULL,
    id_pedido integer NOT NULL,
    estado_anterior public.estado_pedido,
    estado_nuevo public.estado_pedido NOT NULL,
    cambiado_por character varying(80),
    fecha_cambio timestamp without time zone DEFAULT now() NOT NULL,
    ip_origen character varying(45),
    observacion text
);


ALTER TABLE public.auditoria_pedido OWNER TO postgres;

--
-- TOC entry 5005 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE auditoria_pedido; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.auditoria_pedido IS 'Historial de cambios de estado por pedido (trazabilidad completa).';


--
-- TOC entry 231 (class 1259 OID 17126)
-- Name: auditoria_pedido_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditoria_pedido_id_auditoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditoria_pedido_id_auditoria_seq OWNER TO postgres;

--
-- TOC entry 5006 (class 0 OID 0)
-- Dependencies: 231
-- Name: auditoria_pedido_id_auditoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditoria_pedido_id_auditoria_seq OWNED BY public.auditoria_pedido.id_auditoria;


--
-- TOC entry 224 (class 1259 OID 17027)
-- Name: categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoria (
    id_categoria integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


ALTER TABLE public.categoria OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17026)
-- Name: categoria_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categoria_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categoria_id_categoria_seq OWNER TO postgres;

--
-- TOC entry 5007 (class 0 OID 0)
-- Dependencies: 223
-- Name: categoria_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categoria_id_categoria_seq OWNED BY public.categoria.id_categoria;


--
-- TOC entry 230 (class 1259 OID 17067)
-- Name: detalle_pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_pedido (
    id_detalle integer NOT NULL,
    id_pedido integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(8,2) NOT NULL,
    CONSTRAINT detalle_pedido_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT detalle_pedido_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


ALTER TABLE public.detalle_pedido OWNER TO postgres;

--
-- TOC entry 5008 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE detalle_pedido; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.detalle_pedido IS 'Líneas de detalle: producto, cantidad y precio al momento del pedido.';


--
-- TOC entry 229 (class 1259 OID 17066)
-- Name: detalle_pedido_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_pedido_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_pedido_id_detalle_seq OWNER TO postgres;

--
-- TOC entry 5009 (class 0 OID 0)
-- Dependencies: 229
-- Name: detalle_pedido_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_pedido_id_detalle_seq OWNED BY public.detalle_pedido.id_detalle;


--
-- TOC entry 234 (class 1259 OID 17137)
-- Name: log_sistema; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_sistema (
    id_log integer NOT NULL,
    username character varying(80),
    accion character varying(100) NOT NULL,
    detalle text,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    ip_origen character varying(45),
    exitoso boolean DEFAULT true NOT NULL
);


ALTER TABLE public.log_sistema OWNER TO postgres;

--
-- TOC entry 5010 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE log_sistema; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.log_sistema IS 'Log de acciones del sistema: logins, errores, operaciones críticas.';


--
-- TOC entry 233 (class 1259 OID 17136)
-- Name: log_sistema_id_log_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.log_sistema_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.log_sistema_id_log_seq OWNER TO postgres;

--
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 233
-- Name: log_sistema_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.log_sistema_id_log_seq OWNED BY public.log_sistema.id_log;


--
-- TOC entry 222 (class 1259 OID 17016)
-- Name: mesa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mesa (
    id_mesa integer NOT NULL,
    numero integer NOT NULL,
    piso integer NOT NULL,
    capacidad integer NOT NULL,
    CONSTRAINT mesa_capacidad_check CHECK ((capacidad > 0)),
    CONSTRAINT mesa_piso_check CHECK (((piso >= 1) AND (piso <= 3)))
);


ALTER TABLE public.mesa OWNER TO postgres;

--
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN mesa.piso; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mesa.piso IS 'Piso del local (1, 2 o 3). El Fogón Criollo opera en 3 niveles.';


--
-- TOC entry 221 (class 1259 OID 17015)
-- Name: mesa_id_mesa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mesa_id_mesa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mesa_id_mesa_seq OWNER TO postgres;

--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 221
-- Name: mesa_id_mesa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mesa_id_mesa_seq OWNED BY public.mesa.id_mesa;


--
-- TOC entry 218 (class 1259 OID 16992)
-- Name: mesero; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mesero (
    id_mesero integer NOT NULL,
    nombre character varying(150) NOT NULL,
    turno character varying(50)
);


ALTER TABLE public.mesero OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16991)
-- Name: mesero_id_mesero_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mesero_id_mesero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mesero_id_mesero_seq OWNER TO postgres;

--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 217
-- Name: mesero_id_mesero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mesero_id_mesero_seq OWNED BY public.mesero.id_mesero;


--
-- TOC entry 228 (class 1259 OID 17048)
-- Name: pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pedido (
    id_pedido integer NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    estado public.estado_pedido DEFAULT 'PENDIENTE'::public.estado_pedido NOT NULL,
    id_mesa integer NOT NULL,
    id_mesero integer NOT NULL
);


ALTER TABLE public.pedido OWNER TO postgres;

--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE pedido; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pedido IS 'Cabecera del pedido. Relaciona mesa, mesero y estado actual.';


--
-- TOC entry 227 (class 1259 OID 17047)
-- Name: pedido_id_pedido_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pedido_id_pedido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pedido_id_pedido_seq OWNER TO postgres;

--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 227
-- Name: pedido_id_pedido_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pedido_id_pedido_seq OWNED BY public.pedido.id_pedido;


--
-- TOC entry 226 (class 1259 OID 17034)
-- Name: producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.producto (
    id_producto integer NOT NULL,
    nombre character varying(150) NOT NULL,
    precio numeric(8,2) NOT NULL,
    disponible boolean DEFAULT true NOT NULL,
    id_categoria integer NOT NULL,
    CONSTRAINT producto_precio_check CHECK ((precio >= (0)::numeric))
);


ALTER TABLE public.producto OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17033)
-- Name: producto_id_producto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.producto_id_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.producto_id_producto_seq OWNER TO postgres;

--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 225
-- Name: producto_id_producto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.producto_id_producto_seq OWNED BY public.producto.id_producto;


--
-- TOC entry 220 (class 1259 OID 16999)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    username character varying(80) NOT NULL,
    password character varying(255) NOT NULL,
    rol public.rol_usuario DEFAULT 'MESERO'::public.rol_usuario NOT NULL,
    id_mesero integer NOT NULL
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16998)
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- TOC entry 5018 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- TOC entry 238 (class 1259 OID 17180)
-- Name: v_auditoria_pedidos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_auditoria_pedidos AS
 SELECT a.id_auditoria,
    a.id_pedido,
    m.numero AS mesa,
    a.estado_anterior,
    a.estado_nuevo,
    a.cambiado_por,
    a.fecha_cambio,
    a.ip_origen,
    a.observacion
   FROM ((public.auditoria_pedido a
     JOIN public.pedido p ON ((p.id_pedido = a.id_pedido)))
     JOIN public.mesa m ON ((m.id_mesa = p.id_mesa)))
  ORDER BY a.fecha_cambio DESC;


ALTER VIEW public.v_auditoria_pedidos OWNER TO postgres;

--
-- TOC entry 5019 (class 0 OID 0)
-- Dependencies: 238
-- Name: VIEW v_auditoria_pedidos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_auditoria_pedidos IS 'Historial legible de cambios de estado con datos de mesa.';


--
-- TOC entry 235 (class 1259 OID 17165)
-- Name: v_cocina_pedidos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_cocina_pedidos AS
SELECT
    NULL::integer AS id_pedido,
    NULL::timestamp without time zone AS fecha_hora,
    NULL::integer AS minutos_espera,
    NULL::public.estado_pedido AS estado,
    NULL::integer AS numero_mesa,
    NULL::integer AS piso,
    NULL::character varying(150) AS mesero,
    NULL::jsonb AS items;


ALTER VIEW public.v_cocina_pedidos OWNER TO postgres;

--
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 235
-- Name: VIEW v_cocina_pedidos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_cocina_pedidos IS 'Pedidos activos (PENDIENTE, EN_PROCESO) para pantalla de cocina.';


--
-- TOC entry 236 (class 1259 OID 17170)
-- Name: v_mesero_pedidos; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_mesero_pedidos AS
SELECT
    NULL::integer AS id_pedido,
    NULL::timestamp without time zone AS fecha_hora,
    NULL::public.estado_pedido AS estado,
    NULL::integer AS numero_mesa,
    NULL::integer AS piso,
    NULL::character varying(150) AS mesero,
    NULL::numeric AS total;


ALTER VIEW public.v_mesero_pedidos OWNER TO postgres;

--
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 236
-- Name: VIEW v_mesero_pedidos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_mesero_pedidos IS 'Pedidos no entregados para panel del mesero.';


--
-- TOC entry 237 (class 1259 OID 17175)
-- Name: v_resumen_hoy; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_resumen_hoy AS
 SELECT count(DISTINCT p.id_pedido) FILTER (WHERE (p.estado = 'PENDIENTE'::public.estado_pedido)) AS pedidos_pendientes,
    count(DISTINCT p.id_pedido) FILTER (WHERE (p.estado = 'EN_PROCESO'::public.estado_pedido)) AS pedidos_en_proceso,
    count(DISTINCT p.id_pedido) FILTER (WHERE (p.estado = 'LISTO'::public.estado_pedido)) AS pedidos_listos,
    count(DISTINCT p.id_pedido) FILTER (WHERE (p.estado = 'ENTREGADO'::public.estado_pedido)) AS pedidos_entregados,
    COALESCE(sum(((dp.cantidad)::numeric * dp.precio_unitario)) FILTER (WHERE (p.estado = 'ENTREGADO'::public.estado_pedido)), (0)::numeric) AS ingresos_hoy
   FROM (public.pedido p
     LEFT JOIN public.detalle_pedido dp ON ((dp.id_pedido = p.id_pedido)))
  WHERE (date(p.fecha_hora) = CURRENT_DATE);


ALTER VIEW public.v_resumen_hoy OWNER TO postgres;

--
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 237
-- Name: VIEW v_resumen_hoy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_resumen_hoy IS 'Dashboard del administrador: conteos e ingresos del día actual.';


--
-- TOC entry 4773 (class 2604 OID 17130)
-- Name: auditoria_pedido id_auditoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_pedido ALTER COLUMN id_auditoria SET DEFAULT nextval('public.auditoria_pedido_id_auditoria_seq'::regclass);


--
-- TOC entry 4766 (class 2604 OID 17030)
-- Name: categoria id_categoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria ALTER COLUMN id_categoria SET DEFAULT nextval('public.categoria_id_categoria_seq'::regclass);


--
-- TOC entry 4772 (class 2604 OID 17070)
-- Name: detalle_pedido id_detalle; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido ALTER COLUMN id_detalle SET DEFAULT nextval('public.detalle_pedido_id_detalle_seq'::regclass);


--
-- TOC entry 4775 (class 2604 OID 17140)
-- Name: log_sistema id_log; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_sistema ALTER COLUMN id_log SET DEFAULT nextval('public.log_sistema_id_log_seq'::regclass);


--
-- TOC entry 4765 (class 2604 OID 17019)
-- Name: mesa id_mesa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa ALTER COLUMN id_mesa SET DEFAULT nextval('public.mesa_id_mesa_seq'::regclass);


--
-- TOC entry 4762 (class 2604 OID 16995)
-- Name: mesero id_mesero; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesero ALTER COLUMN id_mesero SET DEFAULT nextval('public.mesero_id_mesero_seq'::regclass);


--
-- TOC entry 4769 (class 2604 OID 17051)
-- Name: pedido id_pedido; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido ALTER COLUMN id_pedido SET DEFAULT nextval('public.pedido_id_pedido_seq'::regclass);


--
-- TOC entry 4767 (class 2604 OID 17037)
-- Name: producto id_producto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto ALTER COLUMN id_producto SET DEFAULT nextval('public.producto_id_producto_seq'::regclass);


--
-- TOC entry 4763 (class 2604 OID 17002)
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- TOC entry 4992 (class 0 OID 17127)
-- Dependencies: 232
-- Data for Name: auditoria_pedido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditoria_pedido (id_auditoria, id_pedido, estado_anterior, estado_nuevo, cambiado_por, fecha_cambio, ip_origen, observacion) FROM stdin;
1	2	PENDIENTE	EN_PROCESO	postgres	2026-05-08 19:26:17.682024	\N	\N
2	2	PENDIENTE	EN_PROCESO	cocina1	2026-05-08 19:26:17.682024	\N	\N
3	2	EN_PROCESO	LISTO	postgres	2026-05-08 19:26:19.680215	\N	\N
4	2	EN_PROCESO	LISTO	cocina1	2026-05-08 19:26:19.680215	\N	\N
5	3	PENDIENTE	EN_PROCESO	postgres	2026-05-08 19:57:13.221063	\N	\N
6	3	PENDIENTE	EN_PROCESO	cocina1	2026-05-08 19:57:13.221063	\N	\N
7	3	EN_PROCESO	LISTO	postgres	2026-05-08 19:57:18.143477	\N	\N
8	3	EN_PROCESO	LISTO	cocina1	2026-05-08 19:57:18.143477	\N	\N
\.


--
-- TOC entry 4984 (class 0 OID 17027)
-- Dependencies: 224
-- Data for Name: categoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categoria (id_categoria, nombre, descripcion) FROM stdin;
13	Pollos	Pollos a la brasa y leña
14	Bebidas	Bebidas frías y calientes
15	Guarniciones	Ensaladas, papas y extras
16	Postres	Postres y dulces
\.


--
-- TOC entry 4990 (class 0 OID 17067)
-- Dependencies: 230
-- Data for Name: detalle_pedido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_pedido (id_detalle, id_pedido, id_producto, cantidad, precio_unitario) FROM stdin;
1	2	86	1	3.00
2	2	85	1	8.00
3	3	86	1	3.00
4	3	72	1	8.00
\.


--
-- TOC entry 4994 (class 0 OID 17137)
-- Dependencies: 234
-- Data for Name: log_sistema; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.log_sistema (id_log, username, accion, detalle, fecha_hora, ip_origen, exitoso) FROM stdin;
1	admin	LOGIN	Login exitoso desde rol ADMINISTRADOR	2026-05-08 19:12:27.033569	\N	t
2	admin	LOGOUT	\N	2026-05-08 19:12:36.105589	\N	t
3	cocina1	LOGIN	Login exitoso desde rol COCINA	2026-05-08 19:15:06.410601	\N	t
4	cocina1	LOGOUT	\N	2026-05-08 19:15:08.290778	\N	t
5	mesero1	LOGIN	Login exitoso desde rol MESERO	2026-05-08 19:15:49.038177	\N	t
6	mesero1	LOGOUT	\N	2026-05-08 19:15:56.721434	\N	t
7	mesero1	LOGIN	Login exitoso desde rol MESERO	2026-05-08 19:16:33.573138	\N	t
8	cocina1	LOGIN	Login exitoso desde rol COCINA	2026-05-08 19:22:36.253888	\N	t
9	mesero1	LOGIN	Login exitoso desde rol MESERO	2026-05-08 19:26:00.087517	\N	t
10	cocina1	LOGIN	Login exitoso desde rol COCINA	2026-05-08 19:26:15.582731	\N	t
11	cocina1	LOGOUT	\N	2026-05-08 19:26:34.933597	\N	t
12	admin	LOGIN	Login exitoso desde rol ADMINISTRADOR	2026-05-08 19:26:39.260884	\N	t
13	admin	LOGOUT	\N	2026-05-08 19:50:33.240669	\N	t
14	mesero1	LOGIN	Login exitoso desde rol ADMIN	2026-05-08 19:51:51.418047	\N	t
15	mesero1	LOGOUT	\N	2026-05-08 19:51:52.988995	\N	t
16	cocina1	LOGIN	Login exitoso desde rol ADMIN	2026-05-08 19:52:11.478048	\N	t
17	cocina1	LOGOUT	\N	2026-05-08 19:52:12.858266	\N	t
18	mesero1	LOGIN	Login exitoso desde rol ADMIN	2026-05-08 19:54:29.179408	\N	t
19	cocina1	LOGIN	Login exitoso desde rol COCINA	2026-05-08 19:56:08.569119	\N	t
20	mesero1	LOGIN	Login exitoso desde rol MESERO	2026-05-08 19:56:23.766917	\N	t
21	mesero1	LOGOUT	\N	2026-05-08 19:57:32.103735	\N	t
22	admin	LOGIN	Login exitoso desde rol ADMINISTRADOR	2026-05-08 19:57:40.447302	\N	t
23	admin	LOGOUT	\N	2026-05-08 20:01:02.880014	\N	t
\.


--
-- TOC entry 4982 (class 0 OID 17016)
-- Dependencies: 222
-- Data for Name: mesa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mesa (id_mesa, numero, piso, capacidad) FROM stdin;
46	1	1	4
47	2	1	4
48	3	1	6
49	4	1	4
50	5	1	2
51	6	2	4
52	7	2	4
53	8	2	6
54	9	2	8
55	10	2	4
56	11	3	4
57	12	3	6
58	13	3	8
59	14	3	4
60	15	3	4
\.


--
-- TOC entry 4978 (class 0 OID 16992)
-- Dependencies: 218
-- Data for Name: mesero; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mesero (id_mesero, nombre, turno) FROM stdin;
19	Leslie Barreto	Mañana
20	Leopoldo Brito	Tarde
21	Brisa Capcha	Mañana
22	Nelsy Ramos	Tarde
23	Joseph Silvano	Noche
24	Admin Sistema	Completo
\.


--
-- TOC entry 4988 (class 0 OID 17048)
-- Dependencies: 228
-- Data for Name: pedido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pedido (id_pedido, fecha_hora, estado, id_mesa, id_mesero) FROM stdin;
2	2026-05-08 19:26:04.743811	LISTO	47	19
3	2026-05-08 19:56:42.156102	LISTO	47	19
\.


--
-- TOC entry 4986 (class 0 OID 17034)
-- Dependencies: 226
-- Data for Name: producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.producto (id_producto, nombre, precio, disponible, id_categoria) FROM stdin;
66	Pollo entero a la brasa	45.00	t	13
67	Medio pollo a la brasa	24.00	t	13
68	Cuarto de pollo	13.00	t	13
69	Pollo a la leña especial	28.00	t	13
70	Inca Kola 500ml	4.00	t	14
71	Coca Cola 500ml	4.00	t	14
72	Chicha morada 1L	8.00	t	14
73	Agua mineral	3.00	t	14
74	Papas fritas grandes	8.00	t	15
75	Ensalada criolla	5.00	t	15
76	Yucas fritas	7.00	t	15
77	Suspiro limeño	8.00	t	16
78	Mazamorra morada	6.00	t	16
79	Pollo entero a la brasa	45.00	t	13
80	Medio pollo a la brasa	24.00	t	13
81	Cuarto de pollo	13.00	t	13
82	Pollo a la leña especial	28.00	t	13
83	Inca Kola 500ml	4.00	t	14
84	Coca Cola 500ml	4.00	t	14
85	Chicha morada 1L	8.00	t	14
86	Agua mineral	3.00	t	14
87	Papas fritas grandes	8.00	t	15
88	Ensalada criolla	5.00	t	15
89	Yucas fritas	7.00	t	15
90	Suspiro limeño	8.00	t	16
91	Mazamorra morada	6.00	t	16
\.


--
-- TOC entry 4980 (class 0 OID 16999)
-- Dependencies: 220
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id_usuario, username, password, rol, id_mesero) FROM stdin;
8	admin	$2a$10$fSe9KZKkArxXu.QGqY29/e6mjNhWSd6LxDEspc9a67kPhZ9vGehwC	ADMIN	24
7	cocina1	$2a$10$ced2SO2V824e88KuDTQ16OXVhsruXpWFgzgo2LGVilwYPuXTZmWtq	COCINERO	21
5	mesero1	$2a$10$ftKxi8WsDDlxFriEORpP.O50HqFJSRuIZC8JyCm7u0cfe3bbb6M12	MESERO	19
6	mesero2	$2a$10$ftKxi8WsDDlxFriEORpP.O50HqFJSRuIZC8JyCm7u0cfe3bbb6M12	MESERO	20
\.


--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 231
-- Name: auditoria_pedido_id_auditoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_pedido_id_auditoria_seq', 8, true);


--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 223
-- Name: categoria_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categoria_id_categoria_seq', 16, true);


--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 229
-- Name: detalle_pedido_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_pedido_id_detalle_seq', 4, true);


--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 233
-- Name: log_sistema_id_log_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.log_sistema_id_log_seq', 23, true);


--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 221
-- Name: mesa_id_mesa_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mesa_id_mesa_seq', 60, true);


--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 217
-- Name: mesero_id_mesero_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mesero_id_mesero_seq', 24, true);


--
-- TOC entry 5029 (class 0 OID 0)
-- Dependencies: 227
-- Name: pedido_id_pedido_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pedido_id_pedido_seq', 3, true);


--
-- TOC entry 5030 (class 0 OID 0)
-- Dependencies: 225
-- Name: producto_id_producto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.producto_id_producto_seq', 91, true);


--
-- TOC entry 5031 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 8, true);


--
-- TOC entry 4815 (class 2606 OID 17135)
-- Name: auditoria_pedido auditoria_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_pedido
    ADD CONSTRAINT auditoria_pedido_pkey PRIMARY KEY (id_auditoria);


--
-- TOC entry 4798 (class 2606 OID 17032)
-- Name: categoria categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_pkey PRIMARY KEY (id_categoria);


--
-- TOC entry 4811 (class 2606 OID 17074)
-- Name: detalle_pedido detalle_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id_detalle);


--
-- TOC entry 4820 (class 2606 OID 17146)
-- Name: log_sistema log_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_sistema
    ADD CONSTRAINT log_sistema_pkey PRIMARY KEY (id_log);


--
-- TOC entry 4794 (class 2606 OID 17025)
-- Name: mesa mesa_numero_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa
    ADD CONSTRAINT mesa_numero_key UNIQUE (numero);


--
-- TOC entry 4796 (class 2606 OID 17023)
-- Name: mesa mesa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesa
    ADD CONSTRAINT mesa_pkey PRIMARY KEY (id_mesa);


--
-- TOC entry 4784 (class 2606 OID 16997)
-- Name: mesero mesero_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mesero
    ADD CONSTRAINT mesero_pkey PRIMARY KEY (id_mesero);


--
-- TOC entry 4809 (class 2606 OID 17055)
-- Name: pedido pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT pedido_pkey PRIMARY KEY (id_pedido);


--
-- TOC entry 4802 (class 2606 OID 17041)
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (id_producto);


--
-- TOC entry 4787 (class 2606 OID 17009)
-- Name: usuario usuario_id_mesero_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_mesero_key UNIQUE (id_mesero);


--
-- TOC entry 4789 (class 2606 OID 17005)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 4791 (class 2606 OID 17007)
-- Name: usuario usuario_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_username_key UNIQUE (username);


--
-- TOC entry 4816 (class 1259 OID 17158)
-- Name: idx_auditoria_pedido; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_pedido ON public.auditoria_pedido USING btree (id_pedido, fecha_cambio DESC);


--
-- TOC entry 4812 (class 1259 OID 17152)
-- Name: idx_detalle_pedido; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_pedido ON public.detalle_pedido USING btree (id_pedido);


--
-- TOC entry 4813 (class 1259 OID 17153)
-- Name: idx_detalle_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_producto ON public.detalle_pedido USING btree (id_producto);


--
-- TOC entry 4817 (class 1259 OID 17160)
-- Name: idx_log_accion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_log_accion ON public.log_sistema USING btree (accion, fecha_hora DESC);


--
-- TOC entry 4818 (class 1259 OID 17159)
-- Name: idx_log_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_log_username ON public.log_sistema USING btree (username, fecha_hora DESC);


--
-- TOC entry 4792 (class 1259 OID 17156)
-- Name: idx_mesa_piso; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mesa_piso ON public.mesa USING btree (piso);


--
-- TOC entry 4803 (class 1259 OID 17147)
-- Name: idx_pedido_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_estado ON public.pedido USING btree (estado);


--
-- TOC entry 4804 (class 1259 OID 17151)
-- Name: idx_pedido_estado_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_estado_fecha ON public.pedido USING btree (estado, fecha_hora DESC);


--
-- TOC entry 4805 (class 1259 OID 17150)
-- Name: idx_pedido_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_fecha ON public.pedido USING btree (fecha_hora DESC);


--
-- TOC entry 4806 (class 1259 OID 17148)
-- Name: idx_pedido_mesa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_mesa ON public.pedido USING btree (id_mesa);


--
-- TOC entry 4807 (class 1259 OID 17149)
-- Name: idx_pedido_mesero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_mesero ON public.pedido USING btree (id_mesero);


--
-- TOC entry 4799 (class 1259 OID 17155)
-- Name: idx_producto_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_categoria ON public.producto USING btree (id_categoria);


--
-- TOC entry 4800 (class 1259 OID 17154)
-- Name: idx_producto_disponible; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_disponible ON public.producto USING btree (disponible) WHERE (disponible = true);


--
-- TOC entry 4785 (class 1259 OID 17157)
-- Name: idx_usuario_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_rol ON public.usuario USING btree (rol);


--
-- TOC entry 4973 (class 2618 OID 17168)
-- Name: v_cocina_pedidos _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.v_cocina_pedidos AS
 SELECT p.id_pedido,
    p.fecha_hora,
    ((EXTRACT(epoch FROM (now() - (p.fecha_hora)::timestamp with time zone)))::integer / 60) AS minutos_espera,
    p.estado,
    m.numero AS numero_mesa,
    m.piso,
    me.nombre AS mesero,
    jsonb_agg(jsonb_build_object('producto', pr.nombre, 'cantidad', dp.cantidad) ORDER BY pr.nombre) AS items
   FROM ((((public.pedido p
     JOIN public.mesa m ON ((m.id_mesa = p.id_mesa)))
     JOIN public.mesero me ON ((me.id_mesero = p.id_mesero)))
     JOIN public.detalle_pedido dp ON ((dp.id_pedido = p.id_pedido)))
     JOIN public.producto pr ON ((pr.id_producto = dp.id_producto)))
  WHERE (p.estado = ANY (ARRAY['PENDIENTE'::public.estado_pedido, 'EN_PROCESO'::public.estado_pedido]))
  GROUP BY p.id_pedido, m.numero, m.piso, me.nombre
  ORDER BY p.fecha_hora;


--
-- TOC entry 4974 (class 2618 OID 17173)
-- Name: v_mesero_pedidos _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.v_mesero_pedidos AS
 SELECT p.id_pedido,
    p.fecha_hora,
    p.estado,
    m.numero AS numero_mesa,
    m.piso,
    me.nombre AS mesero,
    sum(((dp.cantidad)::numeric * dp.precio_unitario)) AS total
   FROM (((public.pedido p
     JOIN public.mesa m ON ((m.id_mesa = p.id_mesa)))
     JOIN public.mesero me ON ((me.id_mesero = p.id_mesero)))
     JOIN public.detalle_pedido dp ON ((dp.id_pedido = p.id_pedido)))
  WHERE (p.estado <> 'ENTREGADO'::public.estado_pedido)
  GROUP BY p.id_pedido, m.numero, m.piso, me.nombre
  ORDER BY p.fecha_hora DESC;


--
-- TOC entry 4827 (class 2620 OID 17186)
-- Name: pedido trg_auditoria_pedido; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auditoria_pedido AFTER UPDATE OF estado ON public.pedido FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auditoria_pedido();


--
-- TOC entry 4825 (class 2606 OID 17075)
-- Name: detalle_pedido fk_detalle_pedido; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido) REFERENCES public.pedido(id_pedido) ON DELETE CASCADE;


--
-- TOC entry 4826 (class 2606 OID 17080)
-- Name: detalle_pedido fk_detalle_producto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto);


--
-- TOC entry 4823 (class 2606 OID 17056)
-- Name: pedido fk_pedido_mesa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT fk_pedido_mesa FOREIGN KEY (id_mesa) REFERENCES public.mesa(id_mesa);


--
-- TOC entry 4824 (class 2606 OID 17061)
-- Name: pedido fk_pedido_mesero; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
    ADD CONSTRAINT fk_pedido_mesero FOREIGN KEY (id_mesero) REFERENCES public.mesero(id_mesero);


--
-- TOC entry 4822 (class 2606 OID 17042)
-- Name: producto fk_producto_categoria; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES public.categoria(id_categoria);


--
-- TOC entry 4821 (class 2606 OID 17010)
-- Name: usuario fk_usuario_mesero; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_mesero FOREIGN KEY (id_mesero) REFERENCES public.mesero(id_mesero);


-- Completed on 2026-05-08 20:59:52

--
-- PostgreSQL database dump complete
--

\unrestrict JPmIUolDQkbQeJGgXudiK4kAiZzAfMvgk9dFGpH61nYCeNNygt1PceK4u7CqJey

