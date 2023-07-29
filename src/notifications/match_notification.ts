import { DocumentData, Timestamp } from "firebase-admin/firestore";

export declare type MatchSide = 'left' | 'right' | 'both';

export class MatchNotification {
    user_id!: string;
    tournament_id!: string;
    competitor_id!: string;
    tatami!: number;
    match_order!: number;
    category!: string;
    l_name!: string;
    l_club!: string;
    r_name!: string;
    r_club!: string;
    side!: MatchSide;
    live_id?: string;
    timestamp!: Date;


    /**
     * Compares two notifications if they are similar
     * @param notification1 Notification to compare
     * @param notification2 Notification to compare
     * @returns True if notifications relate to the same user and match (match number can be different)
     */
    static isSimilar(notification1: MatchNotification, notification2: MatchNotification): boolean {
        return notification1.user_id === notification2.user_id
            && notification1.tournament_id === notification2.tournament_id
            && notification1.competitor_id === notification2.competitor_id
            && notification1.tatami === notification2.tatami
            && notification1.category === notification2.category
            && notification1.l_name === notification2.l_name
            && notification1.l_club === notification2.l_club
            && notification1.r_name === notification2.r_name
            && notification1.r_club === notification2.r_club
            && notification1.side === notification2.side;
    }

    static toData(notification: MatchNotification): DocumentData {
        return {
            read: false,
            type: notification.live_id == undefined
                ? 'upcoming_match'
                : 'upcoming_match_live',
            data: {
                competitor_id: notification.competitor_id,
                tatami: notification.tatami,
                match: notification.match_order + 1, // backwards compatibility (<= 3.1.5)
                match_order: notification.match_order,
                l_name: notification.l_name,
                l_club: notification.l_club,
                r_name: notification.r_name,
                r_club: notification.r_club,
                side: notification.side,
                live_id: notification.live_id,
            },
            updated_at: Timestamp.now(),
            created_at: Timestamp.now(),
        };
    }
}
