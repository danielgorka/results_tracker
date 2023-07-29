import { logger, notificationsRepository, tournamentsRepository, userSettingsRepository, yourCompetitorsRepository } from "../app";
import { removeDiacritics } from "../core/utils";
import { analyzeNextMatches } from "../matches/analyze";
import { Match } from "../matches/match";
import { MatchNotification, MatchSide } from "../notifications/match_notification";
import { Tournament, TournamentVideo } from "../tournaments/tournament";
import { UserSettings } from "../user_settings/user_settings";
import { fillCompetitorsData } from "../your_competitors/fill_data";
import { YourCompetitor } from "../your_competitors/your_competitor";

/// Starts the Ongoing Tournaments Analyzer
///
/// Should be run every 5 seconds.
/// Analyzes all ongoing tournaments which has your competitors.
export async function runOTA() {
    logger.info('OTA started');

    const your_competitors = await fillCompsMoment(await yourCompetitorsRepository.getYourCompetitors());
    const tournaments = await tournamentsRepository.getTournaments();
    logger.debug(`Your competitors to analyze: ${your_competitors.length}`);

    const promises = tournaments.map(async tournament => {
        const comps = your_competitors.filter(your_competitor => your_competitor.tournament_id === tournament.id);
        if (comps.length === 0) {
            // Tournament has no your competitors
            return;
        }

        const notifications = await createNotifications(tournament, comps);

        logger.debug(`OTA found ${notifications.length} possible notifications for tournament ${tournament.id}`);

        notificationsRepository.createMatchNotifications(notifications);
    });

    await Promise.all(promises);

    logger.info('OTA finished');
}

/**
 * Fills notification moment based on user settings and removes competitors with disabled notifications.
 * @param comps Your competitors to fill notification moment
 * @returns Updated your competitors without disabled notifications
 */
async function fillCompsMoment(comps: YourCompetitor[]): Promise<YourCompetitor[]> {
    const user_settings = await userSettingsRepository.getUserSettings();
    return comps.map(comp => {
        const settings = user_settings.find(setting => setting.user_id === comp.user_id);
        if (settings === undefined) {
            logger.warn(`User ${comp.user_id} not found in user settings`);
            return null;
        }

        return {
            ...comp,
            moment: settings.match_notification_moment,
        };
    }).filter(comp => comp !== null && comp.moment !== null) as YourCompetitor[];
}

async function createNotifications(tournament: Tournament, comps: YourCompetitor[]): Promise<MatchNotification[]> {
    const url = tournament.html_results!.url;

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
                if (comp.moment! < match) {
                    // Skip competitors with notification moment lower than current match
                    continue;
                }
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
                        match_order: match,
                        category: matches[tatami][match].category,
                        l_name: matches[tatami][match].l_name,
                        l_club: matches[tatami][match].l_club,
                        r_name: matches[tatami][match].r_name,
                        r_club: matches[tatami][match].r_club,
                        side: side,
                        live_id: getLiveId(tournament, tatami + 1),
                        timestamp: new Date(),
                    });
                }
            }
        }
    }

    return notifications;
}

function getLiveId(tournament: Tournament, tatami: number): string | undefined {
    if (tournament.videos === undefined) {
        return undefined;
    }

    const live = tournament.videos!.items.filter(item => {
        if ((item as any).section == undefined) {
            const video = item as TournamentVideo;
            return video.tatami === tatami;
        }

        return false;
    });

    if (live.length === 0) {
        return undefined;
    }

    if (live.length == 1) {
        logger.debug(`Live stream found for tournament ${tournament.id} and tatami ${tatami}`);
        return (live[0] as TournamentVideo).id;
    }

    // TODO: Handle multiple live streams (get cached live details for tournament)
    return undefined;
}

function isLeftCompetitor(match: Match, comp: YourCompetitor): boolean {
    return strCompare(match.l_name, comp.name!) && strCompare(match.l_club, comp.club!) && (comp.category == undefined || strCompare(match.category, comp.category!));
}

function isRightCompetitor(match: Match, comp: YourCompetitor): boolean {
    return strCompare(match.r_name, comp.name!) && strCompare(match.r_club, comp.club!) && (comp.category == undefined || strCompare(match.category, comp.category!));
}

// Compares two strings
// - Case insensitive
// - Whitespace insensitive
// - Special characters converted to ASCII
// - Words order insensitive
function strCompare(a: string, b: string): boolean {
    if (a == undefined || b == undefined) {
        return false;
    }

    const a1 = removeDiacritics(a.toLowerCase().replace(/\s/g, ''));
    const b1 = removeDiacritics(b.toLowerCase().replace(/\s/g, ''));

    const a2 = a1.split('').sort().join('');
    const b2 = b1.split('').sort().join('');

    return a2 === b2;
}
