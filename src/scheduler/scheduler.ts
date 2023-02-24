import { runATM } from "../atm/monitor";
import { runPTM } from "../ptm/monitor";

var interval: NodeJS.Timer;

export function startMainScheduler() {
    interval = setInterval(run, 1000 * 60 * 60);
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