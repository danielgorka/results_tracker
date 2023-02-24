import { runATM } from "../atm/monitor";
import { runPTM } from "../ptm/monitor";

var interval: NodeJS.Timer;

// 10 minutes
const INTERVAL = 1000 * 60 * 10;

export function startMainScheduler() {
    interval = setInterval(run, INTERVAL);
    run();
}

export function stopMainScheduler() {
    clearInterval(interval);
}


function run() {
    if (new Date().getMinutes() < 10) {
        runATM();
    }
    runPTM();
}