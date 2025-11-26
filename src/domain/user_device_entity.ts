export interface UserDevice {
    id: string;
    userId: string;
    fcmToken: string;
    deviceInfo?: string;
    createdAt: Date;
    updatedAt: Date;
}
