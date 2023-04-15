import { logger, notificationsRepository, tournamentsRepository } from "../app";
import { AdminNotification } from "../notifications/admin_notification";
import { analyzeUrl } from "../tournaments/analyze";

const alreadyNotifiedUrls: string[] = [];

/// Starts the Potential Tournaments Monitor
///
/// Should be run every 10 minutes. Can be run more often (e.g. forced)
/// Analyzes all URLS from config.json excluding URLs assigned to public tournaments.
/// Decision about analysis per each tournament is based on current time.
///
/// Rules depending on day of the week:
/// - Monday - Friday: every 1 day (at 00:00)
/// - Saturday - Sunday: every 10 minutes when 7:00 - 15:00, every 1 hour when 15:00 - 23:00
export async function runPTM(force: boolean = false): Promise<void> {
    if (force) {
        logger.info('PTM started (forced)');
    } else {
        logger.info('PTM started');
    }

    const now = new Date();
    const urls = (process.env.CONFIG == null ? require('../../config.json').urls : JSON.parse(process.env.CONFIG!)) as string[];
    const tournaments = await tournamentsRepository.getTournaments();

    const urlsToAnalyze = urls.filter(url => {
        const tournament = tournaments.find(tournament => tournament.html_results?.url === url);
        if (tournament !== undefined) {
            // Tournament is public
            return false;
        }

        if (force) {
            // Force check all URLs
            return true;
        }

        if (now.getDay() === 0 || now.getDay() === 6) {
            // Weekend
            if (now.getHours() >= 7 && now.getHours() < 15) {
                // 7:00 - 15:00
                return true;
            }
            if (now.getHours() >= 15 && now.getHours() < 23) {
                // 15:00 - 23:00
                return now.getMinutes() < 10;
            }
        }

        return now.getHours() === 0 && now.getMinutes() < 10;
    });


    for (const url of urlsToAnalyze) {
        const available = await analyzeUrl(url);

        if (available && !alreadyNotifiedUrls.includes(url)) {
            notificationsRepository.sendAdminNotification(AdminNotification.createNewTournament(url));
            alreadyNotifiedUrls.push(url);
        }

        if (available) {
            logger.info(`URL ${url} is available. Should be added to the database.`);
        } else {
            logger.info(`URL ${url} is not available.`);
        }
    }
}
