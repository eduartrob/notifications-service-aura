import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Singleton para el cliente de Prisma
let prismaInstance: PrismaClient | null = null;
let pool: Pool | null = null;

export function getPrismaClient(): PrismaClient {
    if (!prismaInstance) {
        // Crear pool de conexiones de PostgreSQL
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        // Crear adaptador de Prisma para PostgreSQL
        const adapter = new PrismaPg(pool);

        // Inicializar Prisma Client con el adaptador
        prismaInstance = new PrismaClient({
            adapter,
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
    }

    if (pool) {
        await pool.end();
        pool = null;
    }

    console.log('🔌 Prisma Client desconectado');
}
