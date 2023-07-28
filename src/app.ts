import express, { ErrorRequestHandler, Express, Request, Response } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { TournamentsRepository } from './tournaments/tournaments_repository';
import { YourCompetitorsRepository } from './your_competitors/your_competitors_repository';
import { NotificationsRepository } from './notifications/notifications_repository';
import { refreshTournaments, refreshCache, refreshMatchNotifications, refreshYourCompetitors, refreshUserSettings } from './cache/cache';
import { runOTA } from './ota/analyzer';
import { runPTM } from './ptm/monitor';
import { runATM } from './atm/monitor';
import axios from 'axios';
import { Agent } from 'https';
import { UserSettingsRepository } from './user_settings/user_settings_repository';
import 'express-async-errors';

const startTime = new Date();

dotenv.config();

export const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
            filename: process.env.LOGS_FILENAME,
            datePattern: "YYYY-MM-DD",
        }),
    ],

});

process.on('uncaughtException', function (err) {
    logger.error('Uncaught exception: ' + err);
    logger.error(err.stack);
});

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT == null
    ? require('../firebase-service-account.json')
    : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

initializeApp({
    credential: cert(serviceAccount),
});

axios.defaults.timeout = 30000;
axios.defaults.httpsAgent = new Agent({ keepAlive: true });

const firestore = getFirestore();
firestore.settings({ ignoreUndefinedProperties: true });

const app: Express = express();
const port = process.env.PORT || 8000;

export const tournamentsRepository = new TournamentsRepository(firestore);
export const yourCompetitorsRepository = new YourCompetitorsRepository(firestore);
export const userSettingsRepository = new UserSettingsRepository(firestore);
export const notificationsRepository = new NotificationsRepository(firestore);

// Add JSON body parser
app.use(express.json());

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
    const id = req.body.id as string | undefined;
    await refreshYourCompetitors(undefined, id);
    res.json({ message: 'Your competitors cache refreshed' });
});
app.post('/refresh/user_settings', async (req: Request, res: Response) => {
    const id = req.body.id as string | undefined;
    await refreshUserSettings(undefined, id);
    res.json({ message: 'Use settings cache refreshed' });
});
app.post('/refresh/notifications', async (req: Request, res: Response) => {
    await refreshMatchNotifications();
    res.json({ message: 'Notifications cache refreshed' });
});

app.post('/clear/admin_nots', (req: Request, res: Response) => {
     notificationsRepository.clearSentAdminNotifications();
    res.json({ message: 'Sent admin notifications cleared' });
});

app.post('/atm', async (req: Request, res: Response) => {
    // Unawaited
    runATM(true);
    res.json({ message: 'ATM started' });
});
app.post('/ptm', async (req: Request, res: Response) => {
    await runPTM(true);
    res.json({ message: 'PTM started' });
});
app.post('/ota', async (req: Request, res: Response) => {
    await runOTA();
    res.json({ message: 'OTA started' });
});

// Catch 404
app.use(function (req, res, next) {
    res.status(404).json({ message: 'Not found' });
});

// Catch Express errors
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    logger.error('Caught exception: ' + err);
    logger.error(err.stack);
    if (res.headersSent) {
        return next(err)
    }
    res.status(500).json({ message: 'Internal server error' });
};
app.use(errorHandler);

app.listen(port, () => {
    logger.info(`⚡️[server]: Server is running at http://localhost:${port}`);

    setTimeout(() => {
        // Initialize cache and start main scheduler
        refreshCache();
    }, 5000);
});
