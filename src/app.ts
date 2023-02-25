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
import { YourCompetitorsRepository } from './your_competitors/your_competitors_repository';
import { startActiveScheduler, stopActiveScheduler } from './scheduler/active_scheduler';

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
const app: Express = express();
const port = process.env.PORT;

export const tournamentsRepository = new TournamentsRepository(firestore);
export const yourCompetitorsRepository = new YourCompetitorsRepository(firestore);

async function refreshCache(): Promise<void> {
    await tournamentsRepository.refreshTournaments();

    const tournaments = await tournamentsRepository.getTournaments();

    const now = new Date();
    const activeIds = tournaments
        .filter(tournament => {
            if (tournament.state != 'public') return;
            if (tournament.html_results === undefined) return;

            const start_date = new Date(tournament.start_date);
            const end_date = new Date(tournament.end_date);
            end_date.setDate(end_date.getDate() + 1);

            return start_date < now && end_date > now;
        })
        .map(tournament => tournament.id!);

    await yourCompetitorsRepository.refreshYourCompetitors(activeIds);

    logger.info('Cache refreshed');

    // Ensure that main scheduler is running
    startMainScheduler();

    // Run active scheduler if there are active tournaments or stop it otherwise
    if (activeIds.length > 0) {
        startActiveScheduler();
    } else {
        stopActiveScheduler();
    }
}

// Initialize cache and start main scheduler
refreshCache().then(() => {
    startMainScheduler();
});


app.get('/', async (req: Request, res: Response) => {
    res.json({ message: 'Server started at: ' + startTime.toISOString() });
});
app.post('/refresh', async (req: Request, res: Response) => {
    await refreshCache();
    res.json({ message: 'Cache refreshed' });
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
