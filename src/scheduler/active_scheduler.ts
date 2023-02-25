import { logger } from "../app";
import { runOTA } from "../ota/analyzer";

var interval: NodeJS.Timer | undefined;

// 5 seconds
const INTERVAL = 1000 * 5;

export function startActiveScheduler() {
    if (interval !== undefined) {
        return;
    }
    
    logger.info('Active scheduler started');
    interval = setInterval(run, INTERVAL);
    run();
}

export function stopActiveScheduler() {
    if (interval === undefined) {
        return;
    }

    logger.info('Active scheduler stopped');
    clearInterval(interval);
}


function run() {
    logger.debug('Active scheduler run');
    runOTA();
}