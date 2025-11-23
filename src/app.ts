import express from 'express';
import cors from 'cors';

import { connectDB } from './infraestructure/db/db';
import { notificationRouter } from './infraestructure/routes/notification_router';


const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use("/api/v1/notifications", notificationRouter);



connectDB();
export { app };
