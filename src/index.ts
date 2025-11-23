// ¡Importante! Cargar las variables de entorno PRIMERO.
import dotenv from 'dotenv';
dotenv.config();

import { startServer } from './config/express/server';
import { RabbitMQProvider } from './infraestructure/providers/rabbitmq_provider';
 
async function main() {
  // Inicia el servidor Express
  startServer();
 
  // Obtiene la instancia del proveedor de RabbitMQ y se conecta
  const rabbitProvider = RabbitMQProvider.getInstance();
  await rabbitProvider.connect();
}
 
main().catch(error => console.error('❌ Error al iniciar el servicio de notificaciones:', error));