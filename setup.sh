#!/bin/bash

# 🚀 Script de Configuración Automática - Servicio de Notificaciones
# Este script configura PostgreSQL y ejecuta las migraciones de Prisma

set -e  # Salir si hay algún error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Setup del Servicio de Notificaciones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ===== CONFIGURACIÓN =====
DB_CONTAINER_NAME="notifications-postgres"
DB_USER="notifications_user"
DB_PASSWORD="notifications_pass"
DB_NAME="notifications_db"
DB_PORT="5433"
POSTGRES_VERSION="15"

# ===== 1. VERIFICAR DOCKER =====
echo "📋 [1/5] Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi
echo "✅ Docker está instalado"
echo ""

# ===== 2. VERIFICAR SI EL CONTENEDOR YA EXISTE =====
echo "🔍 [2/5] Verificando contenedor PostgreSQL..."
if [ "$(sudo docker ps -aq -f name=^${DB_CONTAINER_NAME}$)" ]; then
    echo "⚠️  El contenedor '${DB_CONTAINER_NAME}' ya existe."
    read -p "¿Deseas eliminarlo y crear uno nuevo? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🗑️  Eliminando contenedor existente..."
        sudo docker rm -f ${DB_CONTAINER_NAME}
        echo "✅ Contenedor eliminado"
    else
        echo "ℹ️  Usando contenedor existente"
    fi
fi
echo ""

# ===== 3. CREAR Y EJECUTAR CONTENEDOR POSTGRESQL =====
if [ ! "$(sudo docker ps -q -f name=^${DB_CONTAINER_NAME}$)" ]; then
    echo "🐘 [3/5] Creando contenedor PostgreSQL..."
    sudo docker run --name ${DB_CONTAINER_NAME} \
      -e POSTGRES_USER=${DB_USER} \
      -e POSTGRES_PASSWORD=${DB_PASSWORD} \
      -e POSTGRES_DB=${DB_NAME} \
      -p ${DB_PORT}:5432 \
      -d postgres:${POSTGRES_VERSION}
    
    echo "✅ Contenedor PostgreSQL creado y ejecutándose"
    echo "   📍 Host: localhost"
    echo "   🔌 Puerto: ${DB_PORT}"
    echo "   🗄️  Base de datos: ${DB_NAME}"
    echo "   👤 Usuario: ${DB_USER}"
    echo ""
    
    # Esperar a que PostgreSQL esté listo
    echo "⏳ Esperando a que PostgreSQL esté listo..."
    sleep 5
    
    # Verificar conexión
    max_attempts=30
    attempt=0
    until sudo docker exec ${DB_CONTAINER_NAME} pg_isready -U ${DB_USER} > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
        attempt=$((attempt + 1))
        echo "   Intento ${attempt}/${max_attempts}..."
        sleep 1
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ PostgreSQL no respondió a tiempo"
        exit 1
    fi
    
    echo "✅ PostgreSQL está listo"
else
    echo "✅ [3/5] Contenedor PostgreSQL ya está ejecutándose"
fi
echo ""

# ===== 4. ACTUALIZAR/VERIFICAR .env =====
echo "📝 [4/5] Configurando variables de entorno..."
ENV_FILE=".env"

# Construir DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public"

if [ -f "$ENV_FILE" ]; then
    # Si .env existe, verificar o actualizar DATABASE_URL
    if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        echo "⚠️  DATABASE_URL ya existe en .env"
        read -p "¿Deseas actualizarlo? (s/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            # Usar sed de forma compatible con macOS y Linux
            sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$ENV_FILE"
            rm -f "${ENV_FILE}.bak"
            echo "✅ DATABASE_URL actualizado en .env"
        fi
    else
        echo "DATABASE_URL=\"${DATABASE_URL}\"" >> "$ENV_FILE"
        echo "✅ DATABASE_URL agregado a .env"
    fi
else
    echo "⚠️  Archivo .env no encontrado"
    if [ -f ".env.example" ]; then
        echo "📄 Copiando desde .env.example..."
        cp .env.example .env
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$ENV_FILE"
        rm -f "${ENV_FILE}.bak"
        echo "✅ Archivo .env creado y configurado"
    else
        echo "❌ No se encontró .env.example. Por favor crea el archivo .env manualmente."
        exit 1
    fi
fi
echo ""

# ===== 5. EJECUTAR MIGRACIONES DE PRISMA =====
echo "🗄️  [5/5] Ejecutando migraciones de Prisma..."
echo ""

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias primero..."
    npm install
    echo ""
fi

# Generar Prisma Client
echo "⚙️  Generando Prisma Client..."
npx prisma generate
echo ""

# Ejecutar migraciones
echo "🚀 Ejecutando migraciones..."
npx prisma migrate dev --name init_fcm_tokens
echo ""

# ===== RESUMEN =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ¡Configuración completada exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Información de la base de datos:"
echo "   🐘 Contenedor: ${DB_CONTAINER_NAME}"
echo "   🗄️  Base de datos: ${DB_NAME}"
echo "   👤 Usuario: ${DB_USER}"
echo "   🔌 Puerto: ${DB_PORT}"
echo "   🔗 URL: ${DATABASE_URL}"
echo ""
echo "🎯 Próximos pasos:"
echo "   1. El servicio de notificaciones ya puede ejecutarse"
echo "   2. Asegúrate de que auth-service envíe 'fcmToken' en los eventos"
echo "   3. Inicia el servicio: npm run dev"
echo ""
echo "🔧 Comandos útiles:"
echo "   Ver base de datos:        npx prisma studio"
echo "   Detener PostgreSQL:       docker stop ${DB_CONTAINER_NAME}"
echo "   Iniciar PostgreSQL:       docker start ${DB_CONTAINER_NAME}"
echo "   Ver logs PostgreSQL:      docker logs ${DB_CONTAINER_NAME}"
echo "   Eliminar contenedor:      docker rm -f ${DB_CONTAINER_NAME}"
echo ""
