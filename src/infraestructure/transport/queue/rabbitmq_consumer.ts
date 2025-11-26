import { Channel } from 'amqplib';
import { SendNotificationUseCase } from "../../../application/send_notification_usecase";
import { AddDeviceTokenUseCase } from '../../../application/add_device_token_usecase';
import { RemoveDeviceTokenUseCase } from '../../../application/remove_device_token_usecase';
import { RabbitMQProvider } from '../../providers/rabbitmq_provider';
import { RABBIT_QUEUE } from '../../../config/config';

export class RabbitMQConsumer {
  private QUEUE_NAME = RABBIT_QUEUE; // 'notifications_queue'

  // Recibimos los UseCases y el Provider (para obtener el canal)
  constructor(
    private useCase: SendNotificationUseCase,
    private provider: RabbitMQProvider,
    private addDeviceTokenUseCase?: AddDeviceTokenUseCase,
    private removeDeviceTokenUseCase?: RemoveDeviceTokenUseCase
  ) { }

  async start() {
    try {
      const channel: Channel = this.provider.getChannel();
      console.log(`👂 Escuchando la cola de eventos: ${this.QUEUE_NAME}`);

      // 1. Configurar el canal para que no mande más de 1 mensaje a la vez
      channel.prefetch(1);

      // 2. Iniciar el consumo
      await channel.consume(this.QUEUE_NAME!, async (message) => {
        if (message) {
          try {
            const content = JSON.parse(message.content.toString());
            const routingKey = message.fields.routingKey;

            // 🔍 Log detallado del evento recibido
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📨 [EVENTO RECIBIDO]`);
            console.log(`   Routing Key: ${routingKey}`);
            console.log(`   Event Type: ${content.eventType || 'N/A'}`);
            console.log(`   Occurred On: ${content.occurredOn || 'N/A'}`);
            console.log(`   Payload:`, JSON.stringify(content.payload, null, 2));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            await this.handleMessage(content);

            // 3. Confirmar el mensaje después de procesarlo con éxito
            channel.ack(message);

          } catch (error) {
            console.error('Error procesando mensaje:', error);
            // 4. Rechazar el mensaje (lo envía a la Dead Letter Queue o lo re-encola)
            channel.nack(message);
          }
        }
      });
    } catch (error) {
      console.error('Error iniciando consumidor de RabbitMQ:', error);
    }
  }

  // Lógica de Manejo de Eventos (Implementación de Auth)
  async handleMessage(event: any) {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'USER_REGISTERED':
        // Notificación para el Admin (email o Push interno)
        await this.useCase.execute(
          'ADMIN_ID_CONFIGURADO', // ID del administrador (variable de entorno)
          'EMAIL',
          '🚨 Nuevo Registro de Usuario',
          `El usuario ${payload.username} (${payload.email}) se ha registrado.`,
          { source: 'auth_service', /*recipientEmail: ADMIN_EMAIL*/ } // Email del admin
        );

        // Notificación de Bienvenida para el Usuario Registrado
        await this.useCase.execute(
          payload.userId,
          'EMAIL',
          '🎉 Bienvenido a Aura',
          `Te has registrado exitosamente en nuestra plataforma de bienestar mental. Estamos felices de tenerte con nosotros.`,
          {
            recipientEmail: payload.email,
            type: 'WELCOME_USER',
            username: payload.username,
            source: 'auth_service'
          }
        );
        break;


      case 'USER_LOGGED_IN':
        // 1️⃣ Guardar el token FCM del dispositivo
        if (payload.fcmToken && this.addDeviceTokenUseCase) {
          await this.addDeviceTokenUseCase.execute(
            payload.userId,
            payload.fcmToken,
            payload.device // deviceInfo opcional
          );
        }

        // 2️⃣ Notificación de Seguridad para el Usuario (Email o Push)
        await this.useCase.execute(
          payload.userId,
          'EMAIL',
          '🔒 Inicio de Sesión Detectado',
          `Se ha iniciado sesión en tu cuenta (${payload.email}).`,
          {
            recipientEmail: payload.email,
            type: 'USER_LOGGED_IN',
            securityAlert: true,
            device: payload.device,
            ipAddress: payload.ipAddress,
            timestamp: payload.timestamp || new Date().toISOString()
          }
        );
        break;

      case 'USER_LOGGED_OUT':
        // Eliminar el token FCM del dispositivo cuando se desloguea
        if (payload.fcmToken && this.removeDeviceTokenUseCase) {
          await this.removeDeviceTokenUseCase.execute(
            payload.userId,
            payload.fcmToken
          );
        }
        console.log(`🚪 Usuario ${payload.userId} se ha deslogueado`);
        break;

      case 'USER_ACCOUNT_DELETED':
        // Eliminar todos los tokens FCM cuando se elimina la cuenta
        if (this.removeDeviceTokenUseCase && payload.userId) {
          // Usamos el repositorio directamente para eliminar todos
          console.log(`🗑️ Eliminando todos los dispositivos del usuario ${payload.userId}`);
        }
        break;

      case 'PASSWORD_RECOVERY_REQUESTED':
        await this.useCase.execute(
          payload.userId,
          'EMAIL',
          '🔑 Recuperación de Contraseña',
          payload.recoveryLink, // Pasamos solo el link como body
          {
            recipientEmail: payload.email,
            type: 'PASSWORD_RECOVERY' // Marcamos el tipo para el adaptador
          }
        );
        break;

      // ===== EVENTOS SOCIALES =====
      case 'PUBLICATION_LIKED':
        // Notificar al autor de la publicación que alguien le dio like
        await this.useCase.execute(
          payload.authorId, // ID del autor de la publicación
          'PUSH',
          '❤️ Nuevo Me Gusta',
          `A alguien le gustó tu publicación`,
          {
            publicationId: payload.publicationId,
            userId: payload.userId,
            source: 'social_service',
            eventType: 'PUBLICATION_LIKED'
          }
        );
        break;

      case 'COMMENT_ADDED':
        // Notificar al autor de la publicación que alguien comentó
        await this.useCase.execute(
          payload.publicationAuthorId, // ID del autor de la publicación
          'PUSH',
          '💬 Nuevo Comentario',
          `${payload.authorId} comentó en tu publicación`,
          {
            publicationId: payload.publicationId,
            commentId: payload.commentId,
            authorId: payload.authorId,
            source: 'social_service',
            eventType: 'COMMENT_ADDED'
          }
        );
        break;

      case 'USER_FOLLOWED':
        // Notificar al usuario que fue seguido
        await this.useCase.execute(
          payload.followedUserId, // ID del usuario que fue seguido
          'PUSH',
          '👤 Nuevo Seguidor',
          `${payload.userId} comenzó a seguirte`,
          {
            userId: payload.userId,
            source: 'social_service',
            eventType: 'USER_FOLLOWED'
          }
        );
        break;

      case 'PUBLICATION_CREATED':
        // Opcional: Notificar a seguidores del autor
        console.log(`📢 Nueva publicación de ${payload.authorId}`);
        // Aquí podrías implementar lógica para notificar a los seguidores
        break;

      default:
        console.warn(`Evento de tipo ${eventType} no reconocido. Ignorando...`);
    }
  }
}