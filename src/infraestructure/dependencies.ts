import { SendNotificationUseCase } from "../application/send_notification_usecase";
import { AddDeviceTokenUseCase } from "../application/add_device_token_usecase";
import { RemoveDeviceTokenUseCase } from "../application/remove_device_token_usecase";
import { NotificationManagerAdapter } from "./adapters/notifcation_manager";
import { NotificationController } from "./controllers/notification_controller";
import { RabbitMQConsumer } from "./transport/queue/rabbitmq_consumer";
import { RabbitMQProvider } from "./providers/rabbitmq_provider";
import { getPrismaClient } from "./database/prisma_client";
import { PrismaDeviceRepository } from "./repositories/prisma_device_repository";
import { FirebaseNotificationService } from "../servicies/FirebaseNotificationService";

// ===== INFRASTRUCTURE LAYER =====

// 🗄️ Inicializar Prisma Client (Base de Datos)
export const prismaClient = getPrismaClient();

// 📦 Inicializar Repositorio de Dispositivos
export const deviceRepository = new PrismaDeviceRepository(prismaClient);

// 🔥 Inicializar Firebase Notification Service
export const firebaseService = FirebaseNotificationService.getInstance(deviceRepository);

// 📧 Inicializar Notification Manager (con inyección de Firebase)
export const notificationSender = new NotificationManagerAdapter(firebaseService);

// ===== APPLICATION LAYER =====

// 📲 Caso de uso para enviar notificaciones
export const sendNotificationUseCase = new SendNotificationUseCase(notificationSender);

// 🔐 Caso de uso para agregar tokens FCM
export const addDeviceTokenUseCase = new AddDeviceTokenUseCase(deviceRepository);

// 🗑️ Caso de uso para eliminar tokens FCM
export const removeDeviceTokenUseCase = new RemoveDeviceTokenUseCase(deviceRepository);

// ===== PRESENTATION LAYER =====

// 🌐 Controlador HTTP para notificaciones
export const notificationController = new NotificationController(sendNotificationUseCase);

// 🐰 RabbitMQ Provider
export const rabbitProvider = RabbitMQProvider.getInstance();

// 🎧 Consumer de RabbitMQ (inyectamos todos los casos de uso necesarios)
export const rabbitConsumer = new RabbitMQConsumer(
    sendNotificationUseCase,
    rabbitProvider,
    addDeviceTokenUseCase,
    removeDeviceTokenUseCase
);