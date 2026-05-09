// ============================================================
// El Fogón Criollo – LoginPage
// Solo composición: importa hooks y componentes atómicos
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { RoleSelector } from '../components/auth/RoleSelector';
import { InputField }   from '../components/ui/InputField';
import { Button }       from '../components/ui/Button';
import { useLogin }     from '../hooks/useLogin';
import styles           from './LoginPage.module.css';

/* Íconos inline SVG como componentes React */
function IconUser(props)  {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

export function LoginPage() {
  const [rol,      setRol]      = useState('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const canvasRef = useRef(null);

  const { handleLogin, loading, error } = useLogin();

  /* Partículas de brasa en canvas */
  useEffect(() => {
    const canvas  = canvasRef.current;
    const ctx     = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 22 }, () => spawnParticle(canvas));

    function spawnParticle(c) {
      return {
        x:    Math.random() * c.width,
        y:    c.height + Math.random() * 40,
        r:    Math.random() * 1.8 + 0.4,
        dx:   (Math.random() - 0.5) * 0.6,
        dy:   -(Math.random() * 0.8 + 0.4),
        life: Math.random(),
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x    += p.dx;
        p.y    += p.dy;
        p.life -= 0.003;

        if (p.life <= 0 || p.y < -10) {
          particles[i] = spawnParticle(canvas);
          return;
        }

        const alpha = Math.min(p.life * 2, 0.85);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,131,74,${alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    handleLogin({ username, password, rol });
  }

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <form className={styles.card} onSubmit={onSubmit} noValidate>

        {/* Logo */}
        <div className={styles.logoArea}>
          <span className={styles.flame} aria-hidden="true">🔥</span>
          <h1 className={styles.brandName}>
            El <span className={styles.accent}>Fogón</span> Criollo
          </h1>
          <p className={styles.brandSub}>Sistema de gestión</p>
        </div>

        <div className={styles.divider} />

        <p className={styles.welcome}>Bienvenido de vuelta</p>
        <p className={styles.welcomeSub}>Selecciona tu rol e ingresa tus credenciales</p>

        {/* Selector de rol */}
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Tu rol</span>
          <RoleSelector value={rol} onChange={setRol} />
        </div>

        {/* Usuario */}
        <InputField
          label="Usuario"
          id="username"
          type="text"
          placeholder="Ingresa tu usuario"
          autoComplete="off"
          value={username}
          onChange={e => setUsername(e.target.value)}
          icon={IconUser}
        />

        {/* Contraseña */}
        <InputField
          label="Contraseña"
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          icon={IconLock}
        />

        {/* Error */}
        {error && (
          <p className={styles.error} role="alert">{error}</p>
        )}

        {/* Submit */}
        <Button type="submit" loading={loading} className={styles.submitBtn}>
          Ingresar al sistema
        </Button>

        {/* Status */}
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          Sistema operativo · El Fogón Criollo S.A.C.
        </p>

      </form>
    </div>
  );
}
