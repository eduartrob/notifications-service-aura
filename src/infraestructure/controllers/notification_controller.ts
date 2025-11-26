import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { SendNotificationUseCase } from "../../application/send_notification_usecase";

export class NotificationController {
  constructor(private sendNotificationUseCase: SendNotificationUseCase) { }

  // Usamos arrow function para no perder el contexto de 'this' al pasarla como callback
  run = async (req: Request, res: Response) => {
    try {
      // 🛡️ Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { userId, type, title, body, metadata } = req.body;

      await this.sendNotificationUseCase.execute(
        userId,
        type,
        title,
        body,
        metadata || {}
      );

      res.status(200).json({ status: 'success', message: 'Notification sent/queued' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }
}