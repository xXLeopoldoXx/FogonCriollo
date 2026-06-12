# ============================================================
#  El Fogón Criollo — Makefile
#  Comandos rápidos para desarrollo y despliegue
# ============================================================

.PHONY: help up down restart logs shell-backend shell-db migrate seed tools serve-lan status clean

# ── Variables ─────────────────────────────────────────────
COMPOSE = docker compose
BACKEND = fogon_backend
DB = fogon_postgres

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Ciclo de vida ─────────────────────────────────────────
up: ## Inicia todos los servicios
	$(COMPOSE) up -d
	@echo "\n\033[32m✓ Sistema iniciado\033[0m"
	@echo "\033[36m  → App:     http://localhost\033[0m"
	@echo "\033[36m  → API:     http://localhost/api\033[0m"
	@echo "\033[36m  → Health:  http://localhost/health\033[0m"

down: ## Detiene todos los servicios
	$(COMPOSE) down

restart: ## Reinicia todos los servicios
	$(COMPOSE) restart

logs: ## Muestra logs en tiempo real
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Logs solo del backend
	$(COMPOSE) logs -f backend --tail=200

status: ## Estado de todos los contenedores
	$(COMPOSE) ps

# ── Base de datos ─────────────────────────────────────────
migrate: ## Ejecuta migraciones SQL automáticamente
	@echo "Ejecutando migraciones..."
	$(COMPOSE) exec $(DB) sh -c "PGPASSWORD=\$${POSTGRES_PASSWORD:-root} psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/01_schema.sql"
	$(COMPOSE) exec $(DB) sh -c "PGPASSWORD=\$${POSTGRES_PASSWORD:-root} psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/02_extras.sql"
	@echo "\033[32m✓ Migraciones completadas\033[0m"

seed: ## Carga datos de prueba automáticamente
	@echo "Cargando datos de prueba..."
	$(COMPOSE) exec $(DB) sh -c "PGPASSWORD=\$${POSTGRES_PASSWORD:-root} psql -U postgres -d fogon_criollo -f /docker-entrypoint-initdb.d/03_seed.sql"
	@echo "\033[32m✓ Datos cargados\033[0m"

db-reset: ## PELIGRO: Borra y recrea la BD
	@read -p "¿Seguro? Esto borra todos los datos [y/N]: " ans && [ $${ans:-N} = y ]
	$(COMPOSE) exec $(DB) sh -c "PGPASSWORD=\$${POSTGRES_PASSWORD:-root} psql -U postgres -c 'DROP DATABASE IF EXISTS fogon_criollo;'"
	$(COMPOSE) exec $(DB) sh -c "PGPASSWORD=\$${POSTGRES_PASSWORD:-root} psql -U postgres -c 'CREATE DATABASE fogon_criollo;'"
	$(MAKE) migrate
	$(MAKE) seed

shell-backend: ## Abre shell en el backend usando el servicio
	$(COMPOSE) exec backend sh

shell-db: ## Abre psql en PostgreSQL automáticamente
	$(COMPOSE) exec $(DB) sh -c "PGPASSWORD=\$${POSTGRES_PASSWORD:-root} psql -U postgres -d fogon_criollo"

# ── Herramientas opcionales ───────────────────────────────
tools: ## Inicia pgAdmin + Redis Commander
	$(COMPOSE) --profile tools up -d pgadmin redis-commander
	@echo "\n\033[32m✓ Herramientas disponibles\033[0m"
	@echo "\033[36m  → pgAdmin:          http://localhost:5050\033[0m"
	@echo "\033[36m  → Redis Commander:  http://localhost:8081\033[0m"

# ── Acceso LAN ────────────────────────────────────────────
serve-lan: ## Muestra IP y QR para acceso desde red local
	@echo "\n\033[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@echo "\033[33m  El Fogón Criollo — Acceso en red\033[0m"
	@echo "\033[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@LAN_IP=$$(ip route get 1 2>/dev/null | awk '{print $$7; exit}' || ifconfig en0 2>/dev/null | grep 'inet ' | awk '{print $$2}' || echo "127.0.0.1"); \
	echo "\n\033[32m  → Mesero / Cocina:  http://$$LAN_IP\033[0m"; \
	echo "\033[32m  → Admin:            http://$$LAN_IP/admin\033[0m"; \
	echo "\033[32m  → Cliente:          http://$$LAN_IP/cliente\033[0m"; \
	echo "\n  Comparte este link con los dispositivos de tu red WiFi"; \
	echo "\n  Generando QR code...\n"; \
	command -v qrencode >/dev/null 2>&1 && qrencode -t ANSI "http://$$LAN_IP" || \
	echo "  (instala qrencode para ver el QR: brew install qrencode | apt install qrencode)"

# ── Limpieza ──────────────────────────────────────────────
clean: ## Elimina imágenes y volúmenes no usados
	$(COMPOSE) down --volumes --remove-orphans
	docker image prune -f

rebuild: ## Reconstruye todas las imágenes
	$(COMPOSE) build --no-cache
	$(MAKE) up
