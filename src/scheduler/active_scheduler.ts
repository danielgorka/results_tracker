import { logger } from "../app";
import { runOTA } from "../ota/analyzer";
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async/fixed';
import { SetIntervalAsyncTimer } from "set-interval-async";

var interval: SetIntervalAsyncTimer<any> | undefined;

// 5 seconds
const INTERVAL = 1000 * 5;

export function startActiveScheduler() {
    if (interval !== undefined) {
        return;
    }

    logger.info('Active scheduler started');
    interval = setIntervalAsync(run, INTERVAL);
    run();
}

export function stopActiveScheduler() {
    if (interval === undefined) {
        return;
    }

    logger.info('Active scheduler stopped');
    clearIntervalAsync(interval);
    interval = undefined;
}


async function run() {
    await runOTA();
}