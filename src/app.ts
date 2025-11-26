import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { notificationRouter } from './infraestructure/routes/notification_router';


const app = express();
app.use(cors());
app.use(helmet()); // 🛡️ Security Headers
app.use(express.json());

// 🛡️ Rate Limiting: 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use("/api/v1/notifications", notificationRouter);

export { app };
