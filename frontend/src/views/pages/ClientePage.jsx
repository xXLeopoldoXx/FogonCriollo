// ============================================================
// El Fogón Criollo - ClientePage
// Entrada publica de espera y seguimiento en tiempo real
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getClienteEspera, getClientePedido } from '../../models/pedidoModel';
import styles from './ClientePage.module.css';

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace('/api', '');

const PASOS = [
  { key: 'PENDIENTE', label: 'Recibido', sub: 'Tu pedido esta en la lista de espera', icon: '1' },
  { key: 'EN_PROCESO', label: 'En cocina', sub: 'La cocina ya lo esta preparando', icon: '2' },
  { key: 'LISTO', label: 'Listo', sub: 'El mesero lo llevara a tu mesa', icon: '3' },
  { key: 'ENTREGADO', label: 'Entregado', sub: 'Pedido cerrado', icon: '4' },
];

const PASO_IDX = { PENDIENTE: 0, EN_PROCESO: 1, LISTO: 2, ENTREGADO: 3 };

const ESTADO_COPY = {
  PENDIENTE: 'En espera',
  EN_PROCESO: 'Preparando',
  LISTO: 'Listo para entregar',
  ENTREGADO: 'Entregado',
};

function useTiempoTranscurrido(fechaHora) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!fechaHora) return;
    const update = () => {
      const seg = Math.max(0, Math.floor((Date.now() - new Date(fechaHora)) / 1000));
      if (seg < 60) setTexto(`${seg}s`);
      else if (seg < 3600) setTexto(`${Math.floor(seg / 60)} min`);
      else setTexto(`${Math.floor(seg / 3600)}h ${Math.floor((seg % 3600) / 60)}min`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [fechaHora]);

  return texto;
}

function StatusPill({ estado }) {
  return (
    <span className={`${styles.estadoPill} ${styles[`estado_${estado}`] ?? ''}`}>
      {ESTADO_COPY[estado] ?? estado}
    </span>
  );
}

function LoadingScreen() {
  return (
    <div className={styles.loadRoot}>
      <div className={styles.loaderPlate}>
        <span />
        <span />
        <span />
      </div>
      <p className={styles.loadText}>Preparando la pantalla...</p>
    </div>
  );
}

function ErrorScreen({ mensaje, onBack }) {
  return (
    <div className={styles.errorRoot}>
      <span className={styles.errorIcon}>!</span>
      <h2 className={styles.errorTitle}>No encontramos tu pedido</h2>
      <p className={styles.errorMsg}>{mensaje}</p>
      <button className={styles.primaryBtn} onClick={onBack}>Ver lista de espera</button>
    </div>
  );
}

function ClienteEspera({ pedidos, connected, loading, onBuscar, onOpen }) {
  const [codigo, setCodigo] = useState('');
  const activos = pedidos ?? [];

  function submit(e) {
    e.preventDefault();
    const id = codigo.trim().replace('#', '');
    if (id) onBuscar(id);
  }

  return (
    <div className={styles.root}>
      <section className={styles.heroCliente}>
        <div className={styles.brandLockup}>
          <span className={styles.logoMark}>FC</span>
          <div>
            <p className={styles.kicker}>El Fogon Criollo</p>
            <h1 className={styles.heroTitle}>Lista de espera</h1>
          </div>
        </div>
        <span className={`${styles.liveBadge} ${connected ? styles.liveOn : styles.liveOff}`}>
          <span /> {connected ? 'En vivo' : 'Actualizando'}
        </span>

        <form className={styles.searchBox} onSubmit={submit}>
          <label htmlFor="pedidoSearch">Codigo de pedido</label>
          <div className={styles.searchRow}>
            <input
              id="pedidoSearch"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              inputMode="numeric"
              placeholder="Ej. 18"
            />
            <button type="submit">Consultar</button>
          </div>
        </form>
      </section>

      <main className={styles.queueShell}>
        <div className={styles.queueHeader}>
          <div>
            <h2>Pedidos activos</h2>
            <p>{activos.length ? `${activos.length} pedidos en seguimiento` : 'Aun no hay pedidos activos'}</p>
          </div>
        </div>

        {loading ? (
          <div className={styles.queueEmpty}>Cargando lista...</div>
        ) : activos.length === 0 ? (
          <div className={styles.queueEmpty}>Cuando un mesero envie un pedido, aparecera aqui.</div>
        ) : (
          <div className={styles.queueList}>
            {activos.map(pedido => (
              <button
                key={pedido.id_pedido}
                className={styles.queueItem}
                onClick={() => onOpen(pedido.id_pedido)}
              >
                <span className={styles.queueRank}>#{pedido.posicion_cola ?? '-'}</span>
                <span className={styles.queueMain}>
                  <strong>Pedido #{pedido.id_pedido}</strong>
                  <small>Mesa {pedido.numero_mesa} · Piso {pedido.piso} · {pedido.minutos_espera ?? 0} min</small>
                </span>
                <StatusPill estado={pedido.estado} />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StageAnimation({ estado }) {
  const paso = PASO_IDX[estado] ?? 0;
  const progress = `${Math.min(100, (paso / 3) * 100)}%`;
  return (
    <div className={styles.stage} style={{ '--progress': progress, '--runner-step': paso }} aria-hidden="true">
      <div className={styles.stageTrack}>
        <span className={styles.stageFill} />
        <span className={styles.runner} />
      </div>
      {PASOS.map((item, index) => (
        <div key={item.key} className={`${styles.station} ${paso >= index ? styles.stationActive : ''}`}>
          <span className={styles.stationIcon}>{String(index + 1).padStart(2, '0')}</span>
          <span>{item.label}</span>
        </div>
      ))}
      <div className={styles.heatField}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function ClientePage() {
  const { idPedido } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [pedido, setPedido] = useState(null);
  const [cola, setCola] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [nuevaAlerta, setNuevaAlerta] = useState(false);

  const tiempoTexto = useTiempoTranscurrido(pedido?.fecha_hora);
  const pasoActual = PASO_IDX[pedido?.estado] ?? 0;
  const etaTexto = useMemo(() => {
    if (!pedido) return '';
    if (pedido.estado === 'ENTREGADO') return 'Finalizado';
    if (pedido.estado === 'LISTO') return '1-2 min';
    if (pedido.estado === 'EN_PROCESO') return '6-10 min';
    const cola = Number(pedido.posicion_cola ?? 1);
    return `${Math.max(4, cola * 3)}-${Math.max(8, cola * 4)} min`;
  }, [pedido]);

  const items = useMemo(() => {
    if (!pedido?.items) return [];
    return typeof pedido.items === 'string' ? JSON.parse(pedido.items) : pedido.items;
  }, [pedido]);

  const fetchPedido = useCallback(async () => {
    if (!idPedido) return;
    try {
      setError('');
      const data = await getClientePedido(idPedido);
      setPedido(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [idPedido]);

  const fetchCola = useCallback(async () => {
    try {
      setError('');
      const data = await getClienteEspera();
      setCola(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (idPedido) fetchPedido();
    else fetchCola();
  }, [idPedido, fetchPedido, fetchCola]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: {},
      reconnection: true,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (idPedido) socket.emit('join:pedido', Number(idPedido));
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('pedido:nuevo', () => {
      if (!idPedido) fetchCola();
    });
    socket.on('pedido:estado', ({ id_pedido, estado }) => {
      if (!idPedido) {
        fetchCola();
        return;
      }
      if (Number(id_pedido) !== Number(idPedido)) return;
      setPedido(prev => prev ? { ...prev, estado } : prev);
      setNuevaAlerta(true);
      setTimeout(() => setNuevaAlerta(false), 2800);
      fetchPedido();
    });

    return () => socket.disconnect();
  }, [idPedido, fetchCola, fetchPedido]);

  useEffect(() => {
    const id = setInterval(idPedido ? fetchPedido : fetchCola, idPedido ? 15000 : 10000);
    return () => clearInterval(id);
  }, [idPedido, fetchPedido, fetchCola]);

  if (!idPedido) {
    return (
      <ClienteEspera
        pedidos={cola}
        connected={connected}
        loading={loading}
        onBuscar={id => navigate(`/cliente/${id}`)}
        onOpen={id => navigate(`/cliente/${id}`)}
      />
    );
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen mensaje={error} onBack={() => navigate('/cliente')} />;
  if (!pedido) return <ErrorScreen mensaje="Pedido no encontrado." onBack={() => navigate('/cliente')} />;

  return (
    <div className={`${styles.root} ${pedido.estado === 'LISTO' ? styles.rootListo : ''}`}>
      {nuevaAlerta && (
        <div className={styles.alertaBanner} role="alert">
          Tu pedido acaba de avanzar
        </div>
      )}

      <header className={styles.trackingHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/cliente')}>Lista</button>
        <div>
          <p className={styles.kicker}>Seguimiento en vivo</p>
          <h1 className={styles.trackTitle}>Pedido #{pedido.id_pedido}</h1>
        </div>
        <span className={`${styles.liveBadge} ${connected ? styles.liveOn : styles.liveOff}`}>
          <span /> {connected ? 'En vivo' : 'Offline'}
        </span>
      </header>

      <main className={styles.trackingGrid}>
        <section className={styles.statusPanel}>
          <div className={styles.statusTop}>
            <div>
              <p className={styles.statusLabel}>Estado actual</p>
              <h2>{ESTADO_COPY[pedido.estado] ?? pedido.estado}</h2>
            </div>
            <StatusPill estado={pedido.estado} />
          </div>

          <StageAnimation estado={pedido.estado} />

          <div className={styles.timeline}>
            {PASOS.map((paso, i) => {
              const completado = i < pasoActual;
              const activo = i === pasoActual;
              return (
                <div
                  key={paso.key}
                  className={[
                    styles.paso,
                    completado ? styles.pasoCompletado : '',
                    activo ? styles.pasoActivo : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className={styles.pasoIcon}>{completado ? '✓' : paso.icon}</span>
                  <span>
                    <strong>{paso.label}</strong>
                    <small>{activo ? paso.sub : ' '}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className={styles.infoPanel}>
          <div className={styles.infoGrid}>
            <div>
              <span>Mesa</span>
              <strong>{pedido.numero_mesa} · Piso {pedido.piso}</strong>
            </div>
            <div>
              <span>Tiempo</span>
              <strong>{tiempoTexto}</strong>
            </div>
            <div>
              <span>Cola</span>
              <strong>{pedido.posicion_cola ? `#${pedido.posicion_cola}` : 'Atendido'}</strong>
            </div>
            <div>
              <span>Estimado</span>
              <strong>{etaTexto}</strong>
            </div>
          </div>

          <div className={styles.progressCopy}>
            {pedido.estado === 'PENDIENTE' && 'Estas en lista de espera. La cocina tomara tu pedido en breve.'}
            {pedido.estado === 'EN_PROCESO' && 'Tu pedido ya esta en preparacion. La pantalla se actualiza sola.'}
            {pedido.estado === 'LISTO' && 'Tu pedido esta listo. El mesero lo entregara en tu mesa.'}
            {pedido.estado === 'ENTREGADO' && 'Pedido entregado. Gracias por visitarnos.'}
          </div>
        </aside>

        <section className={styles.itemsSection}>
          <div className={styles.sectionHead}>
            <h3>Detalle del pedido</h3>
            <strong>S/ {Number(pedido.total ?? 0).toFixed(2)}</strong>
          </div>
          <div className={styles.itemsGrid}>
            {items.map((item, i) => (
              <article key={`${item.producto}-${i}`} className={styles.itemCard}>
                <img src={item.imagen_url} alt={item.producto} loading="lazy" />
                <div>
                  <span className={styles.itemCant}>{item.cantidad}x</span>
                  <h4>{item.producto}</h4>
                  {item.nota && <p>{item.nota}</p>}
                  {item.precio && <strong>S/ {(Number(item.precio) * item.cantidad).toFixed(2)}</strong>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}