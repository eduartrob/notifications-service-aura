import { Notification } from "../../domain/notification_entity";
import { NotificationSenderPort } from "../../domain/notification_sender_port";
import { sendEmail } from "../../servicies/emailService";
import { FirebaseNotificationService } from "../../servicies/FirebaseNotificationService";

export class NotificationManagerAdapter implements NotificationSenderPort {
  constructor(private firebaseService?: FirebaseNotificationService) { }

  async send(notification: Notification): Promise<void> {
    switch (notification.type) {
      case 'PUSH':
        const pushAction = this.getPushActionDescription(notification);
        console.log(`[FCM Adapter] 📲 ${pushAction}`);
        console.log(`   └─ Usuario: ${notification.userId}`);
        console.log(`   └─ Mensaje: ${notification.body}`);

        // Enviar notificación push real usando Firebase
        if (this.firebaseService) {
          try {
            await this.firebaseService.sendToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.metadata as Record<string, string>
            );
          } catch (error) {
            console.error(`❌ [FCM Adapter] Error enviando push:`, error);
          }
        } else {
          console.warn('⚠️ [FCM Adapter] Firebase service no configurado');
        }
        break;

      case 'SMS':
        // Aquí llamarías a Twilio
        const smsAction = this.getSMSActionDescription(notification);
        console.log(`[Twilio Adapter] 💬 ${smsAction}`);
        console.log(`   └─ Usuario: ${notification.userId}`);
        console.log(`   └─ Mensaje: ${notification.body}`);
        break;

      case 'EMAIL':
        const recipientEmail = notification.metadata?.recipientEmail;

        if (!recipientEmail) {
          console.error('[Email Adapter] ❌ No recipient email provided in metadata');
          return;
        }

        const emailType = notification.metadata?.type || 'GENERIC';
        const emailAction = this.getEmailActionDescription(notification, emailType);

        console.log(`[Email Adapter] 📧 ${emailAction}`);
        console.log(`   └─ Destinatario: ${recipientEmail}`);
        console.log(`   └─ Tipo: ${emailType}`);

        // Usar el servicio de email dinámico
        await sendEmail(recipientEmail, emailType, notification.body, notification.metadata);
        break;

      default:
        console.warn('⚠️ Tipo de notificación no soportado:', notification.type);
    }
  }

  // 📝 Descripción de la acción según el tipo de email
  private getEmailActionDescription(notification: Notification, emailType: string): string {
    switch (emailType) {
      case 'PASSWORD_RECOVERY':
        return 'Enviando email de recuperación de contraseña';
      case 'USER_LOGGED_IN':
        return 'Enviando alerta de seguridad - Inicio de sesión detectado';
      case 'USER_REGISTERED':
        return 'Notificando nuevo registro de usuario al administrador';
      case 'WELCOME_USER':
        return 'Enviando email de bienvenida al nuevo usuario';
      default:
        return `Enviando email genérico: ${notification.title}`;
    }
  }

  // 📝 Descripción de la acción para notificaciones Push
  private getPushActionDescription(notification: Notification): string {
    const eventType = notification.metadata?.eventType;

    switch (eventType) {
      case 'PUBLICATION_LIKED':
        return 'Notificando "Me Gusta" en publicación';
      case 'COMMENT_ADDED':
        return 'Notificando nuevo comentario en publicación';
      case 'USER_FOLLOWED':
        return 'Notificando nuevo seguidor';
      case 'USER_LOGGED_IN':
        return 'Enviando alerta de seguridad - Inicio de sesión';
      default:
        return `Enviando notificación push: ${notification.title}`;
    }
  }

  // 📝 Descripción de la acción para SMS
  private getSMSActionDescription(notification: Notification): string {
    return `Enviando SMS: ${notification.title}`;
  }
}