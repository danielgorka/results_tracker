import { logger, tournamentsRepository } from "../app";
import { analyzeUrl } from "../tournaments/analyze";


/// Starts the Potential Tournaments Monitor
///
/// Should be run every 10 minutes. Not more often. 
/// Analyzes all URLS from config.json excluding URLs assigned to public tournaments.
/// Decision about analysis per each tournament is based on current time.
///
/// Rules depending on day of the week:
/// - Monday - Friday: every 1 day (at 00:00)
/// - Saturday - Sunday: every 10 minutes when 7:00 - 15:00, every 1 hour when 15:00 - 23:00
export async function runPTM(): Promise<void> {
    logger.info('PTM started');

    const now = new Date();
    const urls = require('../../config.json').urls as string[];
    const tournaments = await tournamentsRepository.getTournaments();

    const urlsToAnalyze = urls.filter(url => {
        const tournament = tournaments.find(tournament => tournament.html_results?.url === url);
        if (tournament !== undefined) {
            // Tournament is public
            return false;
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
        //TODO
        if (available) {
            logger.info(`URL ${url} is available. Should be added to the database.`);
        } else {
            logger.info(`URL ${url} is not available.`);
        }
    }
}

export async function forcePTM(): Promise<void> {
    logger.info('Force PTM started');

    const now = new Date();
    const urls = require('../../config.json').urls as string[];
    const tournaments = await tournamentsRepository.getTournaments();

    const urlsToAnalyze = urls.filter(url => {
        const tournament = tournaments.find(tournament => tournament.html_results?.url === url);
        if (tournament !== undefined) {
            // Tournament is public
            return false;
        }

        return true;
    });

    for (const url of urlsToAnalyze) {
        const available = await analyzeUrl(url);
        //TODO
        if (available) {
            logger.info(`URL ${url} is available. Should be added to the database.`);
        } else {
            logger.info(`URL ${url} is not available.`);
        }
    }
}