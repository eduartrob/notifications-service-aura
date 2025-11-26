import { Router } from "express";
import { body } from "express-validator";
import { notificationController } from "../../infraestructure/dependencies";

const router = Router();

// Definimos la ruta POST /notify
// Delegamos la ejecución al método run del controlador
router.post(
    "/notify",
    [
        // 🛡️ Input Validation
        body('userId').isString().notEmpty().withMessage('userId must be a non-empty string'),
        body('type').isIn(['PUSH', 'SMS', 'EMAIL', 'INTERNAL']).withMessage('Invalid notification type'),
        body('title').isString().notEmpty().trim().escape().withMessage('Title must be a non-empty string'),
        body('body').isString().notEmpty().trim().withMessage('Body must be a non-empty string'),
        body('metadata').optional().isObject().withMessage('Metadata must be an object')
    ],
    notificationController.run
);

export { router as notificationRouter };