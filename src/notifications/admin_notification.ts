import { Tournament } from "../tournaments/tournament";

export class AdminNotification {
    title!: string;
    body!: string;
    url!: string;
    timestamp!: Date;

    static createTournamentNotAvailable(tournament: Tournament): AdminNotification {
        return {
            title: 'Tournament not available',
            body: `Tournament ${tournament.name['en']} is not available. URL: ${tournament.html_results?.url}`,
            url: `tournaments/${tournament.id}`,
            timestamp: new Date(),
        };
    }

    static createNewTournament(url: string): AdminNotification {
        return {
            title: 'New tournament',
            body: `New tournament is available. URL: ${url}`,
            url: url,
            timestamp: new Date(),
        };
    }
}
