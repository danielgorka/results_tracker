import { Tournament } from "./tournament";
import * as fs from 'fs/promises';
import { logger } from "../app";

export const TOURNAMENTS_COLLECTION = 'tournaments';

export class TournamentsRepository {
    constructor(private readonly db: FirebaseFirestore.Firestore) { }

    public async refreshTournaments(): Promise<void> {
        const snapshot = await this.collection()
            .where('state', '==', 'public')
            .orderBy('start_date', 'desc')
            .orderBy('end_date', 'desc')
            .orderBy('created_at')
            .get();

        const tournaments = { 
            tournaments: snapshot.docs.map((doc) => Tournament.fromDocumentSnapshot(doc)),
            timestamp: new Date().toISOString(),
        };

        await fs.writeFile(process.env.TOURNAMENTS_FILE!, JSON.stringify(tournaments, null, 2));
    }

    public async getTournaments(): Promise<Tournament[]> {
        const tournaments = await fs.readFile(process.env.TOURNAMENTS_FILE!, 'utf-8');
        return JSON.parse(tournaments).tournaments;
    }

    private collection() {
        return this.db.collection(TOURNAMENTS_COLLECTION);
    }
}