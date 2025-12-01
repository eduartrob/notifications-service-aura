# Servicio de Notificaciones - Aura

Sistema de notificaciones multicanal (Email, Push, SMS) con gestión de tokens FCM para notificaciones push en tiempo real.

### 1. Configuración de Desarrollo (Recomendado)

El script `setup-dev.sh` automatiza toda la configuración para el entorno de desarrollo local.

Dar permisos de ejecución al script:

```bash
chmod +x scripts/setup-dev.sh
```

Ejecutar el script:

```bash
./scripts/setup-dev.sh
```

Este script se encargará de:

-   Verificar requisitos (Node.js, PostgreSQL).
-   Generar el archivo `.env`.
-   Crear el usuario y la base de datos `notifications_db`.
-   Instalar las dependencias del proyecto.
-   Aplicar las migraciones de Prisma.

### 2. Variables de Entorno

Copia `.env.example` a `.env` y actualiza:

```bash
cp .env.example .env
```

Configura `DATABASE_URL`:
```
DATABASE_URL="postgresql://notifications_user:notifications_pass@localhost:5433/notifications_db?schema=public"
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Ejecutar Migraciones

```bash
npx prisma generate
npx prisma migrate dev --name init_fcm_tokens
```

## 🎯 Uso

### Iniciar el Servicio

```bash
npm run dev
```

### Ver Base de Datos

```bash
npx prisma studio
```

## 🏗️ Arquitectura

```
src/
├── domain/                    # Entidades y puertos
│   ├── notification_entity.ts
│   ├── user_device_entity.ts
│   └── device_repository_port.ts
├── application/              # Casos de uso
│   ├── send_notification_usecase.ts
│   ├── add_device_token_usecase.ts
│   └── remove_device_token_usecase.ts
├── infraestructure/          # Implementaciones
│   ├── adapters/            # Adaptadores de salida
│   ├── repositories/        # Acceso a datos
│   ├── transport/           # RabbitMQ consumer
│   └── dependencies.ts      # Inyección de dependencias
└── servicies/               # Servicios externos
    ├── emailService.ts      # Templates de email
    └── FirebaseNotificationService.ts  # FCM
```

## 📨 Eventos Soportados

### Auth Service
- `USER_REGISTERED` - Envía email de bienvenida y notifica admin
- `USER_LOGGED_IN` - Guarda FCM token y envía alerta de seguridad
- `USER_LOGGED_OUT` - Elimina FCM token
- `PASSWORD_RECOVERY_REQUESTED` - Envía email con link de recuperación

### Social Service
- `PUBLICATION_LIKED` - Notifica al autor
- `COMMENT_ADDED` - Notifica al autor
- `USER_FOLLOWED` - Notifica al usuario seguido

## 🔥 Características

- ✅ **Multi-canal**: Email, Push (FCM), SMS (preparado)
- ✅ **Templates dinámicos**: Emails personalizados por tipo
- ✅ **Multi-dispositivo**: Soporte para múltiples tokens FCM por usuario
- ✅ **Gestión automática**: Limpieza de tokens inválidos
- ✅ **Event-driven**: Integración completa con RabbitMQ
- ✅ **Clean Architecture**: Separación de capas y responsabilidades

## 🗄️ Modelo de Datos

### UserDevice
```prisma
model UserDevice {
  id         String   @id @default(uuid())
  userId     String   // ID del usuario
  fcmToken   String   @unique // Token FCM
  deviceInfo String?  // Info del dispositivo
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@index([userId])
}
```

## 🧪 Testing

```bash
# Ver logs del servicio
npm run dev

# Probar con RabbitMQ Management
# http://localhost:15672 (admin/admin)

# Ver datos en Prisma Studio
npx prisma studio
```

## 🐳 Docker - Comandos Útiles

```bash
# Iniciar PostgreSQL
docker start notifications-postgres

# Detener PostgreSQL
docker stop notifications-postgres

# Ver logs
docker logs notifications-postgres

# Eliminar contenedor
docker rm -f notifications-postgres
```

## 🔐 Seguridad y Validación

Este servicio implementa varias capas de seguridad y validación:

### Validaciones Implementadas
-   **Validación de Esquema**: Se utiliza `express-validator` para asegurar que los payloads de entrada (título, cuerpo, tipo) sean correctos.
-   **Sanitización XSS**: Se utiliza la librería `xss` para limpiar cualquier HTML malicioso en los templates de correo.
-   **Rate Limiting**: Protección contra fuerza bruta y DoS (100 peticiones/15min) usando `express-rate-limit`.
-   **Cabeceras de Seguridad**: Implementación de `helmet` para configurar cabeceras HTTP seguras.

### Áreas de Mejora (Roadmap)
-   Implementar autenticación JWT en el endpoint `/notify` (actualmente público).
-   Validar existencia de `userId` contra el servicio de usuarios.
-   Validar formato de emails y teléfonos antes de enviar.

## 📚 Dependencias Principales

- `@prisma/client` - ORM para PostgreSQL
- `firebase-admin` - SDK de Firebase para FCM
- `nodemailer` - Envío de emails
- `amqplib` - Cliente RabbitMQ
- `xss` - Sanitización de contenido

## 🤝 Contribuir

1. Crea una rama feature
2. Haz tus cambios
3. Ejecuta las pruebas
4. Crea un Pull Request

## 📄 Licencia

MIT
