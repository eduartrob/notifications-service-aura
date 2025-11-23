import { SendNotificationUseCase } from "../application/send_notification_usecase";
import { NotificationManagerAdapter } from "./adapters/notifcation_manager";
import { NotificationController } from "./controllers/notification_controller";
import { RabbitMQConsumer } from "./transport/queue/rabbitmq_consumer";
import { RabbitMQProvider } from "./providers/rabbitmq_provider";

// 1. Inicializamos los Adaptadores (Driven - Salida)
// Este sabe CÓMO enviar (FCM, Twilio, etc.)
export const notificationSender = new NotificationManagerAdapter();

// 2. Inicializamos los Casos de Uso (Application)
// Le inyectamos el sender. El caso de uso no sabe qué sender es, solo recibe la interfaz.
export const sendNotificationUseCase = new SendNotificationUseCase(notificationSender);

// 3. Inicializamos los Controladores y Consumers (Driving - Entrada)
// Estos reciben el caso de uso para ejecutar la lógica.

// Para HTTP
export const notificationController = new NotificationController(sendNotificationUseCase);

export const rabbitProvider = RabbitMQProvider.getInstance();

// Para RabbitMQ (Eventos)
export const rabbitConsumer = new RabbitMQConsumer(sendNotificationUseCase, rabbitProvider);