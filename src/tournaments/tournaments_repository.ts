import { Tournament } from "./tournament";
import * as fs from 'fs/promises';
import { logger } from "../app";

export const TOURNAMENTS_FILE = 'tmp/tournaments.json';
export const TOURNAMENTS_COLLECTION = 'tournaments';

export class TournamentsRepository {
    constructor(private readonly db: FirebaseFirestore.Firestore) { }

    public async refreshTournaments(): Promise<void> {
        const snapshot = await this.collection()
            .where('state', '!=', 'outdated')
            .orderBy('state')
            .orderBy('created_at')
            .orderBy('end_date', 'desc')
            .orderBy('start_date', 'desc')
            .get();

        const tournaments = { 
            tournaments: snapshot.docs.map((doc) => Tournament.fromDocumentSnapshot(doc)),
            timestamp: new Date().toISOString(),
        };

        await fs.writeFile(TOURNAMENTS_FILE, JSON.stringify(tournaments, null, 2));
    }

    public async getTournaments(): Promise<Tournament[]> {
        const tournaments = await fs.readFile(TOURNAMENTS_FILE, 'utf-8');
        return JSON.parse(tournaments).tournaments;
    }

    private collection() {
        return this.db.collection(TOURNAMENTS_COLLECTION);
    }
}