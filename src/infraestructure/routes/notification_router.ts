import { Router } from "express";
import { notificationController } from "../../infraestructure/dependencies";

const router = Router();

// Definimos la ruta POST /notify
// Delegamos la ejecución al método run del controlador
router.post("/notify", notificationController.run);

export { router as notificationRouter };