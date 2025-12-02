import { PrismaClient } from '@prisma/client';

// Singleton para el cliente de Prisma
let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
    if (!prismaInstance) {
        // Inicializar Prisma Client (lee DATABASE_URL del .env automáticamente)
        prismaInstance = new PrismaClient({
            log: ['error', 'warn'],
        });

        console.log('✅ Prisma Client inicializado');
    }

    return prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
    if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
        console.log('🔌 Prisma Client desconectado');
    }
}
