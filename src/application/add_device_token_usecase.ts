import { DeviceRepositoryPort } from "../domain/device_repository_port";

export class AddDeviceTokenUseCase {
    constructor(private deviceRepository: DeviceRepositoryPort) { }

    async execute(
        userId: string,
        fcmToken: string,
        deviceInfo?: string
    ): Promise<void> {
        try {
            console.log(`[AddDeviceToken] Agregando token para usuario ${userId}`);

            // Verificar si el token ya existe
            const exists = await this.deviceRepository.tokenExists(fcmToken);

            if (exists) {
                console.log(`[AddDeviceToken] Token ya existe, omitiendo: ${fcmToken.substring(0, 20)}...`);
                return;
            }

            // Agregar el nuevo dispositivo
            await this.deviceRepository.addDevice(userId, fcmToken, deviceInfo);
            console.log(`✅ [AddDeviceToken] Token agregado exitosamente para usuario ${userId}`);
        } catch (error) {
            console.error(`❌ [AddDeviceToken] Error agregando token:`, error);
            throw error;
        }
    }
}
