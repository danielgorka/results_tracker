import { tournamentsRepository } from "../app";
import { analyzeUrl } from "../tournaments/analyze";


/// Starts the Available Tournaments Monitor
///
/// Should be run every 1 hour. Not more often. 
/// Analyzes all finished public tournaments which has HTML results.
/// Decision about analysis per each tournament is based on current time.
///
/// Rules depending on tournament end_date:
/// - +90 days: every 7 days (day of week is based on end_date) (at 00:00)
/// - 7 days - 90 days: every 1 day (at 00:00)
/// - 1 day - 7 days: every 1 hour
export async function runATM(): Promise<void> {
    console.log('ATM started');

    const now = new Date();
    const tournaments = await tournamentsRepository.getTournaments();

    const tournamentsToAnalyze = tournaments.filter(tournament => {
        const end_date = new Date(tournament.end_date);
        if (end_date.getTime() > now.getTime()) {
            // Tournament is not finished yet
            return false;
        }

        if (tournament.html_results == undefined) {
            // Tournament has no HTML results
            return false;
        }

        const days = (end_date.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (days > 90) {
            return now.getDay() === end_date.getDay() && now.getHours() === 0;
        }
        if (days > 7) {
            return now.getHours() === 0;
        }
        return true;
    });

    for (const tournament of tournamentsToAnalyze) {
        const available = await analyzeUrl(tournament.html_results!.url);
        //TODO
        if (available) {
            console.log(`Tournament ${tournament.id} is available.`);
        } else {
            console.log(`Tournament ${tournament.id} is not available. Should be marked as outdated.`);
        }
    }
}

export async function forceATM(): Promise<void> {
    console.log('Force ATM started');

    const now = new Date();
    const tournaments = await tournamentsRepository.getTournaments();

    const tournamentsToAnalyze = tournaments.filter(tournament => {
        const end_date = new Date(tournament.end_date);
        if (end_date.getTime() > now.getTime()) {
            // Tournament is not finished yet
            return false;
        }

        if (tournament.html_results == undefined) {
            // Tournament has no HTML results
            return false;
        }

        return true;
    });

    for (const tournament of tournamentsToAnalyze) {
        const available = await analyzeUrl(tournament.html_results!.url);
        //TODO
        if (available) {
            console.log(`Tournament ${tournament.id} is available.`);
        } else {
            console.log(`Tournament ${tournament.id} is not available. Should be marked as outdated.`);
        }
    }
}