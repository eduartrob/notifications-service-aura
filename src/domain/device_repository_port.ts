import { UserDevice } from "./user_device_entity";

export interface DeviceRepositoryPort {
    /**
     * Agrega un nuevo dispositivo con su token FCM para un usuario
     * Si el token ya existe, lo actualiza
     */
    addDevice(userId: string, fcmToken: string, deviceInfo?: string): Promise<UserDevice>;

    /**
     * Elimina un dispositivo específico de un usuario por su token FCM
     */
    removeDevice(userId: string, fcmToken: string): Promise<void>;

    /**
     * Obtiene todos los dispositivos (tokens) de un usuario
     */
    getDevicesByUserId(userId: string): Promise<UserDevice[]>;

    /**
     * Elimina todos los dispositivos de un usuario (útil cuando se elimina la cuenta)
     */
    removeAllDevicesByUserId(userId: string): Promise<void>;

    /**
     * Verifica si un token existe
     */
    tokenExists(fcmToken: string): Promise<boolean>;
}
