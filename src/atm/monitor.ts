import { logger, notificationsRepository, tournamentsRepository } from "../app";
import { AdminNotification } from "../notifications/admin_notification";
import { analyzeUrl } from "../tournaments/analyze";
import { Tournament } from "../tournaments/tournament";


/// Starts the Available Tournaments Monitor
///
/// Should be run every 1 hour. Can be run more often (e.g. forced)
/// Analyzes all finished public tournaments which has HTML results.
/// Decision about analysis per each tournament is based on current time.
///
/// Rules depending on tournament end_date:
/// - +21 days: every 7 days (day of week is based on end_date) (at 00:00)
/// - 7 days - 21 days: every 1 day (at 00:00)
/// - 1 day - 7 days: every 1 hour
export async function runATM(force: boolean = false): Promise<void> {
    logger.info('ATM started');

    const now = new Date();
    const tournaments = await tournamentsRepository.getTournaments();

    const tournamentsToAnalyze = tournaments.filter(tournament => {
        const end_date = new Date(tournament.end_date);
        end_date.setDate(end_date.getDate() + 1);
        if (end_date.getTime() > now.getTime()) {
            // Tournament is not finished yet
            return false;
        }

        if (tournament.html_results == undefined) {
            // Tournament has no HTML results
            return false;
        }

        if (force) {
            // Force check all tournaments
            return true;
        }

        const days = (end_date.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (days > 21) {
            return now.getDay() === end_date.getDay() && now.getHours() === 0;
        }
        if (days > 7) {
            return now.getHours() === 0;
        }
        return true;
    });


    await Promise.all(tournamentsToAnalyze.map(tournament => analyzeTournament(tournament)));
}

async function analyzeTournament(tournament: Tournament): Promise<void> {
    var available = false;
    for (var repeatCount = 0; repeatCount < 2; repeatCount++) {
        available = await analyzeUrl(tournament.html_results!.url);

        if (available) {
            logger.info(`Tournament ${tournament.id} is available.`);
            break;
        }

        logger.info(`Tournament ${tournament.id} is not available. Repeating in 5 minutes.`);
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }

    if (!available) {
        logger.info(`Tournament ${tournament.id} is not available. Should be marked as outdated.`);
        notificationsRepository.sendAdminNotification(AdminNotification.createTournamentNotAvailable(tournament));
    }
}