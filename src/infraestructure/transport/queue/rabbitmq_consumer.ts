import { Channel } from 'amqplib';
import { SendNotificationUseCase } from "../../../application/send_notification_usecase";
import { AddDeviceTokenUseCase } from '../../../application/add_device_token_usecase';
import { RemoveDeviceTokenUseCase } from '../../../application/remove_device_token_usecase';
import { RabbitMQProvider } from '../../providers/rabbitmq_provider';
import { RABBIT_QUEUE } from '../../../config/config';

// Importar handlers modulares
import { AuthEventHandler } from './handlers/AuthEventHandler';
import { SocialEventHandler } from './handlers/SocialEventHandler';
import { MessagingEventHandler } from './handlers/MessagingEventHandler';

export class RabbitMQConsumer {
  private QUEUE_NAME = RABBIT_QUEUE;
  private processedEvents: Set<string>;
  private readonly MAX_PROCESSED_EVENTS = 10000;

  // Handlers modulares
  private authHandler: AuthEventHandler;
  private socialHandler: SocialEventHandler;
  private messagingHandler: MessagingEventHandler;

  constructor(
    private useCase: SendNotificationUseCase,
    private provider: RabbitMQProvider,
    private addDeviceTokenUseCase?: AddDeviceTokenUseCase,
    private removeDeviceTokenUseCase?: RemoveDeviceTokenUseCase
  ) {
    this.processedEvents = new Set<string>();

    // Inicializar handlers
    this.authHandler = new AuthEventHandler(useCase, addDeviceTokenUseCase);
    this.socialHandler = new SocialEventHandler(useCase);
    this.messagingHandler = new MessagingEventHandler(useCase);
  }

  async start() {
    try {
      const channel: Channel = this.provider.getChannel();
      console.log(`👂 Escuchando la cola de eventos: ${this.QUEUE_NAME}`);

      channel.prefetch(1);

      await channel.consume(this.QUEUE_NAME!, async (message) => {
        if (message) {
          try {
            const content = JSON.parse(message.content.toString());
            const routingKey = message.fields.routingKey;

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📨 [EVENTO RECIBIDO]`);
            console.log(`   Routing Key: ${routingKey}`);
            console.log(`   Event Type: ${content.eventType || 'N/A'}`);
            console.log(`   Event ID: ${content.eventId || 'N/A'}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            await this.handleMessage(content);
            channel.ack(message);

          } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
            channel.nack(message);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error iniciando consumidor:', error);
    }
  }

  async handleMessage(event: any) {
    const { eventType, eventId, payload } = event;

    // Deduplicación
    if (eventId && this.processedEvents.has(eventId)) {
      console.log(`⚠️ Evento duplicado (EventID: ${eventId}). Ignorando...`);
      return;
    }

    // Limpieza de cache
    if (this.processedEvents.size >= this.MAX_PROCESSED_EVENTS) {
      console.log('🧹 Limpiando cache de eventos...');
      const keysToDelete = Array.from(this.processedEvents).slice(0, 1000);
      keysToDelete.forEach(key => this.processedEvents.delete(key));
    }

    if (eventId) {
      this.processedEvents.add(eventId);
    }

    try {
      // Delegar a handlers modulares
      switch (eventType) {
        // AUTH SERVICE
        case 'USER_REGISTERED':
          await this.authHandler.handleUserRegistered(payload);
          break;
        case 'USER_LOGGED_IN':
          await this.authHandler.handleUserLoggedIn(payload);
          break;
        case 'PASSWORD_RECOVERY_REQUESTED':
          await this.authHandler.handlePasswordRecoveryRequested(payload);
          break;
        case 'USER_LOGGED_OUT':
          await this.authHandler.handleUserLoggedOut(payload);
          break;

        // SOCIAL SERVICE
        case 'PUBLICATION_LIKED':
          await this.socialHandler.handlePublicationLiked(payload);
          break;
        case 'COMMENT_ADDED':
          await this.socialHandler.handleCommentAdded(payload);
          break;
        case 'FRIENDSHIP_REQUEST_SENT':
          await this.socialHandler.handleFriendshipRequestSent(payload);
          break;
        case 'FRIENDSHIP_REQUEST_ACCEPTED':
          await this.socialHandler.handleFriendshipRequestAccepted(payload);
          break;
        case 'COMMUNITY_MEMBER_JOINED':
          await this.socialHandler.handleCommunityMemberJoined(payload);
          break;

        // MESSAGING SERVICE
        case 'MESSAGE_RECEIVED':
          await this.messagingHandler.handleMessageReceived(payload);
          break;
        case 'MESSAGE_DELIVERED':
          await this.messagingHandler.handleMessageDelivered(payload);
          break;
        case 'MESSAGE_READ':
          await this.messagingHandler.handleMessageRead(payload);
          break;
        case 'TYPING_INDICATOR':
          await this.messagingHandler.handleTypingIndicator(payload);
          break;

        default:
          console.warn(`⚠️ Evento ${eventType} no reconocido`);
      }

      console.log(`✅ Evento ${eventType} procesado\n`);

    } catch (error) {
      console.error(`❌ Error manejando ${eventType}:`, error);
      throw error;
    }
  }
}