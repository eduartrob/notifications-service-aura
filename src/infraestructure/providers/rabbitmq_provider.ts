import * as amqp from 'amqplib';
import { RABBIT_URL, RABBIT_QUEUE } from '../../config/config';

const EXCHANGE_NAME = 'domain_events';
const AURA_EXCHANGE_NAME = 'aura_events';  // Exchange usado por social-service y messaging-service

export class RabbitMQProvider {
  private static instance: RabbitMQProvider;
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  private constructor() { }

  public static getInstance(): RabbitMQProvider {
    if (!RabbitMQProvider.instance) {
      RabbitMQProvider.instance = new RabbitMQProvider();
    }
    return RabbitMQProvider.instance;
  }

  /**
   * Conecta a RabbitMQ, crea el canal y configura el Exchange y el Binding.
   */
  async connect(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }

    try {
      if (!RABBIT_QUEUE) {
        throw new Error('La variable de entorno RABBIT_QUEUE no está definida.');
      }

      console.log('🐰 Conectando a RabbitMQ...');

      // Conexión
      const url = RABBIT_URL || 'amqp://localhost';
      this.connection = await amqp.connect(url) as unknown as amqp.Connection;

      if (!this.connection) {
        throw new Error('La conexión a RabbitMQ falló y no se pudo establecer.');
      }

      // Forzamos el tipo a 'any' para evitar un error de tipado en @types/amqplib. El método .createChannel() sí existe.
      this.channel = await (this.connection as any).createChannel();

      console.log('✅ RabbitMQ conectado exitosamente. Configurando estructuras...');

      // ** CONFIGURACIÓN DE ESTRUCTURAS DE COLAS (Binding) **

      // 1. Asegurar el Exchange de auth-service (domain_events)
      await (this.channel as any).assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      // 1.1 Asegurar el Exchange de social-service y messaging-service (aura_events)
      await (this.channel as any).assertExchange(AURA_EXCHANGE_NAME, 'topic', { durable: true });

      // 2. Asegurar que MI cola (Notificaciones) existe
      const q = await (this.channel as any).assertQueue(RABBIT_QUEUE, { durable: true });

      // ===== BINDINGS PARA AUTH-SERVICE (domain_events) =====

      // 3. UNIR (Bind) mi cola al Exchange domain_events para auth
      const authBindingKey = 'auth.user.*';
      await (this.channel as any).bindQueue(q.queue, EXCHANGE_NAME, authBindingKey);
      console.log(`✅ Queue: ${RABBIT_QUEUE} bindeada a Exchange: ${EXCHANGE_NAME} con key: ${authBindingKey}`);

      // 3.1 UNIR (Bind) para eventos de password
      const authPasswordBindingKey = 'auth.password.*';
      await (this.channel as any).bindQueue(q.queue, EXCHANGE_NAME, authPasswordBindingKey);
      console.log(`✅ Queue: ${RABBIT_QUEUE} bindeada a Exchange: ${EXCHANGE_NAME} con key: ${authPasswordBindingKey}`);

      // ===== BINDINGS PARA SOCIAL-SERVICE Y MESSAGING-SERVICE (aura_events) =====

      // 4. UNIR (Bind) para eventos sociales (likes, comments, friendships, communities)
      const socialBindingKey = 'social.#';
      await (this.channel as any).bindQueue(q.queue, AURA_EXCHANGE_NAME, socialBindingKey);
      console.log(`✅ Queue: ${RABBIT_QUEUE} bindeada a Exchange: ${AURA_EXCHANGE_NAME} con key: ${socialBindingKey}`);

      // 5. UNIR (Bind) para eventos de mensajería
      const messagingBindingKey = 'messaging.#';
      await (this.channel as any).bindQueue(q.queue, AURA_EXCHANGE_NAME, messagingBindingKey);
      console.log(`✅ Queue: ${RABBIT_QUEUE} bindeada a Exchange: ${AURA_EXCHANGE_NAME} con key: ${messagingBindingKey}`);

      // Devolver el canal tipado
      if (!this.channel) {
        throw new Error('El canal de RabbitMQ no ha sido inicializado.');
      }
      return this.channel;

    } catch (error) {
      console.error('❌ Error conectando a RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Obtiene el canal de RabbitMQ para usarlo en el Consumer.
   */
  public getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('El canal de RabbitMQ no ha sido inicializado. Llama a connect() primero.');
    }
    return this.channel;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        // Forzamos el tipo a 'any' para evitar un error de tipado en @types/amqplib. El método .close() sí existe.
        await (this.connection as any).close();
      }
      console.log('🔌 RabbitMQ desconectado.');
    } catch (error) {
      console.error('❌ Error desconectando RabbitMQ:', error);
    }
  }
}