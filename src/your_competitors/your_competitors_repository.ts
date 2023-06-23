import { logger } from "../app";
import * as fs from 'fs';
import { YourCompetitor } from "./your_competitor";

export const YOUR_COMPETITORS_COLLECTION = 'your_competitors';

export class YourCompetitorsRepository {
    constructor(private readonly db: FirebaseFirestore.Firestore) { }

    public async refreshYourCompetitors(tournamentIds: string[] | undefined, id: string | undefined = undefined): Promise<void> {
        var list: YourCompetitor[] = [];

        if (id !== undefined) {
            // Refresh only one document
            const parts = id.split('_');
            const userId = parts[0];
            const tournamentId = parts[1];

            // Remove old competitors from this document
            list = await this.getYourCompetitors();
            list = list.filter((comp) => comp.user_id !== userId || comp.tournament_id !== tournamentId);

            // Add new competitors from this document
            const doc = await this.collection().doc(id).get();
            if (doc.exists) {
                const data = doc.data()!;
                const comps = data.your_competitors as any[];
                comps.forEach((comp) => {
                    list.push({
                        ...comp,
                        user_id: data.user_id,
                        tournament_id: data.tournament_id,
                    });
                });
            }
        } else if (tournamentIds!.length > 0) {
            // Refresh all documents
            const snapshot = await this.collection()
                .where('tournament_id', 'in', tournamentIds)
                .get();

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
        } else {
            logger.debug('No tournaments for your competitors');
        }

        const yourCompetitors = {
            your_competitors: list,
            timestamp: new Date().toISOString(),
        };

        fs.writeFileSync(process.env.YOUR_COMPETITORS_FILE!, JSON.stringify(yourCompetitors, null, 2));
    }

    public async getYourCompetitors(): Promise<YourCompetitor[]> {
        const yourCompetitors = fs.readFileSync(process.env.YOUR_COMPETITORS_FILE!, 'utf-8');
        return JSON.parse(yourCompetitors).your_competitors;
    }

    private collection() {
        return this.db.collection(YOUR_COMPETITORS_COLLECTION);
    }
}