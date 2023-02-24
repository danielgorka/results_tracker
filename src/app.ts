import express, { Express, Request, Response } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { TournamentsRepository } from './tournaments/tournaments_repository';
import { startMainScheduler } from './scheduler/scheduler';
import { forcePTM } from './ptm/monitor';
import { forceATM } from './atm/monitor';

const startTime = new Date();
export const logger = winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
            filename: "logs/%DATE%.log",
            datePattern: "YYYY-MM-DD",
        }),
    ],

});

dotenv.config();

const serviceAccount = require('../firebase-service-account.json');

initializeApp({
    credential: cert(serviceAccount),
});

const firestore = getFirestore();
const app: Express = express();
const port = process.env.PORT;

export const tournamentsRepository = new TournamentsRepository(firestore);

app.get('/', async (req: Request, res: Response) => {
    res.json({ message: 'Server started at: ' + startTime.toISOString() });
});

app.post('/atm', async (req: Request, res: Response) => {
    await forceATM();
    res.json({ message: 'ATM started' });
});
app.post('/ptm', async (req: Request, res: Response) => {
    await forcePTM();
    res.json({ message: 'PTM started' });
});


app.listen(port, () => {
    logger.info(`⚡️[server]: Server is running at http://localhost:${port}`);
});


// Refresh tournaments
tournamentsRepository.refeshTournaments().then(() => {
    // Start main scheduler
    startMainScheduler();
});


