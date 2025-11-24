// ¡Importante! Cargar las variables de entorno PRIMERO.
import dotenv from 'dotenv';
dotenv.config();

import { startServer } from './config/express/server';
import { RabbitMQProvider } from './infraestructure/providers/rabbitmq_provider';
import { rabbitConsumer } from './infraestructure/dependencies';

async function main() {
  // Inicia el servidor Express
  startServer();

  // Obtiene la instancia del proveedor de RabbitMQ y se conecta
  const rabbitProvider = RabbitMQProvider.getInstance();
  await rabbitProvider.connect();

  // 🔥 Inicia el consumer para escuchar eventos de RabbitMQ
  await rabbitConsumer.start();
  console.log('✅ RabbitMQ Consumer iniciado y escuchando eventos');
}

main().catch(error => console.error('❌ Error al iniciar el servicio de notificaciones:', error));