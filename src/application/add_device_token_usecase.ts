import { DeviceRepositoryPort } from "../domain/device_repository_port";

const MAX_DEVICES_PER_USER = 3;

export class AddDeviceTokenUseCase {
    constructor(private deviceRepository: DeviceRepositoryPort) { }

    async execute(
        userId: string,
        fcmToken: string,
        deviceInfo?: string
    ): Promise<void> {
        try {
            console.log(`[AddDeviceToken] Procesando token para usuario ${userId}`);

            // 🔥 Always upsert - if token exists with another user, it gets reassigned
            await this.deviceRepository.addDevice(userId, fcmToken, deviceInfo);
            console.log(`✅ [AddDeviceToken] Token registrado/actualizado para usuario ${userId}`);

            // 🔥 Enforce max devices limit - remove oldest if more than limit
            await this.deviceRepository.enforceMaxDevices(userId, MAX_DEVICES_PER_USER);

        } catch (error) {
            console.error(`❌ [AddDeviceToken] Error procesando token:`, error);
            throw error;
        }
    }
}
