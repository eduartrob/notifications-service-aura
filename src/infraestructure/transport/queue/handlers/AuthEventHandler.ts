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
        // Notificación de Bienvenida para el Usuario Registrado
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
        // 1️⃣ Guardar el token FCM del dispositivo
        if (payload.fcmToken && this.addDeviceTokenUseCase) {
            await this.addDeviceTokenUseCase.execute(
                payload.userId,
                payload.fcmToken,
                payload.device // deviceInfo opcional
            );
        }

        // 2️⃣ Notificación de Seguridad para el Usuario (Email)
        await this.sendNotificationUseCase.execute(
            payload.userId,
            'EMAIL',
            '🔒 Inicio de Sesión Detectado',
            `Se ha iniciado sesión en tu cuenta (${payload.email}).`,
            {
                recipientEmail: payload.email,
                type: 'USER_LOGGED_IN',
                source: 'auth_service'
            }
        );
    }

    async handlePasswordRecoveryRequested(payload: any) {
        await this.sendNotificationUseCase.execute(
            payload.userId,
            'EMAIL',
            '🔑 Recuperación de Contraseña',
            payload.recoveryLink,
            {
                recipientEmail: payload.email,
                type: 'PASSWORD_RECOVERY',
                source: 'auth_service'
            }
        );
    }

    async handleUserLoggedOut(payload: any) {
        // Aquí podrías implementar lógica para notificar a los seguidores
        console.log('📱 Usuario deslogueado:', payload.userId);
    }
}
