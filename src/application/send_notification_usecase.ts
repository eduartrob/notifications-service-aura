import { Notification, NotificationType } from "../domain/notification_entity";
import { NotificationSenderPort } from "../domain/notification_sender_port";

export class SendNotificationUseCase {
  constructor(private readonly sender: NotificationSenderPort) {}

  async execute(
    userId: string, 
    type: NotificationType, 
    title: string, 
    body: string,
    metadata: any
  ): Promise<void> {
    
    // 1. Crear la entidad
    const notification = new Notification(
      crypto.randomUUID(), // Generar ID
      userId,
      type,
      title,
      body,
      metadata
    );

    // 2. Podríamos guardar en BD aquí (historial de notificaciones)
    // await this.repository.save(notification);

    // 3. Enviar la notificación a través del puerto
    console.log(`[Logic] Procesando notificación para usuario: ${userId}`);
    await this.sender.send(notification);
  }
}