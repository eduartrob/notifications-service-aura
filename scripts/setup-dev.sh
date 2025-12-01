#!/bin/bash

# ============================================================================
# Script de Configuración de Entorno de Desarrollo para Notifications Service
# ============================================================================

set -e

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Iniciando configuración de desarrollo para Notifications Service...${NC}"

# Directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$SERVICE_DIR"

# --- 1. Verificación de Requisitos ---
echo -e "\n--- 🔎 ${BLUE}Verificando requisitos del sistema...${NC} ---"

command_exists() {
    command -v "$1" &> /dev/null
}

if ! command_exists node; then
    echo -e "${RED}❌ Node.js no encontrado.${NC}"
    exit 1
fi

if ! command_exists psql; then
    echo -e "${RED}❌ PostgreSQL no encontrado.${NC}"
    exit 1
fi

# --- 2. Configuración de .env ---
echo -e "\n--- 📝 ${BLUE}Configurando variables de entorno (.env)...${NC} ---"

if [ ! -f .env ]; then
    echo "Creando .env desde plantilla..."
    cat > .env << EOF
PORT=3004
# Notifications Service Database
DB_USER=notifications_user
DB_PASSWORD=notifications_pass
DB_NAME=notifications_db
# RabbitMQ
RABBITMQ_URL=amqp://admin:admin@localhost:5672
# Firebase (Placeholder - Requires actual file)
GOOGLE_APPLICATION_CREDENTIALS=./src/config/aura-firebase-adminsdk.json
EOF
    echo -e "${GREEN}✅ Archivo .env creado.${NC}"
else
    echo -e "${GREEN}✅ Archivo .env ya existe.${NC}"
fi

export $(grep -v '^#' .env | xargs)

# Construir DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"

if grep -q "^DATABASE_URL=" .env; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
else
    echo "DATABASE_URL=${DATABASE_URL}" >> .env
fi

# --- 3. Configuración de Base de Datos ---
echo -e "\n--- 🐘 ${BLUE}Configurando PostgreSQL...${NC} ---"

sudo -u postgres psql << EOF
-- Crear usuario
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
   ELSE
      ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$do\$;

-- Crear DB
SELECT 'CREATE DATABASE ${DB_NAME}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Permisos
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo "Configurando permisos de esquema..."
sudo -u postgres psql -d "$DB_NAME" << EOF
GRANT ALL PRIVILEGES ON SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOF

# --- 4. Instalación de Dependencias ---
echo -e "\n--- 📦 ${BLUE}Instalando dependencias...${NC} ---"
npm install

# --- 5. Migraciones ---
echo -e "\n--- 🚀 ${BLUE}Ejecutando migraciones...${NC} ---"
npx prisma generate
# Intentar ejecutar migraciones, pero no fallar si ya existen o hay conflictos menores en dev
npx prisma migrate deploy || echo -e "${YELLOW}⚠️ Advertencia al desplegar migraciones. Verifica si ya están aplicadas.${NC}"

echo -e "\n\n🎉 ${GREEN}¡Configuración completada!${NC} 🎉"
echo -e "Inicia con: ${YELLOW}npm run dev${NC}"
