import { logger } from "../app";
import { MatchNotification } from "./match_notification";
import * as fs from 'fs/promises';
import { FieldValue } from "firebase-admin/firestore";
import { AdminNotification } from "./admin_notification";
import { JsonHelper } from "../json_helper";
import axios from "axios";

const NOTIFICATIONS_COLLECTION = 'tournament_notifications';
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
                const notsMap = data.notifications as Record<string, any>;
                const nots = Object.keys(notsMap).map((key) => {
                    return {
                        ...notsMap[key],
                        id: key,
                    };
                });

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

        await fs.writeFile(process.env.NOTIFICATIONS_FILE!, JSON.stringify(notifications, null, 2));
    }

    public async createMatchNotifications(notifications: MatchNotification[]): Promise<void> {
        const sentNotifications = await this.getSentMatchNotifications();

        // Skip already sent notifications
        const newNotifications = notifications.filter((notification) => {
            return !sentNotifications.some((sentNotification) => {
                return MatchNotification.isSimilar(notification, sentNotification);
            });
        });

        if (newNotifications.length > 0) {
            // Save notifications
            const promises = newNotifications.map((notification) => {
                const doc = this.collection().doc(this._doc(notification.user_id, notification.tournament_id));
                const id = Math.random().toString(36).substring(2, 15);
                return doc.set({
                    notifications: {
                        [id]: MatchNotification.toData(notification),
                    },
                    user_id: notification.user_id,
                    tournament_id: notification.tournament_id,
                    updated_at: FieldValue.serverTimestamp(),
                }, { merge: true });
            });

            await Promise.all(promises);
        }

        // Save current notifications to cache (remote old cache for this tournaments to avoid keeping old notifications)
        const tournamentIds = new Set(notifications.map((notification) => notification.tournament_id));
        const cacheNotifications = [
            ...sentNotifications.filter((notification) => {
                return !tournamentIds.has(notification.tournament_id);
            }),
            ...notifications,
        ];
        logger.debug(`Sent notifications: ${sentNotifications.length}`);
        logger.debug(`New notifications: ${newNotifications.length}`);
        logger.debug(`Cache notifications: ${cacheNotifications.length}`);

        const notificationsData = {
            notifications: cacheNotifications,
            timestamp: new Date().toISOString(),
        };
        await fs.writeFile(process.env.NOTIFICATIONS_FILE!, JSON.stringify(notificationsData, null, 2));

        logger.info(`Sent ${newNotifications.length} notifications`);
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

        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
            },
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

        await fs.writeFile(process.env.ADMIN_NOTIFICATIONS_FILE!, JSON.stringify(notificationsData, null, 2));
    }

    public async clearSentAdminNotifications() {
        await fs.unlink(process.env.ADMIN_NOTIFICATIONS_FILE!);
    }

    private async getSentMatchNotifications(): Promise<MatchNotification[]> {
        const notifications = await fs.readFile(process.env.NOTIFICATIONS_FILE!, 'utf-8');
        return JSON.parse(notifications).notifications;
    }

    private async getSentAdminNotifications(): Promise<AdminNotification[]> {
        try {
            await fs.access(process.env.ADMIN_NOTIFICATIONS_FILE!);
        } catch (err) {
            return [];
        }

        const notifications = await fs.readFile(process.env.ADMIN_NOTIFICATIONS_FILE!, 'utf-8');
        const notificationsData = JsonHelper.parse(notifications);

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