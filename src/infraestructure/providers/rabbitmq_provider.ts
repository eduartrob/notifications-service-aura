import * as amqp from 'amqplib';
import { RABBIT_URL, RABBIT_QUEUE } from '../../config/config'; 

const EXCHANGE_NAME = 'domain_events';

export class RabbitMQProvider {
  private static instance: RabbitMQProvider;
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  private constructor() {}

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
      
      // 1. Asegurar el Exchange de tipo 'topic'
      await (this.channel as any).assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      
      // 2. Asegurar que MI cola (Notificaciones) existe
      const q = await (this.channel as any).assertQueue(RABBIT_QUEUE, { durable: true });

      // 3. UNIR (Bind) mi cola al Exchange
      // La clave de routing 'auth.#' significa: Escuchar todo lo que empiece por 'auth.'
      const bindingKey = 'auth.#'; 
      await (this.channel as any).bindQueue(q.queue, EXCHANGE_NAME, bindingKey);
      
      console.log(`✅ Queue: ${RABBIT_QUEUE} bindeada a Exchange: ${EXCHANGE_NAME} con key: ${bindingKey}`);

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