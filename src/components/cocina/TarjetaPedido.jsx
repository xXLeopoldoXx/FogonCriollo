// ============================================================
// El Fogón Criollo – TarjetaPedido Component
// Tarjeta individual de pedido en la pantalla de cocina
// ============================================================
import { useEffect, useRef, useState } from 'react';
import styles from './TarjetaPedido.module.css';

/* ── Web Audio: tono de alerta ────────────────────────── */
function playAlertTone(type = 'new') {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'new') {
      // Dos tonos ascendentes para pedido nuevo
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'listo') {
      // Tres tonos para marcar listo
      [0, 0.12, 0.24].forEach((t, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.frequency.value = [523, 659, 784][i];
        g2.gain.setValueAtTime(0.2, ctx.currentTime + t);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
        o2.start(ctx.currentTime + t);
        o2.stop(ctx.currentTime + t + 0.2);
      });
    }
  } catch { /* Silencioso si el navegador bloquea audio */ }
}

/* ── Config de estado ─────────────────────────────────── */
const ESTADO_CFG = {
  PENDIENTE:  { label: 'Nuevo',       accion: 'Iniciar',       cls: 'pendiente', audioType: 'new'   },
  EN_PROCESO: { label: 'En proceso',  accion: 'Marcar listo',  cls: 'proceso',   audioType: 'listo' },
  LISTO:      { label: 'Listo',       accion: null,            cls: 'listo',     audioType: null    },
};

/* ── Timer en tiempo real ─────────────────────────────── */
function useTimer(fechaHora) {
  const [texto, setTexto] = useState('');
  const [seg,   setSeg]   = useState(0);

  useEffect(() => {
    const update = () => {
      const s = Math.floor((Date.now() - new Date(fechaHora)) / 1000);
      setSeg(s);
      if (s < 60)   setTexto(`${s}s`);
      else if (s < 3600) setTexto(`${Math.floor(s / 60)}min ${s % 60}s`);
      else setTexto(`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [fechaHora]);

  return { texto, seg };
}

function urgencia(seg) {
  if (seg > 1200) return 'alta';   // > 20 min
  if (seg > 600)  return 'media';  // > 10 min
  return 'normal';
}

/* ── Componente principal ─────────────────────────────── */
export function TarjetaPedido({ pedido, onAvanzar, isNuevo }) {
  const cfg  = ESTADO_CFG[pedido.estado] ?? ESTADO_CFG.PENDIENTE;
  const { texto: timerTexto, seg } = useTimer(pedido.fecha_hora);
  const urg  = urgencia(seg);
  const [confirmando, setConfirmando] = useState(false);
  const confirmRef = useRef(null);

  const items = typeof pedido.items === 'string'
    ? JSON.parse(pedido.items)
    : (pedido.items ?? []);

  /* ── Sonido al montar si es nuevo ── */
  useEffect(() => {
    if (isNuevo) {
      playAlertTone('new');
    }
  }, [isNuevo]);

  /* ── Cerrar confirmación al hacer clic fuera ── */
  useEffect(() => {
    if (!confirmando) return;
    const handler = (e) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target)) {
        setConfirmando(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmando]);

  function handleAccion() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    // Segundo clic → confirmar
    setConfirmando(false);
    playAlertTone(cfg.audioType ?? 'new');
    onAvanzar(pedido.id_pedido);
  }

  return (
    <div
      className={[
        styles.card,
        styles[cfg.cls],
        styles[`urg_${urg}`],
        isNuevo ? styles.cardNuevo : '',
      ].filter(Boolean).join(' ')}
    >
      {/* ── Indicador de urgencia (barra lateral) */}
      {urg !== 'normal' && <div className={styles.urgBar} />}

      {/* ── Header ──────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.pedidoId}>#{pedido.id_pedido}</span>
          <span className={styles.mesaInfo}>
            Mesa {pedido.numero_mesa} · P{pedido.piso}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.estadoBadge} ${styles[cfg.cls]}`}>{cfg.label}</span>
          <span className={`${styles.timer} ${styles[`timerUrg_${urg}`]}`}>
            ⏱ {timerTexto}
          </span>
        </div>
      </div>

      {/* ── Mesero ──────────────────────────────── */}
      <p className={styles.mesero}>
        <span className={styles.meseroIcon}>👤</span> {pedido.mesero}
      </p>

      <div className={styles.divider} />

      {/* ── Items ───────────────────────────────── */}
      <ul className={styles.items}>
        {items.map((item, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.itemCant}>{item.cantidad}×</span>
            <div className={styles.itemData}>
              <span className={styles.itemNombre}>{item.producto}</span>
              {item.nota && (
                <span className={styles.itemNota}>📝 {item.nota}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* ── Acción con confirmación ──────────────── */}
      {cfg.accion && (
        <div ref={confirmRef} className={styles.accionWrap}>
          {confirmando ? (
            <div className={styles.confirmRow}>
              <span className={styles.confirmMsg}>¿Confirmar?</span>
              <button
                className={`${styles.confirmBtn} ${styles.confirmSi}`}
                onClick={handleAccion}
              >
                Sí ✓
              </button>
              <button
                className={`${styles.confirmBtn} ${styles.confirmNo}`}
                onClick={() => setConfirmando(false)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              className={`${styles.actionBtn} ${styles[`btn_${cfg.cls}`]}`}
              onClick={handleAccion}
            >
              {cfg.accion}
            </button>
          )}
        </div>
      )}

      {/* ── Alerta de urgencia ───────────────────── */}
      {urg === 'alta' && (
        <div className={styles.urgAlert}>
          ⚠️ Pedido con {Math.floor(seg / 60)} minutos de espera
        </div>
      )}
    </div>
  );
}
