# El Fogón Criollo – Backend

API REST + WebSockets · Node.js + Express + Socket.io + PostgreSQL 17

## Estructura

```
src/
├── server.js              ← Entrada: Express + Socket.io
├── db/
│   ├── pool.js            ← Conexión PostgreSQL
│   └── seed.sql           ← Datos de prueba
├── middleware/
│   └── auth.js            ← JWT + control de roles
├── controllers/
│   ├── authController.js  ← Login / Logout
│   ├── pedidoController.js← Mesas, productos, pedidos, estados
│   └── adminController.js ← Dashboard, reportes, auditoría
└── routes/
    └── index.js           ← Todas las rutas de la API
```

## Instalación y arranque

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con tus datos de PostgreSQL

# 3. Cargar datos de prueba en la BD (solo una vez)
psql -U postgres -d fogon_criollo -f src/db/seed.sql

# 4. Iniciar en desarrollo
npm run dev

# 5. Iniciar en producción
npm start
```

## Credenciales de prueba

| Usuario  | Contraseña  | Rol           |
|----------|-------------|---------------|
| mesero1  | mesero123   | MESERO        |
| mesero2  | mesero123   | MESERO        |
| cocina1  | cocina123   | COCINA        |
| admin    | admin123    | ADMINISTRADOR |

## Endpoints principales

| Método | Ruta                        | Rol requerido |
|--------|-----------------------------|---------------|
| POST   | /api/auth/login             | Público       |
| GET    | /api/mesas                  | Autenticado   |
| GET    | /api/productos              | Autenticado   |
| POST   | /api/pedidos                | MESERO        |
| GET    | /api/pedidos/cocina         | COCINA        |
| PATCH  | /api/pedidos/:id/estado     | COCINA        |
| GET    | /api/admin/resumen-hoy      | ADMINISTRADOR |
| GET    | /api/admin/ventas           | ADMINISTRADOR |
| GET    | /api/admin/auditoria        | ADMINISTRADOR |

## Verificar que funciona

```
GET http://localhost:3000/health
→ { "status": "ok", "db": "connected" }
```

## Acceso desde la red local

El servidor escucha en `0.0.0.0:3000`.
Desde otros dispositivos: `http://<IP-del-servidor>:3000/api`

Para ver tu IP:
- Windows: `ipconfig` → Dirección IPv4
- Linux/Mac: `ip a` o `ifconfig`

Actualizar en el frontend: `fogon-criollo/.env` → `VITE_API_URL=http://<IP>:3000/api`
