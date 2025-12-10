import { UserDevice } from "./user_device_entity";

export interface DeviceRepositoryPort {
    /**
     * Agrega un nuevo dispositivo con su token FCM para un usuario
     * Si el token ya existe, lo actualiza con el nuevo userId (reasignación)
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

    /**
     * 🔥 Elimina un token sin validar el userId (para limpieza automática)
     */
    removeDeviceByToken(fcmToken: string): Promise<void>;

    /**
     * 🔥 Aplica límite de dispositivos por usuario, eliminando los más antiguos
     */
    enforceMaxDevices(userId: string, maxDevices: number): Promise<void>;
}
