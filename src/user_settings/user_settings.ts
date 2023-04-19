export class UserSettings {
    user_id!: string;
    match_notification_moment?: number;

    static fromData(userId: string, data: any): UserSettings {
        return {
            user_id: userId,
            match_notification_moment: data.match_notification_moment,
        };
    }
}