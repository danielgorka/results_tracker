import { logger, notificationsRepository, tournamentsRepository, yourCompetitorsRepository } from "../app";
import { removeDiacritics } from "../core/utils";
import { analyzeNextMatches } from "../matches/analyze";
import { Match } from "../matches/match";
import { MatchNotification, MatchSide } from "../notifications/match_notification";
import { fillCompetitorsData } from "../your_competitors/fill_data";
import { YourCompetitor } from "../your_competitors/your_competitor";

/// Starts the Ongoing Tournaments Analyzer
///
/// Should be run every 5 seconds.
/// Analyzes all ongoing tournaments which has your competitors.
export async function runOTA() {
    logger.info('OTA started');

    const your_competitors = await yourCompetitorsRepository.getYourCompetitors();
    const tournaments = await tournamentsRepository.getTournaments();
    logger.debug(`Your competitors to analyze: ${your_competitors.length}`);

    const promises = tournaments.map(async tournament => {
        const comps = your_competitors.filter(your_competitor => your_competitor.tournament_id === tournament.id);
        if (comps.length === 0) {
            // Tournament has no your competitors
            return;
        }

        const notifications = await createNotifications(tournament.html_results!.url, comps);

        logger.debug(`OTA found ${notifications.length} possible notifications for tournament ${tournament.id}`);

        notificationsRepository.createMatchNotifications(notifications);
    });

    await Promise.all(promises);

    logger.info('OTA finished');
}

async function createNotifications(url: string, comps: YourCompetitor[]): Promise<MatchNotification[]> {
    // Fill competitor data (name, club, category)
    await fillCompetitorsData(url, comps);


    // Analyze matches file
    var matches = await analyzeNextMatches(url);
    if (matches === undefined) {
        return [];
    }

    // Find competitors in matches
    var notifications: MatchNotification[] = [];
    for (var tatami = 0; tatami < matches.length; tatami++) {
        for (var match = 0; match < matches[tatami].length; match++) {
            for (const comp of comps) {
                var side: MatchSide | undefined = undefined;
                if (isLeftCompetitor(matches[tatami][match], comp)) {
                    side = 'left';
                } 
                if (isRightCompetitor(matches[tatami][match], comp)) {
                   side = side === undefined ? 'right' : 'both';
                }

                if (side !== undefined) {
                    notifications.push({
                        user_id: comp.user_id,
                        tournament_id: comp.tournament_id,
                        competitor_id: comp.competitor_id,
                        tatami: tatami + 1,
                        match: match + 1,
                        category: matches[tatami][match].category,
                        l_name: matches[tatami][match].l_name,
                        l_club: matches[tatami][match].l_club,
                        r_name: matches[tatami][match].r_name,
                        r_club: matches[tatami][match].r_club,
                        side: side,
                    });
                }
            }
        }
    }

    return notifications;
}

function isLeftCompetitor(match: Match, comp: YourCompetitor): boolean {
    return strCompare(match.l_name, comp.name!) && strCompare(match.l_club, comp.club!) && strCompare(match.category, comp.category!);
}

function isRightCompetitor(match: Match, comp: YourCompetitor): boolean {
    return strCompare(match.r_name, comp.name!) && strCompare(match.r_club, comp.club!) && strCompare(match.category, comp.category!);
}

// Compares two strings
// - Case insensitive
// - Whitespace insensitive
// - Special characters converted to ASCII
// - Words order insensitive
function strCompare(a: string, b: string): boolean {
    const a1 = removeDiacritics(a.toLowerCase().replace(/\s/g, ''));
    const b1 = removeDiacritics(b.toLowerCase().replace(/\s/g, ''));

    const a2 = a1.split('').sort().join('');
    const b2 = b1.split('').sort().join('');

    return a2 === b2;
}
