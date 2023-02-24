import { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import { IntTimestamp } from "../core/domain/int_timestamp";
import { formatDate } from "../core/utils";

// MIRROR FROM FIREBASE PROJECT
export declare type TournamentState = 'private' | 'public' | 'outdated';

export declare type TranslatableString = {
    [key: string]: string;
};

export class TournamentHtmlResults {
    url!: string;
    visible_url!: string;

    static fromData(data: DocumentData | undefined): TournamentHtmlResults | undefined {
        if (data == undefined) {
            return undefined;
        }
        return {
            url: data.url,
            visible_url: data.visible_url,
        };
    }

    static toData(results: TournamentHtmlResults | undefined): DocumentData | undefined {
        if (results == undefined) {
            return undefined;
        }
        return {
            url: results.url,
            visible_url: results.visible_url,
        };
    }
}

export class TournamentLinks {
    registration?: TranslatableString | null;
    outlines?: TranslatableString | null;
    website?: TranslatableString | null;
    facebook?: TranslatableString | null;

    static fromData(data: DocumentData | undefined): TournamentLinks | undefined {
        if (data == undefined) {
            return undefined;
        }
        return {
            registration: data.registration,
            outlines: data.outlines,
            website: data.website,
            facebook: data.facebook,
        };
    }

    static toData(links: TournamentLinks | undefined): DocumentData | undefined {
        if (links == undefined) {
            return undefined;
        }
        return {
            registration: links.registration,
            outlines: links.outlines,
            website: links.website,
            facebook: links.facebook,
        };
    }
};

export abstract class TournamentVideos {
    items!: TournamentVideoItem[];

    static fromData(data: DocumentData | undefined): TournamentVideos | undefined {
        if (data == undefined) {
            return undefined;
        }
        return {
            items: data.items.map((item: DocumentData) => TournamentVideoItem.fromData(item)),
        };
    }

    static toData(videos: TournamentVideos | undefined): DocumentData | undefined {
        if (videos == undefined) {
            return undefined;
        }

        return {
            items: videos.items.map((item: TournamentVideoItem) => TournamentVideoItem.toData(item)),
        };
    }
}

export abstract class TournamentVideoItem {
    static fromData(data: DocumentData): TournamentVideoItem {
        if (data.id == undefined) {
            return TournamentVideoSection.fromData(data);
        } else {
            return TournamentVideo.fromData(data);
        }
    }

    static toData(item: TournamentVideoItem): DocumentData {
        if ((item as any).section != undefined) {
            return TournamentVideoSection.toData(item as TournamentVideoSection);
        } else {
            return TournamentVideo.toData(item as TournamentVideo);
        }
    }
}

export declare type TournamentVideoType = 'draw' | 'tatami' | 'finals' | 'decorations' | 'other';

export class TournamentVideo implements TournamentVideoItem {
    video!: TournamentVideoType;
    tatami?: number;
    name?: string;
    id!: string;

    static fromData(data: DocumentData): TournamentVideo {
        return {
            video: data.video,
            tatami: data.tatami,
            name: data.name,
            id: data.id,
        };
    }

    static toData(video: TournamentVideo): DocumentData {
        return {
            video: video.video,
            tatami: video.tatami,
            name: video.name,
            id: video.id,
        };
    }
}

export declare type TournamentVideoSectionType = 'day' | 'eliminations' | 'finals' | 'day_eliminations' | 'day_finals';

export class TournamentVideoSection implements TournamentVideoItem {
    section!: TournamentVideoSectionType;
    day?: number;
    name?: string;

    static fromData(data: DocumentData): TournamentVideoSection {
        return {
            section: data.section,
            day: data.day,
            name: data.name,
        };
    }

    static toData(section: TournamentVideoSection): DocumentData {
        return {
            section: section.section,
            day: section.day,
            name: section.name,
        };
    }
}

export abstract class TournamentSchedule {
    days!: TournamentScheduleDay[];

    static fromData(data: DocumentData | undefined): TournamentSchedule | undefined {
        if (data == undefined) {
            return undefined;
        }
        return {
            days: data.days.map((day: DocumentData) => TournamentScheduleDay.fromData(day)),
        };
    }

    static toData(schedule: TournamentSchedule | undefined): DocumentData | undefined {
        if (schedule == undefined) {
            return undefined;
        }
        return {
            days: schedule.days.map((day: TournamentScheduleDay) => TournamentScheduleDay.toData(day)),
        };
    }
}

export class TournamentScheduleDay {
    date!: string;
    events!: TournamentScheduleEvent[];

    static fromData(data: DocumentData): TournamentScheduleDay {
        return {
            date: data.date,
            events: data.events.map((event: DocumentData) => TournamentScheduleEvent.fromData(event)),
        };
    }

    static toData(day: TournamentScheduleDay): DocumentData {
        return {
            date: day.date,
            events: day.events.map((event) => TournamentScheduleEvent.toData(event)),
        };
    }
}

export class TournamentScheduleEvent {
    name!: TranslatableString;
    start_time!: number;
    end_time!: number;

    static fromData(data: DocumentData): TournamentScheduleEvent {
        return {
            name: data.name,
            start_time: data.start_time,
            end_time: data.end_time,
        };
    }

    static toData(event: TournamentScheduleEvent): DocumentData {
        return {
            name: event.name,
            start_time: event.start_time,
            end_time: event.end_time,
        };
    }
}

export class Tournament {
    id?: string;
    locales!: string[];
    timezone!: string;
    name!: TranslatableString;
    state!: TournamentState;
    start_date!: string;
    end_date!: string;
    place!: TranslatableString;
    country!: string;
    html_results?: TournamentHtmlResults;
    realtime_results!: boolean;
    image_url!: TranslatableString;
    links?: TournamentLinks;
    location_url?: string;
    videos?: TournamentVideos;
    schedule?: TournamentSchedule;
    created_at!: IntTimestamp;
    updated_at!: IntTimestamp;

    static create(): Tournament {
        //TODO(public-console): get values from user (timezone, country, ect.)
        return {
            locales: ['en'],
            timezone: 'Europe/Warsaw',
            name: {
                'en': 'Example Tournament',
            },
            state: 'private',
            start_date: formatDate(new Date()),
            end_date: formatDate(new Date()),
            place: {
                'en': 'City',
            },
            country: 'PL',
            html_results: undefined,
            realtime_results: false,
            image_url: {
                'en': 'https://example.com/image.png',
            },
            links: undefined,
            location_url: undefined,
            videos: undefined,
            schedule: undefined,
            created_at: IntTimestamp.now(),
            updated_at: IntTimestamp.now(),
        };
    }

    static fromDocumentSnapshot(document: DocumentSnapshot): Tournament {
        const data = document.data()!;
        return {
            id: document.id,
            locales: data.locales,
            timezone: data.timezone,
            name: data.name,
            state: data.state,
            start_date: data.start_date,
            end_date: data.end_date,
            place: data.place,
            country: data.country,
            html_results: TournamentHtmlResults.fromData(data.html_results),
            realtime_results: data.realtime_results,
            image_url: data.image_url,
            links: TournamentLinks.fromData(data.links),
            location_url: data.location_url,
            videos: TournamentVideos.fromData(data.videos),
            schedule: TournamentSchedule.fromData(data.schedule),
            created_at: IntTimestamp.fromTimestamp(data.created_at),
            updated_at: IntTimestamp.fromTimestamp(data.updated_at),
        };
    }

    static toData(tournament: Tournament): DocumentData {
        return {
            locales: tournament.locales,
            timezone: tournament.timezone,
            name: tournament.name,
            state: tournament.state,
            start_date: tournament.start_date,
            end_date: tournament.end_date,
            place: tournament.place,
            country: tournament.country,
            html_results: TournamentHtmlResults.toData(tournament.html_results),
            realtime_results: tournament.realtime_results,
            image_url: tournament.image_url,
            links: TournamentLinks.toData(tournament.links),
            location_url: tournament.location_url,
            videos: TournamentVideos.toData(tournament.videos),
            schedule: TournamentSchedule.toData(tournament.schedule),
            created_at: tournament.created_at.toFieldValue(),
            updated_at: tournament.updated_at.toFieldValue(),
        };
    }
}
