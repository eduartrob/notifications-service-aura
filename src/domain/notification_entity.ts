export type NotificationType = 'PUSH' | 'SMS' | 'EMAIL' | 'INTERNAL';

export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly body: string,
    public readonly metadata?: any, // ID del post, ID del chat, etc.
    public readonly createdAt: Date = new Date()
  ) {}
}