import { Notification } from "./notification_entity";

export interface NotificationSenderPort {
  send(notification: Notification): Promise<void>;
}