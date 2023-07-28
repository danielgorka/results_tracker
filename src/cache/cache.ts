import { logger, notificationsRepository, tournamentsRepository, userSettingsRepository, yourCompetitorsRepository } from "../app";
import { startActiveScheduler, stopActiveScheduler } from "../scheduler/active_scheduler";
import { startMainScheduler } from "../scheduler/main_scheduler";
import { YourCompetitor } from "../your_competitors/your_competitor";

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

export async function refreshYourCompetitors(activeIds: string[] | undefined = undefined, docId: string | undefined = undefined): Promise<void> {
    let ids = activeIds || await getActiveIds();
    await yourCompetitorsRepository.refreshYourCompetitors(ids, docId);
    logger.info('Your competitors cache refreshed');

    // User settings depend on your competitors so we need to refresh them too
    const userId = docId?.split('_')[0]
    await refreshUserSettings(undefined, userId);

    // Active scheduler depends on your competitors so we need to refresh its state
    await ensureSchedulers();
}

export async function refreshUserSettings(yourCompetitors: YourCompetitor[] | undefined = undefined, userId: string | undefined = undefined): Promise<void> {
    let comps = yourCompetitors || await yourCompetitorsRepository.getYourCompetitors();
    await userSettingsRepository.refreshUserSettings(comps, userId);
    logger.info('User settings cache refreshed');
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