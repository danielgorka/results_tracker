import { logger } from "../app";
import * as fs from 'fs/promises';
import { UserSettings } from "./user_settings";
import { YourCompetitor } from "../your_competitors/your_competitor";

export const USER_SETTINGS_COLLECTION = 'user_settings';

export class UserSettingsRepository {
    constructor(private readonly db: FirebaseFirestore.Firestore) { }

    /**
     * Refreshes user settings for all users in ongoing tournaments.
     * @param yourCompetitors All your competitors for ongoing tournaments. Used to get all user ids to get settings for.
     * @param userId Optional user id to refresh settings for. Use instead of yourCompetitors to refresh only one user keeping others untouched.
     */
    public async refreshUserSettings(yourCompetitors: YourCompetitor[] | undefined, userId: string | undefined = undefined): Promise<void> {
        let userIds: string[];
        if (userId === undefined) {
            userIds = [...new Set(yourCompetitors!.map((comp) => comp.user_id))];
        } else {
            userIds = [userId];
        }

        if (userIds.length == 0) {
            logger.debug('No users to get settings for');
            return;
        }

        const promises = userIds.map(async (userId) => {
            const snapshot = await this.collection().doc(userId).get();

            const data = snapshot.data();
            if (data) {
                return UserSettings.fromData(userId, data);
            } else {
                return null;
            }
        });

        const results = await Promise.all(promises);

        let list = results.filter((result) => result != null) as UserSettings[];

        if (userId !== undefined) {
            // Refresh only one user - add old settings for other users
            const oldSettings = await this.getUserSettings();
            list.push(...oldSettings.filter((setting) => setting.user_id !== userId));
        }

        const userSettings = {
            user_settings: list,
            timestamp: new Date().toISOString(),
        };

        await fs.writeFile(process.env.USER_SETTINGS_FILE!, JSON.stringify(userSettings, null, 2));
    }

    public async getUserSettings(): Promise<UserSettings[]> {
        const userSettings = await fs.readFile(process.env.USER_SETTINGS_FILE!, 'utf-8');
        return JSON.parse(userSettings).user_settings;
    }

    private collection() {
        return this.db.collection(USER_SETTINGS_COLLECTION);
    }
}