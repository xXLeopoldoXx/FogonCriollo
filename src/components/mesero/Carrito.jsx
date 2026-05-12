
// Resumen del pedido y botón de envío

import { useState } from 'react';
import { Button }   from '../ui/Button';
import styles       from './Carrito.module.css';

/* Genera la URL de seguimiento del cliente */
function getClienteURL(idPedido) {
  return `${window.location.origin}/cliente/${idPedido}`;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ── Sub-componente: fila de ítem con nota ─────────────── */
function ItemRow({ item, onQuitar, onEliminar, onNotaChange }) {
  const [mostrarNota, setMostrarNota] = useState(false);

  return (
    <div className={styles.item}>
      <div className={styles.itemTop}>
        <div className={styles.itemInfo}>
          <span className={styles.itemNombre}>{item.nombre}</span>
          <span className={styles.itemPrecio}>
            S/ {(money(item.precio) * item.cantidad).toFixed(2)}
          </span>
        </div>
        <div className={styles.itemActions}>
          <button
            className={styles.quitarBtn}
            onClick={() => onQuitar(item.id_producto)}
            aria-label={`Quitar uno de ${item.nombre}`}
          >−</button>
          <span className={styles.itemCant}>{item.cantidad}</span>
          <button
            className={styles.eliminarBtn}
            onClick={() => onEliminar(item.id_producto)}
            aria-label={`Eliminar ${item.nombre}`}
          >×</button>
        </div>
      </div>

      {/* Toggle nota */}
      <button
        className={`${styles.notaToggle} ${item.nota ? styles.notaToggleActive : ''}`}
        onClick={() => setMostrarNota(v => !v)}
        aria-expanded={mostrarNota}
      >
        {item.nota ? `📝 ${item.nota}` : '+ Agregar nota'}
      </button>

      {mostrarNota && (
        <textarea
          className={styles.notaInput}
          placeholder="Ej: sin cebolla, término 3/4, extra salsa..."
          value={item.nota ?? ''}
          maxLength={100}
          rows={2}
          onChange={e => onNotaChange(item.id_producto, e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}

/* ── Componente principal ─────────────────────────────── */
export function Carrito({
  mesaActiva, carrito, total,
  onQuitar, onEliminar, onEnviar, enviando,
  onNotaChange,
  ultimoPedidoId,         // nuevo: id del último pedido enviado
}) {
  const [copiado, setCopiado] = useState(false);

  const canSend = carrito.length > 0 && !!mesaActiva;

  /* Copiar link del cliente al portapapeles */
  async function copiarLink() {
    if (!ultimoPedidoId) return;
    try {
      await navigator.clipboard.writeText(getClienteURL(ultimoPedidoId));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* fallback: abrir en nueva pestaña */
      window.open(getClienteURL(ultimoPedidoId), '_blank');
    }
  }

  return (
    <div className={styles.root}>

      {/* ── Header ──────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.title}>Pedido</span>
        {mesaActiva && (
          <span className={styles.mesaBadge}>
            Mesa {mesaActiva.numero} · P{mesaActiva.piso}
          </span>
        )}
      </div>

      {/* ── Link de seguimiento (después de enviar) ── */}
      {ultimoPedidoId && (
        <div className={styles.linkBox}>
          <span className={styles.linkLabel}>🔗 Enlace para el cliente</span>
          <div className={styles.linkRow}>
            <span className={styles.linkUrl}>/cliente/{ultimoPedidoId}</span>
            <button
              className={`${styles.copyBtn} ${copiado ? styles.copyBtnOk : ''}`}
              onClick={copiarLink}
            >
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <p className={styles.linkHint}>
            El cliente puede escanear o recibir este link para ver su pedido en tiempo real.
          </p>
        </div>
      )}

      {/* ── Items ─────────────────────────────── */}
      <div className={styles.items}>
        {carrito.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍽️</span>
            <p className={styles.empty}>Selecciona productos del menú</p>
          </div>
        ) : (
          carrito.map(item => (
            <ItemRow
              key={item.id_producto}
              item={item}
              onQuitar={onQuitar}
              onEliminar={onEliminar}
              onNotaChange={onNotaChange}
            />
          ))
        )}
      </div>

      {/* ── Total ─────────────────────────────── */}
      {carrito.length > 0 && (
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>
            Total · {carrito.reduce((a, i) => a + i.cantidad, 0)} ítem(s)
          </span>
          <span className={styles.totalValue}>S/ {total.toFixed(2)}</span>
        </div>
      )}

      <div className={styles.divider} />

      {/* ── Validación / hints ─────────────────── */}
      {!mesaActiva && (
        <p className={styles.hint}>← Selecciona una mesa primero</p>
      )}
      {mesaActiva && carrito.length === 0 && (
        <p className={styles.hint}>← Agrega productos del menú</p>
      )}

      {/* ── CTA ───────────────────────────────── */}
      <Button
        onClick={onEnviar}
        loading={enviando}
        disabled={!canSend}
        className={canSend ? styles.btnReady : ''}
      >
        {enviando ? 'Enviando...' : 'Enviar a cocina 🔥'}
      </Button>

    </div>
  );
}
