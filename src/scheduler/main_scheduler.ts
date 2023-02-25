import { logger } from "../app";
import { runATM } from "../atm/monitor";
import { refreshTimeBasedCaches } from "../cache/cache";
import { runPTM } from "../ptm/monitor";

var interval: NodeJS.Timer | undefined;

// 10 minutes
const INTERVAL = 1000 * 60 * 10;

export function startMainScheduler() {
    if (interval !== undefined) {
        return;
    }

    logger.info('Main scheduler started');
    interval = setInterval(run, INTERVAL);
    run();
}

export function stopMainScheduler() {
    if (interval === undefined) {
        return;
    }

    logger.info('Main scheduler stopped');
    clearInterval(interval);
}


function run() {
    const now = new Date();
    if (now.getHours() == 0 && now.getMinutes() < 10) {
        // Refresh time based caches when new day starts
        refreshTimeBasedCaches();
    }

    if (now.getMinutes() < 10) {
        // 1 hour
        runATM();
    }

    // 10 minutes
    runPTM();
}