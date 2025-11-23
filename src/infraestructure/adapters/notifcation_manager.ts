import { Notification } from "../../domain/notification_entity";
import { NotificationSenderPort } from "../../domain/notification_sender_port";

export class NotificationManagerAdapter implements NotificationSenderPort {
  async send(notification: Notification): Promise<void> {
    switch (notification.type) {
      case 'PUSH':
        // Aquí llamarías a Firebase Cloud Messaging (FCM)
        console.log(`[FCM Adapter] Enviando Push a ${notification.userId}: ${notification.body}`);
        // await admin.messaging().send(...)
        break;

      case 'SMS':
        // Aquí llamarías a Twilio
        console.log(`[Twilio Adapter] Enviando SMS a ${notification.userId}: ${notification.body}`);
        break;
      
      case 'EMAIL':
        // Aquí llamarías a Nodemailer/SendGrid
        console.log(`[Email Adapter] Enviando Email a ${notification.userId}: ${notification.body}`);
        break;

      default:
        console.warn('Tipo de notificación no soportado');
    }
  }
}