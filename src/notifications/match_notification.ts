import { DocumentData, Timestamp } from "firebase-admin/firestore";

export declare type MatchSide = 'left' | 'right';

export class MatchNotification {
    user_id!: string;
    tournament_id!: string;
    competitor_id!: string;
    tatami!: number;
    match!: number;
    l_name?: string;
    l_club?: string;
    r_name?: string;
    r_club?: string;
    side?: MatchSide;

    static toData(notification: MatchNotification): DocumentData {
        return {
            read: false,
            type: 'upcoming_match',
            data: {
                competitor_id: notification.competitor_id,
                tatami: notification.tatami,
                match: notification.match,
                l_name: notification.l_name,
                l_club: notification.l_club,
                r_name: notification.r_name,
                r_club: notification.r_club,
                side: notification.side,
            },
            updated_at: Timestamp.now(),
            created_at: Timestamp.now(),
        };
    }
}
