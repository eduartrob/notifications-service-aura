import { DeviceRepositoryPort } from "../domain/device_repository_port";

export class RemoveDeviceTokenUseCase {
    constructor(private deviceRepository: DeviceRepositoryPort) { }

    async execute(userId: string, fcmToken: string): Promise<void> {
        try {
            console.log(`[RemoveDeviceToken] Eliminando token para usuario ${userId}`);

            await this.deviceRepository.removeDevice(userId, fcmToken);
            console.log(`✅ [RemoveDeviceToken] Token eliminado exitosamente`);
        } catch (error) {
            console.error(`❌ [RemoveDeviceToken] Error eliminando token:`, error);
            throw error;
        }
    }
}
