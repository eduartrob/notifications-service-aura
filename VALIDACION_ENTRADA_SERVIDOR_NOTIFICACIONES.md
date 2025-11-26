# Validación de Entrada del Servidor - Notification Service

**Fecha:** 24 de Noviembre de 2024
**Versión:** 1.0.0

---

## 2. Validación del lado del servidor

### Validación de autenticidad

**Ubicación:** `src/infraestructure/routes/notification_router.ts`

**Código:**
```typescript
const router = Router();
// Definimos la ruta POST /notify
router.post("/notify", notificationController.run);
```

**Descripción:**
❌ **NO IMPLEMENTADO**. El endpoint `/notify` es público y no tiene ningún middleware de autenticación (JWT, API Key, etc.). Cualquier cliente que pueda alcanzar el puerto del servicio puede enviar notificaciones. Aunque `jsonwebtoken` está en `package.json`, no se usa en las rutas de este servicio.

### Validación de consistencia

**Ubicación:** `src/infraestructure/controllers/notification_controller.ts`

**Código:**
```typescript
const { userId, type, title, body, metadata } = req.body;
await this.sendNotificationUseCase.execute(userId, type, title, body, metadata || {});
```

**Descripción:**
❌ **NO IMPLEMENTADO**. No se valida si el `userId` existe en la base de datos de usuarios (microservicio de Auth/Users). No se valida si el `type` de notificación es coherente con los datos proporcionados (ej: si es EMAIL, que haya un email destinatario).

### Validación de integridad

**Ubicación:** `src/infraestructure/transport/queue/rabbitmq_consumer.ts`

**Código:**
```typescript
const content = JSON.parse(message.content.toString());
```

**Descripción:**
❌ **NO IMPLEMENTADO**. Se asume que el mensaje de RabbitMQ es un JSON válido y confiable. No hay firmas digitales ni checksums para verificar que el mensaje no fue alterado en tránsito o en la cola.

### Validación de permisos

**Ubicación:** `src/application/send_notification_usecase.ts`

**Código:**
```typescript
// No hay lógica de permisos
async execute(...) { ... }
```

**Descripción:**
❌ **NO IMPLEMENTADO**. No hay verificación de roles. Cualquier petición que llegue al controlador o evento que llegue a la cola se procesa, independientemente de quién lo haya originado.

---

## 3. Validación de Tipo

### Validación de Endpoints

**Ubicación:** `src/infraestructure/controllers/notification_controller.ts`

**Código:**
```typescript
const { userId, type, title, body, metadata } = req.body;
```

**Descripción:**
✅ **IMPLEMENTADO**. Se utiliza `express-validator` en el router para validar estrictamente:
- `userId`: String no vacío.
- `type`: Debe ser uno de `['PUSH', 'SMS', 'EMAIL', 'INTERNAL']`.
- `title`: String no vacío, con trim y escape.
- `body`: String no vacío, con trim.
- `metadata`: Objeto opcional.

**Librería usada:** `express-validator`.

---

## 4. Validación de Lógica de Negocio

### Reglas de Negocio

**Ubicación:** `src/application/send_notification_usecase.ts`

**Código:**
```typescript
// 1. Crear la entidad
const notification = new Notification(...)
// 3. Enviar la notificación
await this.sender.send(notification);
```

**Descripción:**
❌ **NO IMPLEMENTADO**.
- No se valida si el usuario tiene las notificaciones deshabilitadas.
- ✅ **IMPLEMENTADO**: Rate limiting por IP (100 req/15min) usando `express-rate-limit`.
- No se valida el tamaño del payload.
- No se valida si el usuario está activo o bloqueado.

---

## 5. Validación de Patrones y Reglas Específicas

### Direcciones de correo electrónico

**Ubicación:** `src/infraestructure/adapters/notifcation_manager.ts`

**Código:**
```typescript
const recipientEmail = notification.metadata?.recipientEmail;
if (!recipientEmail) { ... }
```

**Descripción:**
⚠️ **PARCIALMENTE IMPLEMENTADO**. Se verifica que exista el campo `recipientEmail`, pero **no se valida su formato** antes de intentar enviar. Se confía en que el `metadata` trae un email válido. `nodemailer` fallará si el email es inválido, pero debería validarse antes.

### Números de teléfono

**Ubicación:** `src/infraestructure/adapters/notifcation_manager.ts`

**Código:**
```typescript
case 'SMS':
  // Aquí llamarías a Twilio
```

**Descripción:**
❌ **NO IMPLEMENTADO**. El código actual es un placeholder, pero no hay validación de formato E.164 para números de teléfono.

---

## 6. Validación Cruzada

**Ubicación:** `src/infraestructure/adapters/notifcation_manager.ts`

**Descripción:**
❌ **NO IMPLEMENTADO**.
- No se valida que si `type === 'EMAIL'`, el `metadata` contenga `recipientEmail`.
- No se valida que si `type === 'SMS'`, el `metadata` contenga `phoneNumber`.
- Actualmente, si falta el email, solo se loguea un error, pero el sistema permitió llegar hasta el adaptador.

---

## 7. Validación Contextual

**Descripción:**
❌ **NO IMPLEMENTADO**.
- No hay validación de horarios (ej: no enviar Push a las 3 AM).
- No hay validación de disponibilidad de servicios externos antes de intentar enviar.

---

## 8. Sanitización de Entrada

### a. Escapado de Caracteres (HTML/JS)

**Ubicación:** `src/servicies/emailService.ts`

**Código:**
```typescript
html: `
  <h2>Restablecer tu contraseña</h2>
  ...
  <a href="${link}">Restablecer Contraseña</a>
`
```

**Descripción:**
✅ **IMPLEMENTADO**. Se utiliza la librería `xss` para sanitizar el link antes de inyectarlo en la plantilla HTML.
**Código:** `const cleanLink = xss(link);`

### b. Filtrado de Entradas (Whitelisting/Blacklisting)

**Descripción:**
❌ **NO IMPLEMENTADO**. No hay filtros para caracteres peligrosos en `title` o `body` de las notificaciones.

### c. Validación de Tipo de Datos

**Ubicación:** `src/domain/notification_entity.ts`

**Código:**
```typescript
export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    ...
  ) {}
}
```

**Descripción:**
⚠️ **PARCIALMENTE IMPLEMENTADO**. TypeScript ayuda en tiempo de compilación, pero en tiempo de ejecución (runtime), los datos que vienen de `req.body` (any) no se validan, por lo que se pueden instanciar objetos `Notification` con tipos incorrectos.

### d. Limpieza de Entradas (Trim/Normalize)

**Descripción:**
❌ **NO IMPLEMENTADO**. No se hace `trim()` de los inputs. Espacios accidentales en emails (`" test@gmail.com "`) causarán fallos de envío.

### f. Uso de Funciones y Librerías Seguras

**Librerías de Seguridad:**
✅ **IMPLEMENTADAS**:
- `helmet`: Cabeceras de seguridad HTTP.
- `express-rate-limit`: Protección contra fuerza bruta/DoS (100 req/15min).
- `express-validator`: Validación de entrada estricta.
- `xss`: Sanitización de inputs HTML.

---

## 9. Uso de Librerías y Frameworks de Validación

**Descripción:**
❌ **NO IMPLEMENTADO**. El proyecto no cuenta con ninguna librería dedicada a la validación de datos de entrada. Depende puramente de la confianza en el cliente y en el tipado estático de TypeScript (que desaparece en runtime).

---

## 10. Educación y Capacitación del Equipo

**Descripción:**
❌ **NO IMPLEMENTADO**. No hay evidencia de documentación de seguridad o guías de contribución segura en el repositorio.

---

## 11. Gestión de Errores Adecuada

**Ubicación:** `src/infraestructure/controllers/notification_controller.ts`

**Código:**
```typescript
} catch (error) {
  console.error(error);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
}
```

**Descripción:**
⚠️ **PARCIALMENTE IMPLEMENTADO**. Se captura el error y se devuelve un 500 genérico (bueno para seguridad), pero se hace `console.error(error)` que podría imprimir información sensible (credenciales, datos de usuario) en los logs de producción.

---

## Resumen de Hallazgos

### Implementado ✅
- Tipado estático con TypeScript.
- Manejo de errores genérico en controlador.
- Uso de variables de entorno (`dotenv`).
- **Validación de Esquema** (`express-validator`).
- **Sanitización XSS** (`xss`).
- **Rate Limiting** (`express-rate-limit`).
- **Cabeceras de Seguridad** (`helmet`).

### No Implementado ❌
- **Autenticación y Autorización** en endpoints API (Pendiente JWT).
- **Validación de Negocio** (existencia de usuario, preferencias).

### No Aplicable ⚠️
- SQL Escaping (se usa Mongoose/MongoDB, aunque se debe cuidar NoSQL Injection).

---

## Recomendaciones Prioritarias

1.  **Crítico:** Implementar **Middleware de Autenticación** (JWT) en `notification_router.ts` para proteger el endpoint `/notify`.
2.  **Crítico:** Implementar **Validación de Esquema** (usando `zod` o `express-validator`) en el controlador para asegurar que `userId`, `type`, `title`, etc., sean válidos y seguros.
3.  **Alto:** Implementar **Sanitización** en `emailService.ts` para evitar inyección de HTML en los correos.
4.  **Alto:** Agregar **Rate Limiting** con `express-rate-limit`.
5.  **Medio:** Implementar validación de formato de email y teléfono antes de llamar a los proveedores.