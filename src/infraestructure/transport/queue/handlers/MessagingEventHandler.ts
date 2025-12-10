import { SendNotificationUseCase } from '../../../../application/send_notification_usecase';

/**
 * Handler para eventos del Messaging Service
 */
export class MessagingEventHandler {
    constructor(private sendNotificationUseCase: SendNotificationUseCase) { }

    /**
     * Notificar al destinatario que recibió un nuevo mensaje
     * Formato estilo WhatsApp: nombre como título, mensaje como cuerpo
     * 🔥 Soporta tanto mensajes 1-1 como de grupo
     */
    async handleMessageReceived(payload: any) {
        console.log('💬 [MESSAGE_RECEIVED] Procesando evento de mensaje...');
        console.log('   📦 Payload:', JSON.stringify(payload, null, 2));
        console.log(`   ✅ Enviando notificación a destinatario: ${payload.recipientUserId}`);

        // 🔥 WhatsApp-style: title = sender name, body = just the message
        const senderName = payload.senderUsername || 'Nuevo mensaje';
        const messageBody = payload.messagePreview || '';

        // 🔥 Determine if this is a group message or 1-1 conversation
        const isGroupMessage = payload.groupId != null;
        const chatId = isGroupMessage ? payload.groupId : payload.conversationId;
        const deepLink = isGroupMessage ? `/group-chat/${payload.groupId}` : `/chat/${payload.conversationId}`;
        const androidGroup = isGroupMessage ? `group_${payload.groupId}` : `chat_${payload.conversationId}`;

        console.log(`   📱 Tipo: ${isGroupMessage ? 'GRUPO' : 'CHAT 1-1'}, deepLink: ${deepLink}`);

        await this.sendNotificationUseCase.execute(
            payload.recipientUserId,
            'PUSH',
            senderName,  // Title is just the sender name
            messageBody, // Body is just the message (no prefix)
            {
                type: isGroupMessage ? 'NEW_GROUP_MESSAGE' : 'NEW_MESSAGE',
                conversationId: payload.conversationId,
                groupId: payload.groupId, // 🔥 Include groupId for deep links
                messageId: payload.messageId,
                senderUserId: payload.senderUserId,
                senderName: senderName,
                // 🔥 Avatar URL for profile picture in notification
                senderAvatarUrl: payload.senderAvatarUrl || '',
                deepLink: deepLink,
                source: 'messaging_service',
                // 🔥 For grouped notifications (tag/group key)
                android_channel_id: 'aura_messages',
                android_group: androidGroup,
                tag: androidGroup,
                collapse_key: androidGroup
            }
        );

        console.log(`   📤 Notificación de mensaje ${isGroupMessage ? 'de grupo' : '1-1'} enviada exitosamente`);
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
