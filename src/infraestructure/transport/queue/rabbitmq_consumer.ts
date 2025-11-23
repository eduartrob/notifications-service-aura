import { Channel } from 'amqplib';
import { SendNotificationUseCase } from "../../../application/send_notification_usecase";
import { RabbitMQProvider } from '../../providers/rabbitmq_provider';
import { RABBIT_QUEUE } from '../../../config/config'; 

export class RabbitMQConsumer {
  private QUEUE_NAME = RABBIT_QUEUE; // 'notifications_queue'

  // Recibimos el UseCase y el Provider (para obtener el canal)
  constructor(
    private useCase: SendNotificationUseCase,
    private provider: RabbitMQProvider 
  ) {}

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
            
            console.log(`[RCV] Evento ${routingKey}`);
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
          `El usuario ${payload.fullName} (${payload.email}) se ha registrado.`,
          { source: 'auth_service', /*recipientEmail: ADMIN_EMAIL*/ } // Email del admin
        );
        break;

      case 'USER_LOGGED_IN':
        // Notificación de Seguridad para el Usuario (Email o Push)
        await this.useCase.execute(
          payload.userId,
          'EMAIL',
          '🔒 Inicio de Sesión Detectado',
          `Se ha iniciado sesión en tu cuenta (${payload.email}) desde ${payload.device} en ${payload.ipAddress}.`,
          { recipientEmail: payload.email, securityAlert: true }
        );
        break;

      case 'PASSWORD_RECOVERY_REQUESTED':
        // Envío de correo con el link temporal
        await this.useCase.execute(
          payload.userId,
          'EMAIL',
          '🔑 Recuperación de Contraseña',
          // El cuerpo contiene el link temporal
          `<h1>Recuperación de Contraseña</h1>
           <p>Hola ${payload.name},</p>
           <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
           <a href="${payload.recoveryLink}">Restablecer Contraseña</a>`,
          { recipientEmail: payload.email, isHTML: true }
        );
        break;
      
      default:
        console.warn(`Evento de tipo ${eventType} no reconocido. Ignorando...`);
    }
  }
}