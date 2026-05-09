# El Fogón Criollo – Frontend

Sistema de gestión de pedidos · React 18 + Vite + Socket.io

## Estructura de carpetas

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
```

## Principios de diseño aplicados (UX del curso)

| Principio | Implementación |
|---|---|
| Consistencia | CSS variables globales, componentes reutilizables |
| Visibilidad del estado | Spinner en login, dot verde "Sistema operativo" |
| Retroalimentación | Error animado (shake), botón verde al éxito |
| Minimización de memoria | Roles visibles con ícono, no hay que recordar rutas |

## Instalación

```bash
npm install
npm run dev
```

## Variables de entorno

```env
VITE_API_URL=http://localhost:3000/api
```

## Flujo de autenticación

```
LoginPage → useLogin hook → authService.login() → POST /api/auth/login
         ← JWT token ← BD tabla usuario (rol validado)
         → AuthContext.signIn() → navigate(/mesero | /cocina | /admin)
```
