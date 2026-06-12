// ============================================================
//  El Fogón Criollo — StepProductos.jsx
//  Paso 2: selección de productos con carrito flotante
// ============================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, ChevronRight } from 'lucide-react';
import styles from './StepProductos.module.css';

// ── Tarjeta de producto ───────────────────────────────────
function ProductCard({ producto, cantidad, onAgregar, onQuitar }) {
  const enCarrito = cantidad > 0;

  return (
    <motion.div
      className={`${styles.card} ${enCarrito ? styles.cardActive : ''}`}
      layout
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Imagen */}
      <div className={styles.imgWrap}>
        <img
          src={producto.imagen_url}
          alt={producto.nombre}
          loading="lazy"
          className={styles.img}
        />
        <AnimatePresence>
          {enCarrito && (
            <motion.div
              className={styles.imgBadge}
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            >
              {cantidad}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className={styles.cardBody}>
        <p className={styles.nombre}>{producto.nombre}</p>
        <p className={styles.precio}>S/ {producto.precio.toFixed(2)}</p>
      </div>

      {/* Controles */}
      <div className={styles.controles}>
        <AnimatePresence mode="wait">
          {enCarrito ? (
            <motion.div
              key="counter"
              className={styles.counter}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <motion.button
                className={styles.counterBtn}
                onClick={() => onQuitar(producto.id_producto)}
                whileTap={{ scale: 0.85 }}
                aria-label={`Quitar uno de ${producto.nombre}`}
              >
                <Minus size={13} />
              </motion.button>
              <motion.span
                key={cantidad}
                className={styles.counterNum}
                initial={{ scale: 1.5, color: '#F2A74B' }}
                animate={{ scale: 1, color: '#F5EDD8' }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {cantidad}
              </motion.span>
              <motion.button
                className={styles.counterBtn}
                onClick={() => onAgregar(producto)}
                whileTap={{ scale: 0.85 }}
                aria-label={`Agregar uno más de ${producto.nombre}`}
              >
                <Plus size={13} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="add"
              className={styles.addBtn}
              onClick={() => onAgregar(producto)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.93 }}
              aria-label={`Agregar ${producto.nombre} al pedido`}
            >
              <Plus size={14} />
              Agregar
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Componente principal ──────────────────────────────────
export function StepProductos({
  productosPorCategoria,
  carrito, onAgregar, onQuitar,
  onConfirmar, total, totalItems,
}) {
  const categorias = Object.keys(productosPorCategoria);
  const [catActiva, setCatActiva] = useState(categorias[0] ?? '');
  const [busqueda,  setBusqueda]  = useState('');

  // Productos filtrados por búsqueda global o categoría activa
  const productosFiltrados = useMemo(() => {
    if (busqueda.trim().length >= 2) {
      const q = busqueda.toLowerCase();
      return Object.values(productosPorCategoria)
        .flat()
        .filter(p => p.nombre.toLowerCase().includes(q));
    }
    return productosPorCategoria[catActiva] ?? [];
  }, [busqueda, catActiva, productosPorCategoria]);

  const getCantidad = (id) => carrito.find(i => i.id_producto === id)?.cantidad ?? 0;

  return (
    <div className={styles.root}>
      {/* ── Barra de búsqueda ──────────────────────────── */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar plato o bebida..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            aria-label="Buscar productos"
          />
          <AnimatePresence>
            {busqueda && (
              <motion.button
                className={styles.clearBtn}
                onClick={() => setBusqueda('')}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
              >
                ×
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tabs de categoría ──────────────────────────── */}
      {!busqueda && (
        <div className={styles.tabs} role="tablist">
          {categorias.map(cat => {
            const enCarrito = (productosPorCategoria[cat] ?? [])
              .reduce((s, p) => s + getCantidad(p.id_producto), 0);
            return (
              <motion.button
                key={cat}
                role="tab"
                aria-selected={catActiva === cat}
                className={`${styles.tab} ${catActiva === cat ? styles.tabActive : ''}`}
                onClick={() => setCatActiva(cat)}
                whileTap={{ scale: 0.94 }}
              >
                {cat}
                {enCarrito > 0 && (
                  <motion.span
                    className={styles.tabBadge}
                    key={enCarrito}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    {enCarrito}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Grid de productos ──────────────────────────── */}
      <div className={styles.grid} role="list">
        <AnimatePresence mode="popLayout">
          {productosFiltrados.length > 0 ? (
            productosFiltrados.map((prod, i) => (
              <motion.div
                key={prod.id_producto}
                role="listitem"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
              >
                <ProductCard
                  producto={prod}
                  cantidad={getCantidad(prod.id_producto)}
                  onAgregar={onAgregar}
                  onQuitar={onQuitar}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              className={styles.empty}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span>🔍</span>
              <p>No encontramos "{busqueda}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CTA flotante con resumen ────────────────────── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            className={styles.ctaBar}
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div className={styles.ctaLeft}>
              <motion.div
                className={styles.ctaCount}
                key={totalItems}
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 0.3 }}
              >
                {totalItems}
              </motion.div>
              <div>
                <p className={styles.ctaLabel}>
                  {totalItems === 1 ? '1 ítem' : `${totalItems} ítems`}
                </p>
                <p className={styles.ctaTotal}>S/ {total.toFixed(2)}</p>
              </div>
            </div>
            <motion.button
              className={styles.ctaBtn}
              onClick={onConfirmar}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <ShoppingCart size={16} />
              Confirmar pedido
              <ChevronRight size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
