# Validación de Entrada del Servidor - Notification Service

**Fecha:** 23 de noviembre de 2025
**Versión:** 1.0.0

---

## 2. Validación del lado del servidor

### Validación de autenticidad

#### **Validación de Token JWT en Rutas REST**

**Ubicación:** `src/middlewares/auth.middleware.ts` (líneas 15-40)

**Código:**
```typescript
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { userService } from '../services/user.service';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación no proporcionado.' });
  }

  const token = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    
    // Verificación de existencia y estado del usuario
    const user = await userService.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario no válido o inactivo.' });
    }

    req.user = { id: decoded.userId, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expirado.' });
    }
    return res.status(403).json({ message: 'Token inválido.' });
  }
};
```

**Descripción:**
Se utiliza un middleware de Express.js para proteger las rutas REST. Este middleware extrae el token JWT del encabezado `Authorization`.

1.  **Verificación de Firma:** La librería `jsonwebtoken` con el método `jwt.verify()` valida la firma del token usando el secreto (`JWT_SECRET`) almacenado en las variables de entorno. Esto previene la manipulación del token (Tinkering).
2.  **Validación de Expiración:** `jwt.verify()` también valida automáticamente la fecha de expiración (`exp`) del token. Si el token ha expirado, se lanza un `TokenExpiredError` que es capturado y manejado.
3.  **Existencia y Estado del Usuario:** Después de decodificar el token, se realiza una consulta a la base de datos para asegurar que el `userId` del payload exista y que el usuario esté activo. Esto previene que tokens de usuarios eliminados o desactivados sigan siendo válidos.
4.  **Autenticación entre Microservicios:** ❌ **NO IMPLEMENTADO**. Las llamadas internas entre servicios no utilizan un método de autenticación estandarizado, lo que podría permitir a un servicio comprometido realizar acciones no autorizadas en otros.
    *   **Sugerencia:** Implementar un token de servicio a servicio (Service-to-Service token) con un scope limitado, o usar mTLS (Mutual TLS) para asegurar la comunicación a nivel de red.

---

### Validación de consistencia

#### **Validación de Existencia del Destinatario**

**Ubicación:** `src/services/notification.service.ts` (líneas 55-62)

**Código:**
```typescript
// Dentro del método de envío de notificaciones
public async sendNotification(data: NotificationData): Promise<void> {
  const recipientExists = await this.userRepository.exists(data.recipientId);
  if (!recipientExists) {
    throw new Error(`El usuario destinatario con ID ${data.recipientId} no existe.`);
  }
  // ... resto de la lógica
}
```

**Descripción:**
Antes de encolar una notificación para su envío, el servicio verifica en la base de datos (a través de un repositorio de usuarios) que el `recipientId` corresponde a un usuario existente. Esto previene el envío de notificaciones a usuarios inexistentes y la acumulación de trabajos fallidos en la cola.

---

#### **Validación de Plantilla de Notificación**

**Ubicación:** `src/services/notification.service.ts` (líneas 70-77)

**Código:**
```typescript
// Dentro del método de envío usando una plantilla
public async sendTemplatedNotification(data: TemplatedNotificationData): Promise<void> {
  const template = await this.templateRepository.findById(data.templateId);
  if (!template) {
    throw new Error(`La plantilla con ID ${data.templateId} no existe.`);
  }
  // ... resto de la lógica
}
```

**Descripción:**
Cuando se solicita el envío de una notificación basada en una plantilla, el servicio primero consulta la base de datos para confirmar que el `templateId` proporcionado es válido y existe. Esto asegura la integridad referencial y previene errores al intentar renderizar una plantilla inexistente.

---

### Validación de integridad

#### **Verificación de Integridad de Payloads**

**Ubicación:** ❌ **NO IMPLEMENTADO**

**Código:**
```typescript
// Sugerencia para workers de colas (RabbitMQ/Kafka)
import * as crypto from 'crypto';

// Al producir el mensaje
const payload = { /* ... */ };
const hash = crypto.createHmac('sha256', process.env.PAYLOAD_SECRET).update(JSON.stringify(payload)).digest('hex');
const message = { payload, hash };
queue.send(message);

// Al consumir el mensaje
const receivedMessage = queue.receive();
const expectedHash = crypto.createHmac('sha256', process.env.PAYLOAD_SECRET).update(JSON.stringify(receivedMessage.payload)).digest('hex');

if (receivedMessage.hash !== expectedHash) {
  // El payload ha sido alterado, descartar o mover a dead-letter queue
  console.error('Error de integridad de payload!');
  return;
}
```

**Descripción:**
Actualmente, no se verifica la integridad de los payloads de notificaciones durante su tránsito, especialmente en el sistema de colas. Un atacante con acceso a la cola podría manipular el contenido de una notificación antes de que sea procesada por un worker. Se sugiere implementar un HMAC (Hash-based Message Authentication Code) para cada mensaje encolado. El worker receptor recalcularía el hash y lo compararía con el recibido para asegurar que el payload no ha sido alterado.

---

### Validación de permisos

#### **Definición de Roles y Permisos**

**Ubicación:** `src/middlewares/authorization.middleware.ts` (líneas 10-25)

**Código:**
```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (userRole !== requiredRole && userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Permisos insuficientes.' });
    }
    next();
  };
};

// Uso en rutas:
// router.post('/bulk', authenticateJWT, requireRole(UserRole.ADMIN), notificationController.sendBulk);
```

**Descripción:**
El sistema define roles básicos (`USER`, `ADMIN`, `SYSTEM`). Se utiliza un middleware `requireRole` para proteger endpoints específicos. Por ejemplo, el endpoint de envío masivo (`/api/notifications/bulk`) requiere que el usuario autenticado tenga el rol `ADMIN`. Esto previene que usuarios regulares realicen acciones privilegiadas. La validación de que solo el sistema pueda enviar ciertos tipos de notificaciones (ej. "bienvenida") se maneja a nivel de lógica de negocio, no de middleware.

---

## 3. Validación de tipo

### **Validación de Entradas en Endpoints**

**Ubicación:** `src/routes/notification.routes.ts` (líneas 25-50)

**Código:**
```typescript
import { body, param } from 'express-validator';

// Ejemplo para POST /api/notifications/send
router.post(
  '/send',
  authenticateJWT,
  [
    body('recipientId').isUUID(4).withMessage('El ID de destinatario debe ser un UUID válido.'),
    body('type').isIn(['email', 'push', 'sms', 'in_app']).withMessage('Tipo de notificación no válido.'),
    body('payload.title').isString().isLength({ min: 1, max: 100 }).withMessage('El título es inválido.'),
    body('priority').optional().isInt({ min: 1, max: 5 }).withMessage('La prioridad debe ser un número entre 1 y 5.'),
  ],
  validationMiddleware, // Middleware que maneja los errores de express-validator
  notificationController.send
);

// Ejemplo para GET /api/notifications/user/:userId
router.get(
  '/user/:userId',
  authenticateJWT,
  [
    param('userId').isUUID(4).withMessage('El ID de usuario debe ser un UUID válido.'),
  ],
  validationMiddleware,
  notificationController.getUserNotifications
);
```

**Descripción:**
Se utiliza la librería `express-validator` para validar y sanitizar los datos de entrada en las rutas de la API.

-   **UUIDs (`recipientId`, `userId`):** Se valida que sean UUIDs en formato v4 usando `isUUID(4)`.
-   **Tipos de Notificación:** Se usa `isIn([...])` para asegurar que el campo `type` sea uno de los valores permitidos (`email`, `push`, `sms`, `in_app`).
-   **Campos Numéricos y Booleanos:** Se usan `isInt()` y `isBoolean()` para validar los tipos de datos de campos como `priority` o `is_read`.
-   **Formato de Objetos JSON:** La estructura de `payload` se valida campo por campo, asegurando que `title` sea un string con una longitud específica, por ejemplo.
-   **Timestamps:** ❌ **NO IMPLEMENTADO**. No se está validando el formato de los timestamps como `scheduled_at`.
    *   **Sugerencia:** Añadir `body('scheduled_at').optional().isISO8601().toDate().withMessage('El formato de fecha debe ser ISO8601.')` para asegurar un formato de fecha consistente.

---

## 4. Validación de lógica de negocio

### **Respeto a Preferencias de Usuario**

**Ubicación:** `src/services/notification.service.ts` (líneas 110-125)

**Código:**
```typescript
public async sendNotification(data: NotificationData): Promise<void> {
  // ... validaciones previas
  const userPreferences = await this.preferencesRepository.findByUserId(data.recipientId);

  if (!userPreferences.channels[data.channel].enabled) {
    console.log(`Notificación no enviada al usuario ${data.recipientId} por preferencias deshabilitadas.`);
    return; // No se envía la notificación
  }

  if (userPreferences.doNotDisturb.enabled) {
    // Lógica para no molestar (ver validación contextual)
  }
  
  // ... encolar la notificación
}
```

**Descripción:**
Antes de enviar cualquier notificación, el servicio consulta las preferencias del usuario. Si el usuario ha deshabilitado un canal específico (por ejemplo, `email`), la notificación para ese canal no se encola, respetando así su configuración de privacidad.

---

### **Límites de Tasa (Rate Limiting)**

**Ubicación:** `src/app.ts` (líneas 45-60)

**Código:**
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 peticiones por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo en 15 minutos.',
});

app.use('/api/', apiLimiter);
```

**Descripción:**
Se ha implementado un rate limiting global para toda la API usando `express-rate-limit`. Esto limita el número de peticiones que una misma IP puede realizar en un intervalo de tiempo, previniendo ataques de fuerza bruta o de denegación de servicio (DoS) básicos.

-   **Límites por usuario/tipo de notificación:** ❌ **NO IMPLEMENTADO**. El rate limiting actual es por IP, no por usuario. Un atacante con múltiples IPs podría seguir abusando del sistema.
    *   **Sugerencia:** Implementar un middleware de rate limiting más granular que use el `userId` del token JWT para aplicar límites por usuario, y posiblemente límites diferentes para endpoints críticos como `/send`.

---

## Resumen de Hallazgos

### Implementado ✅
-   Validación de token JWT (firma, expiración).
-   Verificación de existencia y estado del usuario en la autenticación.
-   Validación de consistencia referencial (existencia de usuarios y plantillas).
-   Protección de rutas basada en roles (Admin vs. User).
-   Validación de tipos de datos básicos (UUID, enums, números) en endpoints usando `express-validator`.
-   Respeto a las preferencias de notificación del usuario (opt-out por canal).
-   Rate limiting global por IP.
-   Manejo de errores centralizado que oculta detalles sensibles.
-   Uso de Helmet para cabeceras de seguridad.

### No Implementado ❌
-   **Crítico:** Sanitización de HTML en contenidos de notificaciones (Riesgo de XSS).
-   **Alto:** Autenticación para la comunicación entre microservicios.
-   **Alto:** Validación de integridad de payloads en el sistema de colas (HMAC).
-   **Medio:** Rate limiting por usuario en lugar de solo por IP.
-   **Medio:** Validación de formato de números de teléfono para SMS.
-   **Medio:** Validación de formato de timestamps.
-   **Bajo:** Validación de dominios de email y listas de emails desechables.
-   **Bajo:** Actualización de dependencias con vulnerabilidades moderadas.

### No Aplicable ⚠️
-   **Whitelist de caracteres:** Inviable para una aplicación social con soporte multi-idioma y emojis.
-   **Normalización de rutas (Path Normalization):** El servicio no maneja rutas de sistema de archivos provenientes del usuario.
-   **Codificación Base64:** El servicio no procesa ni adjunta archivos binarios.

---

## Recomendaciones Prioritarias

1.  **Crítico:** Implementar sanitización de HTML para todo el contenido generado por el usuario que se inserte en plantillas de email o notificaciones in-app. Utilizar una librería robusta como `DOMPurify` para mitigar el riesgo de XSS.
2.  **Alto:** Establecer un mecanismo de autenticación para la comunicación entre servicios (por ejemplo, JWT de servicio a servicio con scopes limitados) para prevenir el acceso no autorizado entre componentes del sistema.
3.  **Alto:** Implementar rate limiting por usuario para los endpoints de envío de notificaciones. Esto proporcionará una defensa más efectiva contra el abuso y el spam que el actual rate limiting por IP.
4.  **Medio:** Añadir validación de formato para números de teléfono usando `libphonenumber-js` antes de encolar trabajos para el envío de SMS. Esto reducirá costos y errores con el proveedor externo (Twilio).