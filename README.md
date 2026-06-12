# El Fogón Criollo — Sistema de Gestión v2.0

**Stack:** React 18 + Vite · Express · Socket.io · PostgreSQL 17 · Redis · Docker

---

## Inicio Rápido con Docker

Sigue estos pasos desde la **raíz del proyecto** (`FogonCriollo/`):

### 1. Configurar variables de entorno
```bash
cp .env.example .env
```

### 2. Levantar todo el sistema
* **En Windows (PowerShell/CMD):**
  ```bash
  docker compose up -d

  verificar que corre
  docker compose ps 

  subir tus datos uno por uno solo si es primera vez
  docker compose exec fogon_postgres sh -c "PGPASSWORD=root psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/01_schema.sql"

  docker compose exec postgres sh -c "PGPASSWORD=root psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/02_extras.sql"

  docker compose exec postgres sh -c "PGPASSWORD=root psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/03_seed.sql"
  ```
* **En Mac / Linux:**
  ```bash
  make up
  ```

### 3. Preparar la Base de Datos (Solo la primera vez)
* **En Windows (PowerShell/CMD):**
  ```bash
  .\migrate.bat
  .\seed.bat
  ```
* **En Mac / Linux:**
  ```bash
  make migrate
  make seed
  ```
```

**URLs:**
| Servicio | URL |
|---|---|
| App principal | http://localhost |
| API | http://localhost/api |
| Health | http://localhost/health |
| pgAdmin | http://localhost:5050 (con `make tools`) |
| Redis Commander | http://localhost:8081 (con `make tools`) |

---

## Arquitectura

```
docker-compose.yml
├── nginx          → Reverse proxy :80 (LAN + WS)
├── frontend       → React + Vite :5173
├── backend        → Express + Socket.io :3000
├── postgres       → PostgreSQL 17 :5432
└── redis          → Redis 7 :6379
```

### Tecnologías nuevas v2

| Área | Tecnología | Por qué |
|---|---|---|
| Estado frontend | **Zustand** | Más simple que Context, persiste en localStorage |
| Data fetching | **React Query** | Cache, refetch automático, loading/error states |
| Animaciones | **Framer Motion** | Transiciones fluidas entre pasos, microanimaciones |
| Toasts | **react-hot-toast** | Notificaciones elegantes sin configuración |
| Gráficos | **Recharts** | Charts responsivos con tooltips personalizados |
| Validación backend | **Zod** | Schemas tipados, mensajes de error descriptivos |
| Seguridad | **Helmet + express-rate-limit** | Headers HTTP seguros, límite de intentos de login |
| Logging | **Winston + DailyRotateFile** | Logs estructurados con rotación diaria |
| Excel export | **ExcelJS** | Excel con estilos, gradientes, autofilter |
| PDF export | **PDFKit** | PDFs con branding, tablas y KPIs |
| Cache | **Redis (ioredis)** | Cache de queries, blacklist de tokens JWT |
| Token revocation | **Redis blacklist** | Logout real invalidando el JWT |

---

## Estructura del proyecto

```
src/
├── styles/
│   ├── variables.css        ← Design tokens (colores, tipografía, sombras)
│   └── global.css           ← Reset + base global
│
├── services/
│   └── authService.js       ← Llamadas API: login, logout, session storage
│
├── context/
│   └── AuthContext.jsx      ← Estado global de autenticación (React Context)
│
├── hooks/
│   └── useLogin.js          ← Lógica de login separada de la UI
│
├── components/
│   ├── auth/
│   │   ├── RoleSelector.jsx         ← Selector visual de rol
│   │   └── RoleSelector.module.css
│   └── ui/
│       ├── InputField.jsx           ← Input reutilizable con ícono
│       ├── InputField.module.css
│       ├── Button.jsx               ← Botón con loading, variantes
│       └── Button.module.css
│
├── pages/
│   ├── LoginPage.jsx        ← Composición del login (sin lógica)
│   ├── LoginPage.module.css
│   ├── MeseroPage.jsx       ← (próximo)
│   ├── CocinaPage.jsx       ← (próximo)
│   └── AdminPage.jsx        ← (próximo)
│
└── App.jsx                  ← Router + Providers + PrivateRoute
fogon/
├── docker-compose.yml        ← Orquestación de servicios
├── Makefile                  ← Comandos: make up / make seed / make serve-lan
├── .env                      ← Variables de entorno
│
├── docker/
│   ├── nginx/                ← Configuración del proxy inverso
│   └── pgadmin/              ← Configuración de pgAdmin
│
├── backend/
│   ├── Dockerfile
│   ├── package.json          ← Helmet, Zod, ExcelJS, PDFKit, Redis, Winston...
│   └── src/
│       ├── server.js         ← Express + Socket.io + Helmet + Compression
│       ├── db/
│       │   ├── pool.js       ← Pool PostgreSQL con logging
│       │   └── redis.js      ← ioredis + helpers de caché
│       ├── middleware/
│       │   ├── auth.js       ← JWT + RBAC + blacklist Redis
│       │   └── validate.js   ← Validación Zod centralizada
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── pedidoController.js
│       │   ├── adminController.js   ← + actividad usuarios + mesas + notifs
│       │   ├── exportController.js  ← Excel y PDF
│       │   └── mesaController.js
│       ├── models/
│       │   ├── adminModel.js        ← + rendimiento mesas + actividad + notifs
│       │   ├── pedidoModel.js
│       │   ├── productoModel.js
│       │   ├── mesaModel.js
│       │   └── usuarioModel.js
│       ├── routes/index.js          ← Rate limiting por endpoint
│       ├── services/
│       │   ├── exportService.js     ← ExcelJS + PDFKit con branding
│       │   └── socketService.js
│       └── utils/logger.js          ← Winston con rotación diaria
│
└── frontend/
    ├── Dockerfile
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx                  ← React Query + rutas + guards
        ├── main.jsx
        ├── stores/
        │   └── authStore.js         ← Zustand con persistencia
        ├── hooks/
        │   ├── useMesero.js         ← Flujo secuencial 4 pasos
        │   ├── useCocina.js
        │   └── useAdmin.js          ← React Query + exportaciones
        ├── services/
        │   └── socketService.js     ← Singleton Socket.io
        ├── styles/
        │   ├── tokens.css           ← Design tokens completos
        │   └── global.css
        ├── pages/
        │   ├── LoginPage.jsx        ← Validación inline + animaciones
        │   ├── MeseroPage.jsx       ← Flujo secuencial: Mesa→Carta→Confirmar→Enviado
        │   ├── CocinaPage.jsx       ← Kanban en tiempo real
        │   ├── AdminPage.jsx        ← Dashboard analítico con exportaciones
        │   └── ClientePage.jsx
        └── components/
            ├── mesero/
            │   ├── StepMesa.jsx          ← Selector de mesas con estados
            │   ├── StepProductos.jsx     ← Catálogo con búsqueda y tabs
            │   ├── StepConfirmacion.jsx  ← Revisión final con notas
            │   ├── StepEnviado.jsx       ← Éxito con confetti + link cliente
            │   └── PedidosActivos.jsx    ← Sidebar lateral
            ├── cocina/
            │   ├── TarjetaPedido.jsx
            │   └── ContadorEstados.jsx
            └── admin/
                ├── KpiRow.jsx            ← 6 KPIs con contador animado
                ├── VentasChart.jsx       ← Área chart Recharts
                ├── HorasChart.jsx        ← Bar chart por hora
                ├── TopProductos.jsx      ← Ranking con barras animadas
                ├── MesasHeatmap.jsx      ← Estado visual de todas las mesas
                ├── ActividadUsers.jsx    ← Rendimiento de meseros
                ├── NotifPanel.jsx        ← Alertas en tiempo real
                ├── TablaAuditoria.jsx    ← Historial de cambios
                └── ProductosAdmin.jsx    ← CRUD con filtros y exportación
```

---

## Credenciales de prueba

| Usuario  | Contraseña | Rol     |
|----------|------------|---------|
| mesero1  | mesero123  | MESERO  |
| mesero2  | mesero123  | MESERO  |
| cocina1  | cocina123  | COCINA  |
| admin    | admin123   | ADMIN   |

---

## Exportaciones disponibles

Desde el panel Admin → Reportes:

- **Excel de ventas** — Período seleccionado con variación día a día, totales y gráfico de datos
- **PDF de ventas** — Reporte con KPIs, tabla completa y pie de página con fecha
- **Excel de productos** — Catálogo completo con categorías y precios
- **Excel de auditoría** — Historial de cambios de estado con colores por tipo

---

## Acceso desde red local (LAN)

```bash
make serve-lan
# Muestra la IP local y genera QR code en terminal
```

Todos los dispositivos en la misma red WiFi pueden acceder con:
`http://192.168.x.x` (IP que muestra el comando)

---

## comandos Make disponibles

```bash
make up           # Inicia todos los servicios
make down         # Detiene todos los servicios  
make logs         # Ver logs en tiempo real
make migrate      # Ejecuta migraciones SQL
make seed         # Carga datos de prueba
make db-reset     # Borra y recrea la BD (¡destructivo!)
make tools        # Inicia pgAdmin + Redis Commander
make serve-lan    # Muestra IP y QR para acceso LAN
make shell-db     # Abre psql en PostgreSQL
make rebuild      # Reconstruye imágenes Docker
make clean        # Elimina volúmenes y contenedores
```

---

## Seguridad implementada

- **Helmet** — Headers HTTP seguros (CSP, HSTS, X-Frame-Options...)
- **Rate limiting** — 100 req/min general, 10 intentos de login por IP/min
- **JWT blacklist** — Tokens revocados al hacer logout (vía Redis)
- **Validación Zod** — Sanitización de todos los inputs del backend
- **RBAC** — Control de roles granular por endpoint
- **Bcrypt** — Contraseñas hasheadas con factor 10
- **CORS** — Solo permite origen configurado
- **Compression** — Gzip activado para todas las respuestas

---

*El Fogón Criollo S.A.C. — Sistema de gestión v4.0*
