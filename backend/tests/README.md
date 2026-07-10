# Pruebas Automatizadas

El proyecto incorpora pruebas automatizadas para verificar el correcto funcionamiento de la lógica de negocio, los servicios y los componentes de la aplicación. Antes de ejecutar las pruebas, asegúrese de haber instalado todas las dependencias del proyecto.

---

## Requisitos

Verifique que Node.js y npm se encuentren instalados.

```bash
node -v
npm -v
```

---

## Instalar las dependencias

Si es la primera vez que ejecuta el proyecto, instale todas las dependencias.

```bash
npm install
```

Si el proyecto está dividido en **frontend** y **backend**, instale las dependencias en cada uno.

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

---

## Ejecutar las pruebas

### Ejecutar todas las pruebas

Desde la carpeta correspondiente (frontend o backend), ejecute:

```bash
npm test
```

El sistema ejecutará automáticamente todas las pruebas configuradas.

---

### Ejecutar las pruebas en modo observación

Este modo vuelve a ejecutar las pruebas automáticamente cuando se detectan cambios en el código.

```bash
npm run test:watch
```

---

### Generar el reporte de cobertura

Para conocer el porcentaje de código cubierto por las pruebas:

```bash
npm run coverage
```

Al finalizar se mostrará un resumen similar al siguiente:

```text
Statements   : 99.47 %
Functions    : 100 %
Branches     : 88.50 %
Lines         : 99 %
```

Dependiendo de la configuración del proyecto, también podrá generarse una carpeta `coverage/` con un reporte HTML que puede abrirse desde el navegador.

---

# Organización de las Pruebas

Las pruebas se encuentran organizadas de acuerdo con la arquitectura del sistema.

| Módulo | Objetivo |
|---------|----------|
| Modelos | Validar las reglas de negocio |
| Controladores | Verificar la lógica de la aplicación |
| Servicios | Comprobar la comunicación entre componentes |
| Hooks | Validar la lógica reutilizable del frontend |
| Componentes | Verificar el comportamiento de la interfaz de usuario |

Esta organización facilita el mantenimiento del proyecto y permite localizar rápidamente las pruebas asociadas a cada módulo.

---

# Cobertura de Pruebas

El proyecto presenta los siguientes resultados de cobertura.

| Métrica | Resultado |
|----------|----------:|
| Total de pruebas | 77 |
| Archivos evaluados | 7 |
| Statements | 99.47 % |
| Functions | 100 % |
| Branches | 88.50 % |

---

# Solución de Problemas

## El comando `npm` no es reconocido

Verifique que Node.js esté instalado correctamente y que la variable de entorno `PATH` incluya la instalación de Node.js.

---

## No se encuentran las dependencias

Ejecute nuevamente:

```bash
npm install
```

---

## Algunas pruebas fallan

Compruebe que:

- Todas las dependencias fueron instaladas correctamente.
- Se está ejecutando el comando desde la carpeta correcta (`frontend` o `backend`).
- La versión de Node.js sea compatible con el proyecto.

---

# Flujo General

```text
1. Instalar Node.js

        │

        ▼

2. Instalar dependencias

        │

        ▼

3. Ejecutar las pruebas

        │

        ▼

4. Revisar los resultados

        │

        ▼

5. Generar el reporte de cobertura (opcional)
```