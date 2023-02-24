import express, { Express, Request, Response } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore  } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { TournamentsRepository } from './tournaments/tournaments_repository';
import { startMainScheduler } from './scheduler/scheduler';
import { forcePTM } from './ptm/monitor';
import { forceATM } from './atm/monitor';

const startTime = new Date();

dotenv.config();

const serviceAccount = require('../firebase-service-account.json');

initializeApp({
    credential: cert(serviceAccount),
});

const firestore = getFirestore();
const app: Express = express();
const port = process.env.PORT;

export const tournamentsRepository = new TournamentsRepository(firestore);

// Refresh tournaments
tournamentsRepository.refeshTournaments();

app.get('/', async (req: Request, res: Response) => {
  res.json({ message: 'Server started at: ' + startTime.toISOString() });
});

app.post('/atm', async (req: Request, res: Response) => {
    forceATM();
    res.json({ message: 'ATM started' });
});
app.post('/ptm', async (req: Request, res: Response) => {
    forcePTM();
    res.json({ message: 'PTM started' });
});


// console.log('test');
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

// Start main scheduler (every 1 hour)
startMainScheduler();
