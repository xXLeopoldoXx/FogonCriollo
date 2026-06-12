// ============================================================
//  El Fogón Criollo — LoginPage v2
//  Diseño premium con validación y feedback animado
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Flame, AlertCircle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import styles from './LoginPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// ── Partículas de brasa (canvas) ──────────────────────────
function BrasaCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 28 }, () => spawn(canvas));

    function spawn(c) {
      return {
        x:    Math.random() * c.width,
        y:    c.height + Math.random() * 30,
        r:    Math.random() * 1.6 + 0.3,
        dx:   (Math.random() - 0.5) * 0.5,
        dy:   -(Math.random() * 0.7 + 0.3),
        life: Math.random(),
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy; p.life -= 0.0025;
        if (p.life <= 0 || p.y < -10) { particles[i] = spawn(canvas); return; }
        const a = Math.min(p.life * 2, 0.7);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,131,74,${a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}

// ── Input con ícono ───────────────────────────────────────
function InputField({ id, label, icon: Icon, type, error, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <div className={styles.inputWrap}>
        <Icon size={16} className={styles.inputIcon} aria-hidden="true" />
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShow(v => !v)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            className={styles.fieldError}
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Página de login ───────────────────────────────────────
export function LoginPage() {
  const navigate  = useNavigate();
  const { signIn, isAuthenticated, getRoute } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [shake,    setShake]    = useState(false);

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated) navigate(getRoute(), { replace: true });
  }, [isAuthenticated, navigate, getRoute]);

  function validate() {
    const e = {};
    if (!username.trim())       e.username = 'Ingresa tu usuario.';
    if (password.length < 6)    e.password = 'Mínimo 6 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message ?? 'Credenciales incorrectas.');

      signIn(data);
      navigate(
        { MESERO: '/mesero', COCINERO: '/cocina', ADMIN: '/admin' }[data.usuario.rol] ?? '/',
        { replace: true }
      );
    } catch (err) {
      setApiError(err.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <BrasaCanvas />
      <Toaster position="top-center" />

      <motion.div
        className={styles.glassBg}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      <motion.form
        className={`${styles.card} ${shake ? styles.shake : ''}`}
        onSubmit={handleSubmit}
        noValidate
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 }}
        aria-label="Formulario de inicio de sesión"
      >
        {/* ── Logo ────────────────────────────────────── */}
        <div className={styles.logoArea}>
          <motion.div
            className={styles.logoIcon}
            animate={{
              filter: [
                'drop-shadow(0 0 8px rgba(232,131,74,0.5))',
                'drop-shadow(0 0 22px rgba(232,131,74,1))',
                'drop-shadow(0 0 8px rgba(232,131,74,0.5))',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Flame size={42} />
          </motion.div>
          <h1 className={styles.brandName}>
            El <span className={styles.accent}>Fogón</span> Criollo
          </h1>
          <p className={styles.brandSub}>Sistema de gestión</p>
        </div>

        <div className={styles.divider} />

        <p className={styles.welcomeTitle}>Bienvenido de vuelta</p>
        <p className={styles.welcomeSub}>Ingresa tus credenciales para continuar</p>

        {/* ── Campos ──────────────────────────────────── */}
        <InputField
          id="username"
          label="Usuario"
          icon={User}
          type="text"
          placeholder="Tu nombre de usuario"
          autoComplete="username"
          value={username}
          onChange={e => { setUsername(e.target.value); setErrors(v => ({ ...v, username: '' })); }}
          error={errors.username}
        />
        <InputField
          id="password"
          label="Contraseña"
          icon={Lock}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })); }}
          error={errors.password}
        />

        {/* ── Error de API ─────────────────────────────── */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              className={styles.apiError}
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AlertCircle size={15} />
              {apiError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Botón ────────────────────────────────────── */}
        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
          whileHover={!loading ? { scale: 1.01 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
        >
          {loading ? (
            <motion.div
              className={styles.spinner}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Flame size={16} />
          )}
          {loading ? 'Verificando...' : 'Ingresar al sistema'}
        </motion.button>

        {/* ── Status bar ───────────────────────────────── */}
        <div className={styles.statusBar}>
          <motion.span
            className={styles.statusDot}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          Sistema operativo · El Fogón Criollo S.A.C.
        </div>
      </motion.form>
    </div>
  );
}
