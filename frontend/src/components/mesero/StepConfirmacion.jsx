// ============================================================
//  El Fogón Criollo — StepConfirmacion.jsx
//  Paso 3: revisión final antes de enviar a cocina
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, MessageSquare, Trash2, ChevronLeft, Send } from 'lucide-react';
import styles from './StepConfirmacion.module.css';

function ItemConfirmacion({ item, onQuitar, onEliminar, onNotaChange }) {
  const [notaVisible, setNotaVisible] = useState(!!item.nota);

  return (
    <motion.div
      className={styles.item}
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {/* Imagen miniatura */}
      <div className={styles.itemImg}>
        <img src={item.imagen_url} alt={item.nombre} loading="lazy" />
      </div>

      {/* Info + controles */}
      <div className={styles.itemBody}>
        <div className={styles.itemTop}>
          <div className={styles.itemInfo}>
            <p className={styles.itemNombre}>{item.nombre}</p>
            <p className={styles.itemSubtotal}>
              S/ {(item.precio * item.cantidad).toFixed(2)}
              <span className={styles.itemUnitario}> · S/ {item.precio.toFixed(2)} c/u</span>
            </p>
          </div>
          <div className={styles.itemActions}>
            <button
              className={styles.quitarBtn}
              onClick={() => onQuitar(item.id_producto)}
              aria-label="Quitar uno"
            >−</button>
            <motion.span
              key={item.cantidad}
              className={styles.itemCant}
              animate={{ scale: [1.3, 1], color: ['#F2A74B', '#F5EDD8'] }}
              transition={{ duration: 0.25 }}
            >
              {item.cantidad}
            </motion.span>
            <button
              className={styles.eliminarBtn}
              onClick={() => onEliminar(item.id_producto)}
              aria-label="Eliminar del pedido"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Nota */}
        <button
          className={`${styles.notaToggle} ${item.nota ? styles.notaToggleActive : ''}`}
          onClick={() => setNotaVisible(v => !v)}
        >
          <MessageSquare size={11} />
          {item.nota || '+ Nota especial (sin sal, término...)'}
        </button>

        <AnimatePresence>
          {notaVisible && (
            <motion.textarea
              className={styles.notaInput}
              placeholder="Ej: sin cebolla, término 3/4, extra salsa..."
              value={item.nota ?? ''}
              maxLength={100}
              rows={2}
              onChange={e => onNotaChange(item.id_producto, e.target.value)}
              autoFocus
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function StepConfirmacion({
  mesa, carrito, total,
  onQuitar, onEliminar, onNotaChange,
  onEnviar, onVolver, enviando,
}) {
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className={styles.root}>
      {/* Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Confirmar pedido</h2>
          <p className={styles.subtitle}>
            Mesa {mesa?.numero} · Piso {mesa?.piso}
          </p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.resumenPill}>
            {totalItems} ítem{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>

      {/* Lista de ítems */}
      <div className={styles.lista}>
        <AnimatePresence mode="popLayout">
          {carrito.map((item, i) => (
            <ItemConfirmacion
              key={item.id_producto}
              item={item}
              onQuitar={onQuitar}
              onEliminar={onEliminar}
              onNotaChange={onNotaChange}
            />
          ))}
        </AnimatePresence>

        {carrito.length === 0 && (
          <motion.div
            className={styles.emptyCarrito}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>El carrito está vacío.</p>
            <button className={styles.volverBtn} onClick={onVolver}>
              <ChevronLeft size={14} /> Volver a la carta
            </button>
          </motion.div>
        )}
      </div>

      {/* Total + botón de envío */}
      {carrito.length > 0 && (
        <motion.div
          className={styles.footer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total del pedido</span>
            <motion.span
              key={total}
              className={styles.totalValor}
              animate={{ scale: [1.05, 1] }}
              transition={{ duration: 0.2 }}
            >
              S/ {total.toFixed(2)}
            </motion.span>
          </div>

          <div className={styles.footerBtns}>
            <button className={styles.volverBtn2} onClick={onVolver} disabled={enviando}>
              <ChevronLeft size={14} />
              Editar
            </button>

            <motion.button
              className={styles.enviarBtn}
              onClick={onEnviar}
              disabled={enviando || carrito.length === 0}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              {enviando ? (
                <>
                  <motion.div
                    className={styles.spinner}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                  Enviando...
                </>
              ) : (
                <>
                  <Flame size={16} />
                  Enviar a cocina
                  <Send size={14} />
                </>
              )}
            </motion.button>
          </div>

          <p className={styles.disclaimer}>
            Una vez enviado, el pedido irá directamente a pantalla de cocina.
          </p>
        </motion.div>
      )}
    </div>
  );
}
