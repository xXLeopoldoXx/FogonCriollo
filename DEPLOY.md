# Despliegue gratuito: Vercel + Render + Neon

Frontend en **Vercel**, backend (Express + Socket.io) en **Render**, PostgreSQL en **Neon**.
Redis y el cron de backups se desactivan (no hacen falta en la demo).

## 1. Neon (base de datos)
1. Crea un proyecto en https://neon.tech y copia la *connection string* (`postgresql://...?sslmode=require`).
2. En el **SQL Editor** de Neon ejecuta, en orden, el contenido de:
   `docker/postgres/init/01_schema.sql`, `02_extras.sql`, `03_seed.sql`.

## 2. Render (backend)
1. New → **Web Service** → conecta el repo de GitHub.
2. Root Directory: `backend` · Runtime: Node · Build: `npm install` · Start: `npm start` · Plan: Free.
3. Environment variables:
   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | la de Neon |
   | `JWT_SECRET` | cadena aleatoria de 32+ caracteres |
   | `JWT_EXPIRES` | `8h` |
   | `REDIS_DISABLED` | `true` |
   | `ENABLE_CRON` | `false` |
   | `CLIENT_URL` | URL de Vercel (paso 3; sin `/` final) |
4. Health Check Path: `/health`. Anota la URL (`https://xxx.onrender.com`).

## 3. Vercel (frontend)
1. Add New → Project → mismo repo. Root Directory: `frontend` (Framework: Vite).
2. Environment variables:
   - `VITE_API_URL` = `https://xxx.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://xxx.onrender.com`
3. Deploy, copia la URL y ponla en `CLIENT_URL` de Render (Render redeploya solo).

## 4. Comprobar
- `https://xxx.onrender.com/health` → `db: connected`.
- Abre la URL de Vercel, inicia sesión con un usuario del seed y crea un pedido; debe aparecer en cocina en tiempo real.

## Notas
- Render Free se duerme tras 15 min: la primera petición tarda ~30-50 s. Opcional: monitor de UptimeRobot a `/health` cada 10 min.
- Los archivos exportados (`/exports`) son efímeros en Render Free.
- Vercel Hobby es para uso no comercial (válido para portafolio).
