export interface UserDevice {
    id: string;
    userId: string;
    fcmToken: string;
    deviceInfo?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
