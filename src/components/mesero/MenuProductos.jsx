// ============================================================
// El Fogón Criollo – MenuProductos Component
// Catálogo de productos agrupados por categoría
// ============================================================

import { useState } from 'react';
import styles from './MenuProductos.module.css';

export function MenuProductos({ productosPorCategoria, carrito, onAgregar, onQuitar }) {
  const categorias = Object.keys(productosPorCategoria);
  const [catActiva, setCatActiva] = useState(categorias[0] ?? '');

  function cantidadEnCarrito(id_producto) {
    return carrito.find(i => i.id_producto === id_producto)?.cantidad ?? 0;
  }

  return (
    <div className={styles.root}>
      {/* Tabs de categoría */}
      <div className={styles.tabs}>
        {categorias.map(cat => (
          <button
            key={cat}
            className={`${styles.tab} ${catActiva === cat ? styles.tabActive : ''}`}
            onClick={() => setCatActiva(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      <div className={styles.grid}>
        {(productosPorCategoria[catActiva] ?? []).map(prod => {
          const cant = cantidadEnCarrito(prod.id_producto);
          return (
            <div key={prod.id_producto} className={`${styles.card} ${cant > 0 ? styles.inCart : ''}`}>
              <div className={styles.cardInfo}>
                <span className={styles.prodNombre}>{prod.nombre}</span>
                <span className={styles.prodPrecio}>S/ {Number(prod.precio).toFixed(2)}</span>
              </div>
              <div className={styles.counter}>
                {cant > 0 ? (
                  <>
                    <button className={styles.counterBtn} onClick={() => onQuitar(prod.id_producto)}>−</button>
                    <span className={styles.counterVal}>{cant}</span>
                    <button className={styles.counterBtn} onClick={() => onAgregar(prod)}>+</button>
                  </>
                ) : (
                  <button className={styles.addBtn} onClick={() => onAgregar(prod)}>+ Agregar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
