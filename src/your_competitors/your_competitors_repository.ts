import { logger } from "../app";
import * as fs from 'fs/promises';
import { YourCompetitor } from "./your_competitor";

export const YOUR_COMPETITORS_FILE = 'tmp/your_competitors.json';
export const YOUR_COMPETITORS_COLLECTION = 'your_compititors';

export class YourCompetitorsRepository {
    constructor(private readonly db: FirebaseFirestore.Firestore) { }

    public async refreshYourCompetitors(tournamentIds: string[]): Promise<void> {
        if (tournamentIds.length === 0) {
            logger.debug('No tournaments to refresh your competitors');
            return;
        }

        const snapshot = await this.collection()
            .where('tournament_id', 'in', tournamentIds)
            .get();

        var list: YourCompetitor[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            const comps = data.your_competitors as any[];
            comps.forEach((comp) => {
                list.push({
                    ...comp,
                    user_id: data.user_id,
                    tournament_id: data.tournament_id,
                });
            });
        });


        const yourCompetitors = {
            your_competitors: list,
            timestamp: new Date().toISOString(),
        };


        await fs.writeFile(YOUR_COMPETITORS_FILE, JSON.stringify(yourCompetitors, null, 2));
        logger.debug('Your competitors cache refreshed');
    }

    public async getYourCompetitors(): Promise<YourCompetitor[]> {
        const yourCompetitors = await fs.readFile(YOUR_COMPETITORS_FILE, 'utf-8');
        return JSON.parse(yourCompetitors).your_competitors;
    }

    private collection() {
        return this.db.collection(YOUR_COMPETITORS_COLLECTION);
    }
}