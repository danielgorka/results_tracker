import { logger, notificationsRepository, tournamentsRepository, yourCompetitorsRepository } from "../app";
import { analyzeNextMatches, getRawMatchesData, getRawWinners } from "../matches/analyze";
import { Match } from "../matches/match";
import { MatchNotification, MatchSide } from "../notifications/match_notification";
import { YourCompetitor } from "../your_competitors/your_competitor";

/// Starts the Ongoing Tournaments Analyzer
///
/// Should be run every 5 seconds.
/// Analyzes all ongoing tournaments which has your competitors.
export async function runOTA() {
    logger.info('OTA started');

    const your_competitors = await yourCompetitorsRepository.getYourCompetitors();
    const tournaments = await tournamentsRepository.getTournaments();

    for (const tournament of tournaments) {
        const comps = your_competitors.filter(your_competitor => your_competitor.tournament_id === tournament.id);
        if (comps.length === 0) {
            // Tournament has no your competitors
            continue;
        }

        const notifications = await createNotifications(tournament.html_results!.url, comps);

        logger.debug(`OTA found ${notifications.length} possible notifications for tournament ${tournament.id}`);

        notificationsRepository.createMatchNotifications(notifications);
    }
}

async function createNotifications(url: string, comps: YourCompetitor[]): Promise<MatchNotification[]> {
    const winners = await getRawWinners(url);
    if (winners === undefined) {
        return [];
    }

    // Remove finished competitors
    comps = comps.filter(comp => !winners[parseInt(comp.competitor_id)]);
    if (comps.length === 0) {
        logger.debug('OTA found no competitors to analyze (all finished)');
        return [];
    }

    const data = await getRawMatchesData(url);
    if (data === undefined) {
        return [];
    }

    var notifications: MatchNotification[] = [];

    for (const comp of comps) {
        const row = data[parseInt(comp.competitor_id)];

        if (row !== undefined && row[0] > 0) {
            logger.debug(`OTA found competitor ${comp.competitor_id} on tatami ${row[0]} and match ${row[1] + 1}`);
            // Creating partial notification (other data will be filled later)
            notifications.push({
                user_id: comp.user_id,
                tournament_id: comp.tournament_id,
                competitor_id: comp.competitor_id,
                tatami: row[0],
                match: row[1] + 1,
            });
        }
    }


    var matches = await analyzeNextMatches(url);
    if (matches === undefined) {
        return [];
    }

    for (var notification of notifications) {
        const match = matches[notification.tatami - 1][notification.match - 1];

        notification.l_name = match.l_name;
        notification.l_club = match.l_club;
        notification.r_name = match.r_name;
        notification.r_club = match.r_club;
    }

    return notifications;
}
