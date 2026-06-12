import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MessageSquare, Timer, AlertTriangle } from 'lucide-react';
import styles from './TarjetaPedido.module.css';

function playTone(type = 'new') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'new') {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
    } else {
      [0, 0.12, 0.24].forEach((t, i) => {
        const o = ctx.createOscillator(); const gn = ctx.createGain();
        o.connect(gn); gn.connect(ctx.destination);
        o.frequency.value = [523, 659, 784][i];
        gn.gain.setValueAtTime(0.2, ctx.currentTime + t);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
      });
    }
  } catch {}
}

const ESTADO_CFG = {
  PENDIENTE:  { label:'Nuevo',      accion:'Iniciar',      cls:'pendiente', audio:'new' },
  EN_PROCESO: { label:'En proceso', accion:'Marcar listo', cls:'proceso',   audio:'listo' },
  LISTO:      { label:'Listo',      accion:null,           cls:'listo',     audio:null },
};

function useTimer(fechaHora) {
  const [txt, setTxt] = useState(''); const [seg, setSeg] = useState(0);
  useEffect(() => {
    const update = () => {
      const s = Math.floor((Date.now() - new Date(fechaHora)) / 1000);
      setSeg(s);
      if (s < 60) setTxt(`${s}s`);
      else if (s < 3600) setTxt(`${Math.floor(s/60)}min ${s%60}s`);
      else setTxt(`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}min`);
    };
    update(); const id = setInterval(update, 1000); return () => clearInterval(id);
  }, [fechaHora]);
  return { txt, seg };
}

function urgencia(seg) {
  if (seg > 1200) return 'alta';
  if (seg > 600)  return 'media';
  return 'normal';
}

export function TarjetaPedido({ pedido, onAvanzar, isNuevo }) {
  const cfg = ESTADO_CFG[pedido.estado] ?? ESTADO_CFG.PENDIENTE;
  const { txt: timerTxt, seg } = useTimer(pedido.fecha_hora);
  const urg = urgencia(seg);
  const [confirmando, setConfirmando] = useState(false);
  const confirmRef = useRef(null);
  const items = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : (pedido.items ?? []);

  useEffect(() => { if (isNuevo) playTone('new'); }, [isNuevo]);

  useEffect(() => {
    if (!confirmando) return;
    const handler = (e) => { if (confirmRef.current && !confirmRef.current.contains(e.target)) setConfirmando(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmando]);

  function handleAccion() {
    if (!confirmando) { setConfirmando(true); return; }
    setConfirmando(false);
    if (cfg.audio) playTone(cfg.audio);
    onAvanzar(pedido.id_pedido);
  }

  return (
    <motion.div
      className={[styles.card, styles[cfg.cls], styles[`urg_${urg}`], isNuevo ? styles.cardNuevo : ''].filter(Boolean).join(' ')}
      layout initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, scale:0.95 }} transition={{ type:'spring', stiffness:350, damping:28 }}
    >
      {urg !== 'normal' && <div className={styles.urgBar} />}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.pedidoId}>#{pedido.id_pedido}</span>
          <span className={styles.mesaInfo}>Mesa {pedido.numero_mesa} · P{pedido.piso}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.estadoBadge} ${styles[cfg.cls]}`}>{cfg.label}</span>
          <span className={`${styles.timer} ${styles[`timerUrg_${urg}`]}`}><Timer size={13} /> {timerTxt}</span>
        </div>
      </div>
      <p className={styles.mesero}><User size={14} /> {pedido.mesero}</p>
      <div className={styles.divider} />
      <ul className={styles.items}>
        {items.map((item, i) => (
          <li key={i} className={styles.item}>
            {item.imagen_url && <img className={styles.itemImg} src={item.imagen_url} alt="" loading="lazy" />}
            <span className={styles.itemCant}>{item.cantidad}×</span>
            <div className={styles.itemData}>
              <span className={styles.itemNombre}>{item.producto}</span>
              {item.nota && <span className={styles.itemNota}><MessageSquare size={12} /> {item.nota}</span>}
            </div>
          </li>
        ))}
      </ul>
      {cfg.accion && (
        <div ref={confirmRef} className={styles.accionWrap}>
          <AnimatePresence mode="wait">
            {confirmando ? (
              <motion.div key="confirm" className={styles.confirmRow} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <span className={styles.confirmMsg}>¿Confirmar?</span>
                <button className={`${styles.confirmBtn} ${styles.confirmSi}`} onClick={handleAccion}>Sí ✓</button>
                <button className={`${styles.confirmBtn} ${styles.confirmNo}`} onClick={() => setConfirmando(false)}>No</button>
              </motion.div>
            ) : (
              <motion.button key="action" className={`${styles.actionBtn} ${styles[`btn_${cfg.cls}`]}`} onClick={handleAccion} whileTap={{ scale:0.96 }}>
                {cfg.accion}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
      {urg === 'alta' && (
        <div className={styles.urgAlert}><AlertTriangle size={14} /> {Math.floor(seg/60)} min de espera</div>
      )}
    </motion.div>
  );
}
