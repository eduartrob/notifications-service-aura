import { SendNotificationUseCase } from '../../../../application/send_notification_usecase';

/**
 * Handler para eventos del Social Service
 */
export class SocialEventHandler {
    constructor(private sendNotificationUseCase: SendNotificationUseCase) { }

    async handlePublicationLiked(payload: any) {
        console.log('💖 [PUBLICATION_LIKED] Procesando evento de like...');
        console.log('   📦 Payload:', JSON.stringify(payload, null, 2));

        // Notificar al dueño de la publicación que le dieron like
        if (payload.authorId !== payload.userId) {
            console.log(`   ✅ Enviando notificación a autor: ${payload.authorId}`);

            // 🔥 Use displayName from payload
            const likerName = payload.likerDisplayName || 'Alguien';

            await this.sendNotificationUseCase.execute(
                payload.authorId,
                'PUSH',
                '❤️ Nuevo Me Gusta',
                `A ${likerName} le gustó tu publicación`,
                {
                    type: 'POST_LIKE',
                    postId: payload.publicationId,
                    likedByUserId: payload.userId,
                    deepLink: `/post/${payload.publicationId}`,
                    source: 'social_service'
                }
            );

            console.log(`   📤 Notificación enviada exitosamente`);
        } else {
            console.log(`   ⏭️ Usuario dio like a su propia publicación - no se notifica`);
        }
    }

    async handleCommentAdded(payload: any) {
        // 🔥 Use displayName from payload
        const commenterName = payload.commenterDisplayName || 'Alguien';

        // Notificar al dueño de la publicación que hay un nuevo comentario
        if (payload.publicationAuthorId !== payload.authorId) {
            const commentPreview = payload.text?.substring(0, 50) || 'un comentario';
            await this.sendNotificationUseCase.execute(
                payload.publicationAuthorId,
                'PUSH',
                '💬 Nuevo Comentario',
                `${commenterName} comentó en tu publicación: "${commentPreview}..."`,
                {
                    type: 'POST_COMMENT',
                    postId: payload.publicationId,
                    commentId: payload.commentId,
                    commentAuthorId: payload.authorId,
                    deepLink: `/post/${payload.publicationId}#comment-${payload.commentId}`,
                    source: 'social_service'
                }
            );
        }

        // Si es respuesta a un comentario, notificar al autor del comentario padre
        if (payload.parentCommentId && payload.parentCommentAuthorId) {
            if (payload.parentCommentAuthorId !== payload.authorId &&
                payload.parentCommentAuthorId !== payload.publicationAuthorId) {
                const replyPreview = payload.text?.substring(0, 50) || 'una respuesta';
                await this.sendNotificationUseCase.execute(
                    payload.parentCommentAuthorId,
                    'PUSH',
                    '↩️ Respuesta a tu Comentario',
                    `Alguien respondió: "${replyPreview}..."`,
                    {
                        type: 'COMMENT_REPLY',
                        replyId: payload.commentId,
                        parentCommentId: payload.parentCommentId,
                        deepLink: `/comment/${payload.parentCommentId}#reply-${payload.commentId}`,
                        source: 'social_service'
                    }
                );
            }
        }
    }

    async handleFriendshipRequestSent(payload: any) {
        await this.sendNotificationUseCase.execute(
            payload.recipientUserId,
            'PUSH',
            '👥 Nueva Solicitud de Amistad',
            `${payload.senderUsername} te envió una solicitud de amistad`,
            {
                type: 'FRIEND_REQUEST',
                friendshipId: payload.friendshipId,
                senderUserId: payload.senderUserId,
                deepLink: `/friendships/requests`,
                source: 'social_service'
            }
        );
    }

    async handleFriendshipRequestAccepted(payload: any) {
        await this.sendNotificationUseCase.execute(
            payload.recipientUserId,
            'PUSH',
            '✅ Solicitud Aceptada',
            `${payload.acceptedByUsername} aceptó tu solicitud de amistad`,
            {
                type: 'FRIEND_ACCEPTED',
                friendshipId: payload.friendshipId,
                acceptedByUserId: payload.acceptedByUserId,
                deepLink: `/profile/${payload.acceptedByUserId}`,
                source: 'social_service'
            }
        );
    }

    async handleCommunityMemberJoined(payload: any) {
        // Notificar al creador de la comunidad
        if (payload.communityOwnerId !== payload.joinedByUserId) {
            await this.sendNotificationUseCase.execute(
                payload.communityOwnerId,
                'PUSH',
                '🏘️ Nuevo Miembro en tu Comunidad',
                `${payload.joinedByUsername} se unió a "${payload.communityName}"`,
                {
                    type: 'COMMUNITY_JOIN',
                    communityId: payload.communityId,
                    joinedByUserId: payload.joinedByUserId,
                    deepLink: `/community/${payload.communityId}/members`,
                    source: 'social_service'
                }
            );
        }
    }
}
