export const PORT = process.env.PORT;

export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('ADVERTENCIA: No se ha definido JWT_SECRET en el archivo .env. Usando valor por defecto inseguro.');
}

export const MICROSERVICES = {
    auth: process.env.AUTH_URL ,
    chat: process.env.CHAT_URL,
    posts: process.env.POSTS_URL,
    notifications: process.env.NOTIFICATIONS_URL
};

export const RABBIT_URL = process.env.RABBITMQ_URL;
export const RABBIT_QUEUE = process.env.RABBIT_QUEUE;
export const RABBIT_EXCHANGE = process.env.RABBIT_EXCHANGE;
export const RABBIT_ROUTING_KEY = process.env.RABBIT_ROUTING_KEY;


export const DATABASE_URL = process.env.DATABASE_URL;