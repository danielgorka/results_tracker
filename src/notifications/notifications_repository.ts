import { logger } from "../app";
import { MatchNotification } from "./match_notification";
import * as fs from 'fs/promises';
import { FieldValue } from "firebase-admin/firestore";
import { AdminNotification } from "./admin_notification";

const NOTIFICATIONS_COLLECTION = 'tournament_notifications';
const NOTIFICATIONS_FILE = 'tmp/match_notifications.json';
const ADMIN_NOTIFICATIONS_FILE = 'tmp/admin_notifications.json';
const ADMIN_NOTIFICATIONS_TIMEOUT = 1000 * 60 * 60 * 24; // 24 hours

export class NotificationsRepository {
    constructor(private readonly db: FirebaseFirestore.Firestore) { }

    public async refreshMatchNotifications(tournamentIds: string[]): Promise<void> {
        var list: MatchNotification[] = [];

        if (tournamentIds.length > 0) {
            const snapshot = await this.collection()
                .where('tournament_id', 'in', tournamentIds)
                .get();


            snapshot.forEach((doc) => {
                const data = doc.data();
                const nots = data.notifications as any[];
                nots.forEach((not) => {
                    list.push({
                        ...not.data,
                        user_id: data.user_id,
                        tournament_id: data.tournament_id,
                    });
                });
            });
        } else {
            logger.debug('No tournaments for notifications');
        }

        const notifications = {
            notifications: list,
            timestamp: new Date().toISOString(),
        };

        await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    }

    public async createMatchNotifications(notifications: MatchNotification[]): Promise<void> {
        const sentNotifications = await this.getSentMatchNotifications();

        // Skip already sent notifications
        const list = notifications.filter((notification) => {
            return !sentNotifications.some((sentNotification) => {
                return sentNotification.user_id === notification.user_id
                    && sentNotification.tournament_id === notification.tournament_id
                    && sentNotification.l_name === notification.l_name
                    && sentNotification.l_club === notification.l_club
                    && sentNotification.r_name === notification.r_name
                    && sentNotification.r_club === notification.r_club;
            });
        });

        if (list.length > 0) {
            // Find new users for specific tournaments that don't have notifications yet
            const knownIds = sentNotifications.map((notification) => this._doc(notification.user_id, notification.tournament_id));
            const newIds = notifications.map((notification) => this._doc(notification.user_id, notification.tournament_id))
                .filter((id) => !knownIds.includes(id));


            const batch = this.db.batch();

            // Create empty notifications documents for users that don't have it yet
            newIds.forEach((id) => {
                const doc = this.collection().doc(id);
                const [user_id, tournament_id] = id.split('_', 2);
                batch.set(doc, {
                    user_id: user_id,
                    tournament_id: tournament_id,
                    notifications: {},
                    updated_at: FieldValue.serverTimestamp(),
                    created_at: FieldValue.serverTimestamp(),
                });
            });

            // Save new notifications
            list.forEach((notification) => {
                const doc = this.collection().doc(this._doc(notification.user_id, notification.tournament_id));
                const id = Math.random().toString(36).substring(2, 15);
                const notificationPath = `notifications.${id}`;
                batch.update(doc, {
                    [notificationPath]: MatchNotification.toData(notification),
                    updated_at: FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
        }

        // Save to cache
        const notificationsData = {
            notifications: notifications,
            timestamp: new Date().toISOString(),
        };
        await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notificationsData, null, 2));

        logger.info(`Sent ${list.length} notifications`);
    }

    public async sendAdminNotification(notification: AdminNotification) {
        const sentNotifications = await this.getSentAdminNotifications();

        if (sentNotifications.some((sentNotification) =>
            sentNotification.title === notification.title
            && sentNotification.body === notification.body
            && sentNotification.url === notification.url)) {
            logger.debug(`Admin notification already sent: ${notification.title}`);
            return;
        }

        const url = process.env.SEND_ADMIN_NOTIFICATION_URL!;
        const body = JSON.stringify(notification);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (response.status === 200) {
            logger.info(`Sent admin notification: ${notification.title}`);
        } else {
            logger.error(`Failed to send admin notification: ${response.statusText}`);
        }

        // Save to cache
        sentNotifications.push(notification);
        const notificationsData = {
            notifications: sentNotifications,
            timestamp: new Date(),
        };

        await fs.writeFile(ADMIN_NOTIFICATIONS_FILE, JSON.stringify(notificationsData, null, 2));
    }

    private async getSentMatchNotifications(): Promise<MatchNotification[]> {
        const notifications = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
        return JSON.parse(notifications).notifications;
    }

    private async getSentAdminNotifications(): Promise<AdminNotification[]> {
        try {
            await fs.access(ADMIN_NOTIFICATIONS_FILE);
        } catch (err) {
            return [];
        }

        const notifications = await fs.readFile(ADMIN_NOTIFICATIONS_FILE, 'utf-8');
        const notificationsData = JSON.parse(notifications);

        // Remove old notifications
        const now = new Date().getTime();
        const notificationsList = notificationsData.notifications as AdminNotification[];
        const filteredNotifications = notificationsList.filter((notification) => {
            const notificationTime = notification.timestamp.getTime();
            return now - notificationTime < ADMIN_NOTIFICATIONS_TIMEOUT;
        });

        return filteredNotifications;
    }

    private _doc(user_id: string, tournament_id: string) {
        return `${user_id}_${tournament_id}`;
    }

    private collection() {
        return this.db.collection(NOTIFICATIONS_COLLECTION);
    }
}