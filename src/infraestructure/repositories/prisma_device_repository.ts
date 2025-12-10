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

    /**
     * 🔥 Remove a token WITHOUT validating userId (for automatic cleanup)
     */
    async removeDeviceByToken(fcmToken: string): Promise<void> {
        try {
            await this.prisma.userDevice.delete({
                where: { fcmToken },
            });
            console.log(`🧹 [PrismaDeviceRepository] Token eliminado: ${fcmToken.substring(0, 20)}...`);
        } catch (error) {
            console.warn(`[PrismaDeviceRepository] Token no encontrado para eliminar: ${fcmToken.substring(0, 20)}...`);
        }
    }

    /**
     * 🔥 Enforce max devices per user, removing oldest ones
     */
    async enforceMaxDevices(userId: string, maxDevices: number): Promise<void> {
        // Get all devices ordered by creation date (oldest first)
        const devices = await this.prisma.userDevice.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        // If more than limit, remove the oldest ones
        if (devices.length > maxDevices) {
            const devicesToRemove = devices.slice(0, devices.length - maxDevices);
            console.log(`🧹 [PrismaDeviceRepository] Usuario ${userId} tiene ${devices.length} dispositivos, eliminando ${devicesToRemove.length} más antiguos`);

            for (const device of devicesToRemove) {
                await this.prisma.userDevice.delete({
                    where: { fcmToken: device.fcmToken }
                });
            }
        }
    }
}
