import { SendNotificationUseCase } from '../../../../application/send_notification_usecase';
import { AddDeviceTokenUseCase } from '../../../../application/add_device_token_usecase';

/**
 * Handler para eventos del Auth Service
 */
export class AuthEventHandler {
    constructor(
        private sendNotificationUseCase: SendNotificationUseCase,
        private addDeviceTokenUseCase?: AddDeviceTokenUseCase
    ) { }

    async handleUserRegistered(payload: any) {
        // Notificación de Bienvenida (Email)
        await this.sendNotificationUseCase.execute(
            payload.userId,
            'EMAIL',
            '🎉 Bienvenido a Aura',
            `Te has registrado exitosamente en nuestra plataforma de bienestar mental. Estamos felices de tenerte con nosotros.`,
            {
                recipientEmail: payload.email,
                type: 'WELCOME_USER',
                username: payload.username,
                source: 'auth_service'
            }
        );
    }

    async handleUserLoggedIn(payload: any) {
        // 1️⃣ Guardar el token FCM (útil para otras notificaciones futuras, aunque esta alerta sea por email)
        if (payload.fcmToken && this.addDeviceTokenUseCase) {
            await this.addDeviceTokenUseCase.execute(
                payload.userId,
                payload.fcmToken,
                payload.device
            );
        }

        // 2️⃣ Alerta de Inicio de Sesión (Email)
        await this.sendNotificationUseCase.execute(
            payload.userId,
            'EMAIL',
            '🔒 Nuevo Inicio de Sesión en Aura',
            `Se ha detectado un nuevo inicio de sesión en tu cuenta (${payload.email}) el ${new Date().toLocaleString()}.`,
            {
                recipientEmail: payload.email,
                type: 'USER_LOGGED_IN',
                source: 'auth_service'
            }
        );
    }

    async handlePasswordRecoveryRequested(payload: any) {
        // Recuperación de Contraseña (Email)
        await this.sendNotificationUseCase.execute(
            payload.userId,
            'EMAIL',
            '🔑 Recuperación de Contraseña',
            payload.resetUrl, // Corrected: was 'recoveryLink'
            {
                recipientEmail: payload.email,
                type: 'PASSWORD_RECOVERY',
                source: 'auth_service'
            }
        );
    }

    async handleUserLoggedOut(payload: any) {
        // Confirmación de Logout (Email)
        if (payload.email) {
            await this.sendNotificationUseCase.execute(
                payload.userId,
                'EMAIL',
                '👋 Sesión Cerrada',
                `Has cerrado sesión exitosamente de tu cuenta Aura.`,
                {
                    recipientEmail: payload.email,
                    type: 'USER_LOGGED_OUT',
                    source: 'auth_service'
                }
            );
        }
    }

    async handleUserDeleted(payload: any) {
        // Despedida por Eliminación de Cuenta (Email)
        if (payload.email) {
            await this.sendNotificationUseCase.execute(
                payload.userId,
                'EMAIL',
                '😢 Cuenta Eliminada',
                `Tu cuenta de Aura ha sido eliminada permanentemente. Lamentamos verte partir.`,
                {
                    recipientEmail: payload.email,
                    type: 'USER_DELETED',
                    source: 'auth_service'
                }
            );
        }
    }
}
