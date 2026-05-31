// ============================================================
// El Fogón Criollo – LoginPage
// Solo composición: importa hooks y componentes atómicos
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { User, Lock, Flame } from 'lucide-react';
import { InputField }   from '../components/ui/InputField';
import { Button }       from '../components/ui/Button';
import { useLogin }     from '../../controllers/useLogin';
import styles           from './LoginPage.module.css';

export function LoginPage() {
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
    handleLogin({ username, password });
  }

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <form className={styles.card} onSubmit={onSubmit} noValidate>

        {/* Logo */}
        <div className={styles.logoArea}>
          <span className={styles.flame} aria-hidden="true"><Flame size={44} /></span>
          <h1 className={styles.brandName}>
            El <span className={styles.accent}>Fogón</span> Criollo
          </h1>
          <p className={styles.brandSub}>Sistema de gestión</p>
        </div>

        <div className={styles.divider} />

        <p className={styles.welcome}>Bienvenido de vuelta</p>
        <p className={styles.welcomeSub}>Ingresa tus credenciales para continuar</p>

        {/* Usuario */}
        <InputField
          label="Usuario"
          id="username"
          type="text"
          placeholder="Ingresa tu usuario"
          autoComplete="off"
          value={username}
          onChange={e => setUsername(e.target.value)}
          icon={User}
        />

        {/* Contraseña */}
        <InputField
          label="Contraseña"
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          icon={Lock}
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
