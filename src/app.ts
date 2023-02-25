import express, { Express, Request, Response } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { TournamentsRepository } from './tournaments/tournaments_repository';
import { forcePTM } from './ptm/monitor';
import { forceATM } from './atm/monitor';
import { YourCompetitorsRepository } from './your_competitors/your_competitors_repository';
import { NotificationsRepository } from './notifications/notifications_repository';
import { refreshTournaments, refreshCache, refreshMatchNotifications, refreshYourCompetitors } from './cache/cache';
import { runOTA } from './ota/analyzer';

const startTime = new Date();
export const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
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
firestore.settings({ ignoreUndefinedProperties: true });

const app: Express = express();
const port = process.env.PORT;

export const tournamentsRepository = new TournamentsRepository(firestore);
export const yourCompetitorsRepository = new YourCompetitorsRepository(firestore);
export const notificationsRepository = new NotificationsRepository(firestore);

// Initialize cache and start main scheduler
refreshCache();


app.get('/', async (req: Request, res: Response) => {
    res.json({ message: 'Server started at: ' + startTime.toISOString() });
});

app.post('/refresh', async (req: Request, res: Response) => {
    await refreshCache();
    res.json({ message: 'Full cache refreshed' });
});
app.post('/refresh/tournaments', async (req: Request, res: Response) => {
    await refreshTournaments();
    res.json({ message: 'Tournaments cache refreshed' });
});
app.post('/refresh/your_competitors', async (req: Request, res: Response) => {
    await refreshYourCompetitors();
    res.json({ message: 'Your competitors cache refreshed' });
});
app.post('/refresh/notifications', async (req: Request, res: Response) => {
    await refreshMatchNotifications();
    res.json({ message: 'Notifications cache refreshed' });
});

app.post('/atm', async (req: Request, res: Response) => {
    await forceATM();
    res.json({ message: 'ATM started' });
});
app.post('/ptm', async (req: Request, res: Response) => {
    await forcePTM();
    res.json({ message: 'PTM started' });
});
app.post('/ota', async (req: Request, res: Response) => {
    await runOTA();
    res.json({ message: 'OTA started' });
});

app.listen(port, () => {
    logger.info(`⚡️[server]: Server is running at http://localhost:${port}`);
});
