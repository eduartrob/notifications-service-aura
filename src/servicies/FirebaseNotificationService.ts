import * as admin from 'firebase-admin';
import { DeviceRepositoryPort } from '../domain/device_repository_port';

export class FirebaseNotificationService {
    private static instance: FirebaseNotificationService;
    private app: admin.app.App;

    private constructor(private deviceRepository: DeviceRepositoryPort) {
        // Inicializar Firebase Admin SDK
        try {
            // Opción 1: Usar variables de entorno (Recomendado para producción)
            if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
                console.log('🔐 Inicializando Firebase con variables de entorno');

                this.app = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        // Reemplazar \\n con saltos de línea reales si vienen escapados
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    }),
                });
            }
            // Opción 2: Usar archivo JSON (Desarrollo local)
            else {
                console.log('📂 Inicializando Firebase con archivo JSON');
                const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH || './src/config/aura-firebase-adminsdk.json';

                // Usar path absoluto o relativo desde la raíz del proyecto
                // Ajuste para que funcione tanto en dev (src) como en prod (dist)
                let serviceAccount;
                try {
                    serviceAccount = require(`../${credentialsPath.replace('./src/', '')}`);
                } catch (e) {
                    // Intento alternativo para cuando corre desde dist
                    serviceAccount = require(`../../config/aura-firebase-adminsdk.json`);
                }

                this.app = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }

            console.log('✅ Firebase Admin SDK inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Firebase Admin SDK:', error);
            throw error;
        }
    }

    static getInstance(deviceRepository: DeviceRepositoryPort): FirebaseNotificationService {
        if (!FirebaseNotificationService.instance) {
            FirebaseNotificationService.instance = new FirebaseNotificationService(deviceRepository);
        }
        return FirebaseNotificationService.instance;
    }

    /**
     * Envía una notificación push a un token FCM específico
     */
    async sendToDevice(
        fcmToken: string,
        title: string,
        body: string,
        data?: Record<string, string>
    ): Promise<void> {
        try {
            const message: admin.messaging.Message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                token: fcmToken,
            };

            const response = await admin.messaging().send(message);
            console.log(`✅ [FCM] Notificación enviada exitosamente:`, response);
        } catch (error: any) {
            console.error(`❌ [FCM] Error enviando notificación:`, error);

            // Si el token es inválido o no está registrado, eliminarlo de la BD
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                console.warn(`⚠️ [FCM] Token inválido, eliminando de la base de datos: ${fcmToken.substring(0, 20)}...`);
                // Nota: necesitaríamos el userId para eliminarlo correctamente
                // Por ahora solo logueamos el error
            }

            throw error;
        }
    }

    /**
     * Envía una notificación push a todos los dispositivos de un usuario
     */
    async sendToUser(
        userId: string,
        title: string,
        body: string,
        data?: Record<string, string>
    ): Promise<void> {
        try {
            // Obtener todos los dispositivos del usuario
            const devices = await this.deviceRepository.getDevicesByUserId(userId);

            if (devices.length === 0) {
                console.warn(`⚠️ [FCM] Usuario ${userId} no tiene dispositivos registrados`);
                return;
            }

            console.log(`📲 [FCM] Enviando notificación a ${devices.length} dispositivo(s) del usuario ${userId}`);

            // Enviar a cada dispositivo
            const promises = devices.map(device =>
                this.sendToDevice(device.fcmToken, title, body, data)
                    .catch(error => {
                        console.error(`❌ [FCM] Error enviando a dispositivo ${device.id}:`, error);
                        // No lanzar error, continuar con los demás dispositivos
                    })
            );

            await Promise.all(promises);
            console.log(`✅ [FCM] Notificaciones enviadas a usuario ${userId}`);
        } catch (error) {
            console.error(`❌ [FCM] Error enviando notificaciones al usuario ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Envía notificaciones a múltiples tokens (batch)
     */
    async sendToMultipleDevices(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>
    ): Promise<void> {
        try {
            if (tokens.length === 0) {
                console.warn('⚠️ [FCM] No hay tokens para enviar');
                return;
            }

            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`✅ [FCM] ${response.successCount} notificaciones enviadas exitosamente`);

            if (response.failureCount > 0) {
                console.warn(`⚠️ [FCM] ${response.failureCount} notificaciones fallaron`);
            }
        } catch (error) {
            console.error(`❌ [FCM] Error en envío batch:`, error);
            throw error;
        }
    }
}
