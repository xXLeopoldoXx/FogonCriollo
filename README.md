# El Fogón Criollo

Sistema web para la gestión integral de restaurantes. La plataforma permite administrar pedidos, mesas, cocina, usuarios, reportes y métricas en tiempo real mediante una interfaz moderna, comunicación bidireccional y una infraestructura basada en contenedores Docker.

El sistema implementa una arquitectura desacoplada compuesta por un cliente desarrollado en React, una API REST con Express, comunicación en tiempo real mediante Socket.io, almacenamiento persistente en PostgreSQL y un sistema de caché utilizando Redis.

---

# Índice

1. Descripción del Proyecto
2. Características Principales
3. Arquitectura General
4. Tecnologías Utilizadas
5. Requisitos Previos
6. Instalación y Configuración
7. Servicios Disponibles
8. Credenciales de Acceso
9. Estructura del Proyecto
10. Funcionalidades del Sistema
11. Seguridad Implementada
12. Exportaciones
13. Desarrollo
14. Pruebas Automatizadas

---

# Descripción del Proyecto

El Fogón Criollo centraliza los procesos operativos de un restaurante dentro de una única plataforma, permitiendo controlar el flujo completo desde la toma del pedido hasta la entrega al cliente.

El sistema incorpora comunicación en tiempo real entre las distintas áreas del restaurante, control de accesos basado en roles, panel administrativo con indicadores, generación de reportes, exportación de información y mecanismos de seguridad orientados a entornos productivos.

Su arquitectura modular facilita el mantenimiento, escalabilidad e incorporación de nuevas funcionalidades sin afectar el resto del sistema.

---

# Características Principales

## Gestión de Pedidos

- Registro de pedidos por mesa.
- Flujo secuencial para el personal de atención.
- Actualización automática del estado de cada pedido.
- Sincronización inmediata entre cocina y administración.

## Gestión de Cocina

- Visualización de pedidos pendientes.
- Actualización del estado de preparación.
- Organización mediante tablero Kanban.
- Comunicación en tiempo real utilizando Socket.io.

## Panel Administrativo

- Dashboard con indicadores principales.
- Gestión de usuarios.
- Administración de productos.
- Administración de mesas.
- Auditoría de operaciones.
- Reportes de ventas.
- Estadísticas de rendimiento.

## Comunicación en Tiempo Real

- Actualización automática de pedidos.
- Sin necesidad de recargar la aplicación.
- Notificaciones entre módulos.
- Sincronización instantánea entre clientes conectados.

---

# Arquitectura General

```
                    Cliente Web
                  React + Vite
                        │
                        │ HTTP / WebSocket
                        ▼
          Nginx Reverse Proxy (Puerto 80)
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
   Express REST API              Socket.io
          │                           │
          └─────────────┬─────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
     PostgreSQL 17                 Redis
```

---

# Tecnologías Utilizadas

## Frontend

| Tecnología | Función |
|------------|---------|
| React 18 | Desarrollo de la interfaz de usuario |
| Vite | Compilación y servidor de desarrollo |
| Zustand | Gestión del estado global |
| React Query | Administración de peticiones y caché |
| Framer Motion | Animaciones |
| React Hot Toast | Notificaciones |
| Recharts | Visualización de estadísticas |

---

## Backend

| Tecnología | Función |
|------------|---------|
| Express | API REST |
| Socket.io | Comunicación en tiempo real |
| Zod | Validación de datos |
| Helmet | Seguridad HTTP |
| Express Rate Limit | Limitación de peticiones |
| Winston | Sistema de logs |
| PDFKit | Exportación PDF |
| ExcelJS | Exportación Excel |

---

## Base de Datos

| Tecnología | Función |
|------------|---------|
| PostgreSQL 17 | Base de datos principal |
| Redis 7 | Caché y blacklist de tokens |

---

## Infraestructura

| Tecnología | Función |
|------------|---------|
| Docker | Contenedores |
| Docker Compose | Orquestación |
| Nginx | Proxy inverso |
| pgAdmin | Administración de PostgreSQL |
| Redis Commander | Administración de Redis |

---

# Requisitos Previos

Antes de ejecutar el proyecto deben encontrarse instaladas las siguientes herramientas.

- Docker Desktop
- Docker Compose
- Git

Opcionalmente pueden instalarse las siguientes herramientas para tareas de administración y desarrollo.

- Node.js 20 o superior
- Make (Linux / macOS)
- Visual Studio Code

---

# Instalación y Configuración

Todos los comandos deben ejecutarse desde la raíz del proyecto.

```
FogonCriollo/
```

---

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd FogonCriollo
```

---

## 2. Configurar las variables de entorno

Crear el archivo `.env` a partir del archivo de ejemplo.

```bash
cp .env.example .env
```

Modificar los valores necesarios antes del primer despliegue.

---

## 3. Levantar los servicios

### Windows

```bash
docker compose up -d
```

### Linux / macOS

```bash
make up
```

---

## 4. Verificar el estado de los contenedores

```bash
docker compose ps
```

Todos los servicios deben aparecer con estado **Up**.

---

## 5. Inicializar la base de datos

Este procedimiento únicamente debe ejecutarse durante la primera instalación.

### Windows

```bash
docker compose exec postgres sh -c "PGPASSWORD=root psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/01_schema.sql"

docker compose exec postgres sh -c "PGPASSWORD=root psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/02_extras.sql"

docker compose exec postgres sh -c "PGPASSWORD=root psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/03_seed.sql"
```

o utilizando los scripts incluidos:

```bash
migrate.bat
seed.bat
```

### Linux / macOS

```bash
make migrate
make seed
```

---

## 6. Verificar la instalación

Una vez iniciados todos los servicios, el sistema estará disponible en las siguientes direcciones.

| Servicio | Dirección |
|----------|-----------|
| Aplicación | http://localhost |
| API REST | http://localhost/api |
| Health Check | http://localhost/health |
| pgAdmin | http://localhost:5050 |
| Redis Commander | http://localhost:8081 |

Los servicios pgAdmin y Redis Commander se encuentran disponibles únicamente cuando se ejecutan las herramientas de desarrollo correspondientes.

---

# Servicios Disponibles

La infraestructura del sistema está compuesta por cinco servicios principales.

| Servicio | Puerto | Descripción |
|----------|---------|-------------|
| Nginx | 80 | Proxy inverso y punto de entrada |
| Frontend | 5173 | Aplicación React |
| Backend | 3000 | API REST y Socket.io |
| PostgreSQL | 5432 | Base de datos |
| Redis | 6379 | Caché y blacklist de JWT |

La comunicación entre servicios se realiza completamente mediante Docker Compose.

# Credenciales de Acceso

Las siguientes credenciales permiten acceder a los diferentes módulos del sistema durante el desarrollo y las pruebas.

| Usuario | Contraseña | Rol |
|----------|------------|-----|
| admin | admin123 | Administrador |
| mesero1 | mesero123 | Mesero |
| mesero2 | mesero123 | Mesero |
| cocina1 | cocina123 | Cocina |

---

# Estructura del Proyecto

El proyecto sigue una arquitectura modular, separando claramente la aplicación cliente, la API, la infraestructura y la configuración del entorno.

```text
FogonCriollo/

├── backend/
├── frontend/
├── docker/
├── database/
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```

---

## Backend

```text
backend/
│
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── db/
│   ├── utils/
│   └── server.js
│
├── package.json
└── Dockerfile
```

### Organización

| Directorio | Responsabilidad |
|------------|-----------------|
| controllers | Procesamiento de solicitudes HTTP |
| middleware | Autenticación, autorización y validaciones |
| models | Acceso a la base de datos |
| routes | Definición de endpoints |
| services | Lógica de negocio y servicios auxiliares |
| db | Conexión con PostgreSQL y Redis |
| utils | Funciones reutilizables |
| server.js | Punto de entrada de la aplicación |

---

## Frontend

```text
frontend/
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── stores/
│   ├── styles/
│   ├── assets/
│   ├── App.jsx
│   └── main.jsx
│
├── package.json
└── Dockerfile
```

### Organización

| Directorio | Responsabilidad |
|------------|-----------------|
| components | Componentes reutilizables |
| hooks | Lógica reutilizable mediante Hooks |
| pages | Vistas principales del sistema |
| services | Comunicación con la API y Socket.io |
| stores | Estado global mediante Zustand |
| styles | Estilos globales y variables |
| assets | Recursos estáticos |

---

## Infraestructura

```text
docker/

├── nginx/
└── pgadmin/
```

| Directorio | Descripción |
|------------|-------------|
| nginx | Configuración del proxy inverso |
| pgadmin | Configuración del administrador de PostgreSQL |

---

# Funcionalidades del Sistema

El sistema está dividido en módulos independientes que trabajan de forma integrada mediante una arquitectura basada en eventos.

---

## Módulo de Autenticación

Responsabilidades principales:

- Inicio de sesión.
- Cierre de sesión.
- Gestión de sesiones.
- Protección mediante JWT.
- Control de acceso basado en roles.

---

## Módulo de Meseros

Permite registrar pedidos siguiendo un flujo guiado dividido en cuatro etapas.

### Flujo de trabajo

```text
Mesa
   ↓

Productos
   ↓

Confirmación
   ↓

Pedido enviado
```

Funciones disponibles:

- Selección de mesa.
- Catálogo de productos.
- Agregado de observaciones.
- Confirmación del pedido.
- Envío automático a cocina.
- Visualización de pedidos activos.

---

## Módulo de Cocina

Administra la preparación de pedidos utilizando un tablero Kanban sincronizado en tiempo real.

Estados disponibles:

```text
Pendiente

↓

En preparación

↓

Listo

↓

Entregado
```

Características:

- Actualización inmediata.
- Sincronización con meseros.
- Validación de transiciones.
- Evita cambios inválidos de estado.

---

## Módulo Administrativo

Centraliza la administración general del restaurante.

Incluye:

- Dashboard ejecutivo.
- Indicadores KPI.
- Gestión de usuarios.
- Gestión de productos.
- Gestión de mesas.
- Historial de auditoría.
- Reportes.
- Estadísticas de ventas.
- Monitoreo de actividad.
- Alertas en tiempo real.

---

## Reportes

El sistema permite generar información para análisis operativo y toma de decisiones.

Tipos de reportes:

- Ventas.
- Productos.
- Auditoría.
- Rendimiento.
- Actividad de usuarios.

---

# Comunicación en Tiempo Real

Socket.io mantiene sincronizados todos los módulos conectados al sistema.

Eventos principales:

- Nuevo pedido.
- Cambio de estado.
- Actualización de mesa.
- Notificaciones administrativas.
- Actualización del dashboard.

La comunicación ocurre sin necesidad de recargar la aplicación.

---

# Exportaciones

El sistema incorpora generación de documentos para consulta externa.

| Formato | Información |
|----------|-------------|
| Excel | Reportes de ventas |
| Excel | Catálogo de productos |
| Excel | Auditoría |
| PDF | Reporte de ventas |

Las exportaciones incluyen formato profesional, tablas, métricas y fechas de generación.

---

# Comandos de Desarrollo

El proyecto incorpora un conjunto de comandos para facilitar el trabajo diario durante el desarrollo.

| Comando | Descripción |
|----------|-------------|
| make up | Inicia todos los servicios |
| make down | Detiene los contenedores |
| make logs | Visualiza los logs |
| make migrate | Ejecuta migraciones |
| make seed | Inserta datos iniciales |
| make db-reset | Reinicia completamente la base de datos |
| make rebuild | Reconstruye las imágenes Docker |
| make shell-db | Accede a PostgreSQL |
| make tools | Inicia pgAdmin y Redis Commander |
| make clean | Elimina contenedores y volúmenes |
| make serve-lan | Habilita acceso mediante red local |

---

# Acceso desde la Red Local

Para habilitar el acceso desde otros dispositivos conectados a la misma red ejecutar:

```bash
make serve-lan
```

El comando mostrará automáticamente la dirección IP local del servidor.

Ejemplo:

```text
http://192.168.x.x
```

Todos los dispositivos conectados a la misma red podrán acceder utilizando dicha dirección.

---

# Variables de Entorno

El proyecto utiliza un archivo `.env` para centralizar la configuración del entorno.

Entre las variables configurables se encuentran:

- Puerto del backend.
- Puerto del frontend.
- Credenciales de PostgreSQL.
- Configuración de Redis.
- Clave secreta para JWT.
- Configuración de CORS.
- Variables de producción.
- Configuración de Docker.

No se recomienda almacenar credenciales sensibles directamente dentro del código fuente.

# Seguridad Implementada

El sistema incorpora múltiples mecanismos de seguridad orientados a proteger la aplicación, la información almacenada y la comunicación entre los distintos componentes.

| Componente | Implementación | Propósito |
|------------|----------------|-----------|
| Autenticación | JSON Web Token (JWT) | Verificar la identidad de los usuarios |
| Autorización | Role-Based Access Control (RBAC) | Restringir el acceso según el rol del usuario |
| Contraseñas | BCrypt | Almacenamiento seguro mediante hashing |
| Validación | Zod | Validación y sanitización de datos de entrada |
| Protección HTTP | Helmet | Configuración de cabeceras HTTP seguras |
| Control de solicitudes | Express Rate Limit | Prevención de ataques por fuerza bruta y abuso de la API |
| Revocación de sesiones | Redis Blacklist | Invalidación inmediata de tokens JWT al cerrar sesión |
| Caché | Redis | Optimización del rendimiento y reducción de consultas repetitivas |
| CORS | Configuración personalizada | Restricción de orígenes permitidos |
| Compresión | Compression | Optimización del tamaño de las respuestas HTTP |
| Registro de eventos | Winston | Registro estructurado de errores y eventos del sistema |

---

## Seguridad de Autenticación

El acceso al sistema se encuentra protegido mediante JSON Web Tokens (JWT).

Características implementadas:

- Inicio de sesión autenticado.
- Generación de tokens firmados.
- Verificación automática en cada solicitud protegida.
- Revocación inmediata de sesiones mediante Redis.
- Expiración automática de credenciales.

---

## Seguridad de Autorización

El acceso a los recursos se controla mediante un modelo RBAC (Role-Based Access Control).

Roles disponibles:

- Administrador
- Mesero
- Cocina

Cada endpoint verifica automáticamente que el usuario posea los permisos necesarios antes de ejecutar cualquier operación.

---

## Validación de Datos

Todas las solicitudes recibidas por la API son validadas antes de procesarse.

La validación incluye:

- Tipos de datos.
- Campos obligatorios.
- Longitud mínima y máxima.
- Formatos válidos.
- Sanitización de información.

Esto evita el procesamiento de datos inconsistentes o potencialmente maliciosos.

---

## Registro de Eventos

El sistema registra automáticamente los principales eventos de ejecución.

Entre ellos:

- Errores internos.
- Solicitudes fallidas.
- Eventos críticos.
- Actividad de la aplicación.

Los registros se administran mediante Winston utilizando rotación automática de archivos.

---

# Pruebas Automatizadas

El proyecto implementa una estrategia de desarrollo basada en Test Driven Development (TDD), garantizando que cada componente sea validado mediante pruebas automatizadas antes de integrarse al sistema.

---

## Resultados de Cobertura

| Métrica | Resultado |
|----------|-----------|
| Total de pruebas | 77 |
| Archivos evaluados | 7 |
| Statements | 99.47 % |
| Functions | 100 % |
| Branches | 88.50 % |

Las ramas no cubiertas corresponden a validaciones específicas del entorno de ejecución relacionadas con `localStorage` dentro de JSDOM.

---

## Organización de las Pruebas

Las pruebas se encuentran distribuidas según la arquitectura del proyecto.

| Módulo | Descripción |
|---------|-------------|
| Modelos | Validación de reglas de negocio |
| Controladores | Gestión del estado de la aplicación |
| Servicios | Comunicación mediante Socket.io |
| Hooks | Lógica reutilizable del frontend |
| Componentes | Comportamiento de la interfaz de usuario |

---

## Ciclos de Desarrollo TDD

Cada módulo fue desarrollado siguiendo el ciclo clásico de Test Driven Development.

| Ciclo | Componente | Cantidad de pruebas |
|--------|------------|---------------------|
| 1 | Máquina de estados del pedido | 20 |
| 2 | Cocina Store | 14 |
| 3 | Socket Handler | 8 |
| 4 | Tarjeta de Pedido | 13 |
| 5 | Panel de Cocina | 7 |
| 6 | Hook de Cocina | 9 |
| 7 | Cobertura adicional | 6 |

---

## Flujo de Desarrollo

Cada funcionalidad sigue el siguiente proceso:

```text
Red
│
├── Se escribe una prueba que inicialmente falla.
│
▼

Green
│
├── Se implementa el código mínimo necesario para aprobar la prueba.
│
▼

Refactor
│
└── Se mejora la implementación sin modificar el comportamiento validado.
```

---

## Ejecución de las Pruebas

Instalar las dependencias:

```bash
npm install
```

Ejecutar todas las pruebas:

```bash
npm test
```

Modo observación:

```bash
npm run test:watch
```

Generar reporte de cobertura:

```bash
npm run coverage
```

---

# Buenas Prácticas del Proyecto

Para mantener la consistencia del código y facilitar el trabajo colaborativo se recomienda seguir las siguientes prácticas durante el desarrollo.

- Mantener una separación clara entre presentación, lógica de negocio y acceso a datos.
- Implementar componentes reutilizables siempre que sea posible.
- Evitar duplicación de código.
- Validar toda la información recibida desde el cliente.
- Mantener la lógica de negocio fuera de la interfaz de usuario.
- Utilizar nombres descriptivos para archivos, variables y funciones.
- Documentar únicamente cuando el código no sea suficientemente expresivo.
- Crear pruebas automatizadas para nuevas funcionalidades.
- Mantener una estructura modular y desacoplada.
- Utilizar ramas independientes para cada nueva característica.

---

# Arquitectura de Desarrollo

El proyecto adopta una arquitectura basada en responsabilidades claramente definidas.

```text
Frontend
│
├── Presentación
├── Estado Global
├── Hooks
├── Servicios
└── Componentes

            │

            ▼

Backend
│
├── Rutas
├── Controladores
├── Servicios
├── Modelos
├── Base de Datos
└── Middleware
```

Esta organización favorece la mantenibilidad, escalabilidad y reutilización del código.

---

# Próximas Mejoras

La arquitectura del proyecto permite incorporar nuevas funcionalidades sin afectar los módulos existentes.

Entre las mejoras previstas se consideran:

- Notificaciones Push.
- Integración con pasarelas de pago.
- Gestión de inventario en tiempo real.
- Modo Offline para toma de pedidos.
- Panel analítico avanzado.
- Reportes personalizados.
- Integración con sistemas POS.
- Implementación de CI/CD.
- Despliegue automatizado en servicios cloud.
- Monitoreo mediante métricas y observabilidad.

---

# Licencia

Este proyecto ha sido desarrollado con fines académicos y de aprendizaje.

Su estructura modular, arquitectura basada en componentes y separación de responsabilidades permiten utilizarlo como referencia para el desarrollo de aplicaciones web de gestión empresarial.

---

# Autores

Proyecto desarrollado para la implementación de un sistema de gestión de restaurantes utilizando tecnologías modernas del ecosistema JavaScript, comunicación en tiempo real y arquitectura basada en servicios.

---

**El Fogón Criollo**

Sistema de Gestión Integral para Restaurantes

Versión 5.0