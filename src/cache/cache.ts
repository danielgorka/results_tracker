import { logger, notificationsRepository, tournamentsRepository, yourCompetitorsRepository } from "../app";
import { startActiveScheduler, stopActiveScheduler } from "../scheduler/active_scheduler";
import { startMainScheduler } from "../scheduler/main_scheduler";

export async function refreshCache(): Promise<void> {
    logger.info('Requested full cache refresh');

    // Refreshing tournaments also refreshes other caches so we don't need to do it manually
    await refreshTournaments();

    await ensureSchedulers();
}

export async function refreshTimeBasedCaches(): Promise<void> {
    logger.info('Requested time based caches refresh');

    const activeIds = await getActiveIds();
    await refreshYourCompetitors(activeIds);
    await refreshMatchNotifications(activeIds);
}

export async function refreshTournaments(): Promise<void> {
    await tournamentsRepository.refreshTournaments();
    logger.info('Tournaments cache refreshed');

    // Your competitors and notifications depend on tournaments so we need to refresh them too
    const activeIds = await getActiveIds();
    await refreshYourCompetitors(activeIds);
    await refreshMatchNotifications(activeIds);
}

export async function refreshYourCompetitors(activeIds: string[] | undefined = undefined): Promise<void> {
    await yourCompetitorsRepository.refreshYourCompetitors(activeIds || await getActiveIds());
    logger.info('Your competitors cache refreshed');

    // Active scheduler depends on your competitors so we need to refresh its state
    await ensureSchedulers();
}

export async function refreshMatchNotifications(activeIds: string[] | undefined = undefined): Promise<void> {
    await notificationsRepository.refreshMatchNotifications(activeIds || await getActiveIds());
    logger.info('Match notifications cache refreshed');
}

export async function ensureSchedulers(): Promise<void> {
    const yourCompetitors = await yourCompetitorsRepository.getYourCompetitors();
    
    // Run active scheduler if there are your competitors or stop it otherwise
    if (yourCompetitors.length > 0) {
        startActiveScheduler();
    } else {
        stopActiveScheduler();
    }

    // Ensure that main scheduler is running
    startMainScheduler();
}

async function getActiveIds() {
    const now = new Date();
    const tournaments = await tournamentsRepository.getTournaments();

    return tournaments
        .filter(tournament => {
            if (tournament.state != 'public') return;
            if (tournament.html_results === undefined) return;

            const start_date = new Date(tournament.start_date);
            const end_date = new Date(tournament.end_date);
            end_date.setDate(end_date.getDate() + 1);

            return start_date < now && end_date > now;
        })
        .map(tournament => tournament.id!);
}