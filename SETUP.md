# El Fogón Criollo – Guía de instalación

## Requisitos
- PostgreSQL 17
- Node.js 18+
- Git

---

## 1. Base de datos

Abre pgAdmin → Query Tool en la BD `fogon_criollo` y ejecuta los 3 archivos en orden:

**Paso 1** → pega y ejecuta `01_schema.sql` (ENUMs + tablas)

**Paso 2** → pega y ejecuta `02_extras.sql` (índices + funciones + vistas + trigger)

**Paso 3** → pega y ejecuta `03_seed.sql` (datos de prueba)

---

## 2. Backend

```bash
cd backend
cp .env.example .env
# Edita .env → pon tu contraseña de PostgreSQL en DB_PASSWORD
npm install
npm run dev
```

Verifica: `http://localhost:3000/health` → debe decir `"status":"ok"`

También puedes iniciar la API desde la raíz con:

```bash
npm run dev:backend
```

---

## 3. Frontend

```bash
# En la carpeta raíz del proyecto
echo "VITE_API_URL=http://localhost:3000/api" > .env
npm install
npm run dev
```

Abre: `http://localhost:5173`

El frontend y el backend se ejecutan en terminales separadas. Si solo corres `npm run dev` en la raíz, se abre la interfaz React, pero el login no funcionará si la API en `localhost:3000` o PostgreSQL no están activos.

---

## 4. Credenciales

| Usuario  | Contraseña  | Rol      |
|----------|-------------|----------|
| mesero1  | mesero123   | Mesero   |
| mesero2  | mesero123   | Mesero   |
| cocina1  | cocina123   | Cocina   |
| admin    | admin123    | Admin    |

La pantalla de login no pide rol: valida usuario y contraseña, y el sistema entra automáticamente al módulo que corresponde al rol guardado en la base de datos.

---

## 5. Para usarlo en red local (varios dispositivos)

1. Obtén la IP de tu PC: ejecuta `ipconfig` → anota la "Dirección IPv4" (ej: `192.168.1.4`)
2. En el `.env` del frontend cambia:
   ```
   VITE_API_URL=http://192.168.1.4:3000/api
   ```
3. Reinicia el frontend con `npm run dev`
4. Desde cualquier dispositivo en la misma red abre: `http://192.168.1.4:5173`
