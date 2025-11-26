import { PrismaClient } from '@prisma/client';
import { DeviceRepositoryPort } from '../../domain/device_repository_port';
import { UserDevice } from '../../domain/user_device_entity';

export class PrismaDeviceRepository implements DeviceRepositoryPort {
    constructor(private prisma: PrismaClient) { }

    async addDevice(
        userId: string,
        fcmToken: string,
        deviceInfo?: string
    ): Promise<UserDevice> {
        // Usar upsert para crear o actualizar si ya existe
        const device = await this.prisma.userDevice.upsert({
            where: { fcmToken },
            update: {
                userId,
                deviceInfo,
                updatedAt: new Date(),
            },
            create: {
                userId,
                fcmToken,
                deviceInfo,
            },
        });

        return device;
    }

    async removeDevice(userId: string, fcmToken: string): Promise<void> {
        try {
            await this.prisma.userDevice.deleteMany({
                where: {
                    userId,
                    fcmToken,
                },
            });
        } catch (error) {
            // Si no existe, no hacer nada
            console.warn(`[PrismaDeviceRepository] Token no encontrado para eliminar: ${fcmToken.substring(0, 20)}...`);
        }
    }

    async getDevicesByUserId(userId: string): Promise<UserDevice[]> {
        return await this.prisma.userDevice.findMany({
            where: { userId },
        });
    }

    async removeAllDevicesByUserId(userId: string): Promise<void> {
        await this.prisma.userDevice.deleteMany({
            where: { userId },
        });
    }

    async tokenExists(fcmToken: string): Promise<boolean> {
        const device = await this.prisma.userDevice.findUnique({
            where: { fcmToken },
        });
        return device !== null;
    }
}
