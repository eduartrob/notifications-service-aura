import { SendNotificationUseCase } from '../../../../application/send_notification_usecase';

/**
 * Handler para eventos del Messaging Service
 */
export class MessagingEventHandler {
    constructor(private sendNotificationUseCase: SendNotificationUseCase) { }

    /**
     * Notificar al destinatario que recibió un nuevo mensaje
     */
    async handleMessageReceived(payload: any) {
        await this.sendNotificationUseCase.execute(
            payload.recipientUserId,
            'PUSH',
            '💬 Nuevo Mensaje',
            `${payload.senderUsername}: ${payload.messagePreview}`,
            {
                type: 'NEW_MESSAGE',
                conversationId: payload.conversationId,
                messageId: payload.messageId,
                senderUserId: payload.senderUserId,
                deepLink: `/chat/${payload.conversationId}`,
                source: 'messaging_service'
            }
        );
    }

    /**
     * Notificar al remitente que su mensaje fue entregado al destinatario
     */
    async handleMessageDelivered(payload: any) {
        // Notificación silenciosa al remitente para actualizar estado del mensaje
        await this.sendNotificationUseCase.execute(
            payload.senderUserId,
            'PUSH',
            'Mensaje Entregado',
            `Tu mensaje fue entregado`,
            {
                type: 'MESSAGE_DELIVERED',
                conversationId: payload.conversationId,
                messageId: payload.messageId,
                recipientUserId: payload.recipientUserId,
                silent: true, // Notificación silenciosa para actualizar UI sin molestar
                source: 'messaging_service'
            }
        );
        console.log(`✅ Message ${payload.messageId} delivered to user ${payload.recipientUserId}`);
    }

    /**
     * Notificar al remitente que su mensaje fue leído
     */
    async handleMessageRead(payload: any) {
        // Notificación silenciosa al remitente para actualizar estado del mensaje
        await this.sendNotificationUseCase.execute(
            payload.senderUserId,
            'PUSH',
            'Mensaje Leído',
            `Tu mensaje fue leído`,
            {
                type: 'MESSAGE_READ',
                conversationId: payload.conversationId,
                messageId: payload.messageId,
                recipientUserId: payload.recipientUserId,
                readAt: payload.readAt,
                silent: true, // Notificación silenciosa para actualizar UI sin molestar
                source: 'messaging_service'
            }
        );
        console.log(`👁️ Message ${payload.messageId} read by user ${payload.recipientUserId}`);
    }

    /**
     * Indicador de escritura - Evento en tiempo real (WebSocket)
     * No se envía notificación push, solo se registra para debugging
     */
    async handleTypingIndicator(payload: any) {
        // Este evento es para tiempo real vía WebSocket, no para notificaciones push
        console.log(`⌨️ User ${payload.userId} is typing in conversation ${payload.conversationId}`);
    }
}
