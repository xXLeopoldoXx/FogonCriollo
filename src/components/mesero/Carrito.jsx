// ============================================================
// El Fogón Criollo – Carrito Component
// Resumen del pedido y botón de envío
// ============================================================

import { Button } from '../ui/Button';
import styles from './Carrito.module.css';

export function Carrito({ mesaActiva, carrito, total, onQuitar, onEliminar, onEnviar, enviando }) {
  return (
    <div className={styles.root}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Pedido</span>
        {mesaActiva && (
          <span className={styles.mesaBadge}>
            Mesa {mesaActiva.numero} · P{mesaActiva.piso}
          </span>
        )}
      </div>

      {/* Items */}
      <div className={styles.items}>
        {carrito.length === 0 ? (
          <p className={styles.empty}>Selecciona productos del menú</p>
        ) : (
          carrito.map(item => (
            <div key={item.id_producto} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.itemNombre}>{item.nombre}</span>
                <span className={styles.itemPrecio}>
                  S/ {(item.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button className={styles.quitarBtn} onClick={() => onQuitar(item.id_producto)}>−</button>
                <span className={styles.itemCant}>{item.cantidad}</span>
                <button
                  className={styles.eliminarBtn}
                  onClick={() => onEliminar(item.id_producto)}
                  aria-label={`Eliminar ${item.nombre}`}
                >×</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total */}
      {carrito.length > 0 && (
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalValue}>S/ {total.toFixed(2)}</span>
        </div>
      )}

      {/* Divider */}
      <div className={styles.divider} />

      {/* CTA */}
      <Button
        onClick={onEnviar}
        loading={enviando}
        disabled={carrito.length === 0 || !mesaActiva}
      >
        Enviar a cocina 🔥
      </Button>

      {(!mesaActiva || carrito.length === 0) && (
        <p className={styles.hint}>
          {!mesaActiva ? '← Selecciona una mesa' : '← Agrega productos'}
        </p>
      )}
    </div>
  );
}
