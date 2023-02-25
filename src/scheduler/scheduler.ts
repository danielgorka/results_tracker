import { logger } from "../app";
import { runATM } from "../atm/monitor";
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
    if (new Date().getMinutes() < 10) {
        runATM();
    }
    runPTM();
}