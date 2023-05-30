import { logger } from "../app";
import { YourCompetitor } from "./your_competitor";
import axios from "axios";
import { get } from "../core/requests";

/**
 * Cache TTL for competitor txt files.
 */
const cacheTtl = 15 * 60 * 1000; // 15 minutes
var cachedCompTxts: CacheData = {};

type CacheData = {
    [key: string]: CompData;
};


class CompData {
    name!: string;
    club!: string;
    category!: string;
    timestamp!: number;
}


/**
 * Updates YourCompetitors with data from competitor txt files.
 * Uses cache to avoid too many requests.
 * @param url Tournament URL
 * @param comps YourCompetitors to update
 */
export async function fillCompetitorsData(url: string, comps: YourCompetitor[]): Promise<void> {
    for (const comp of comps) {
        // Set name, club from competitor ID (fallback ID)
        if (comp.competitor_id.startsWith('_')) {
            const parts = comp.competitor_id.split('_');
            comp.name = parts[1];
            comp.club = parts[2];
            continue;
        }

        const compData = await getCompData(url, comp.competitor_id);
        if (compData === undefined) {
            continue;
        }

        comp.name = compData.name;
        comp.club = compData.club;
        comp.category = compData.category;
    }
}

/**
 * Gets data from competitor txt file.
 * If data is cached and not expired, returns cached data.
 * @param url Tournament URL
 * @param compId Competitor ID
 * @returns Competitor data or undefined if failed to get data
 */
async function getCompData(url: string, compId: string): Promise<CompData | undefined> {
    const fullUrl = url + 'c-' + compId + '.txt';

    const cachedComp = cachedCompTxts[fullUrl];
    if (cachedComp !== undefined) {
        if (Date.now() - cachedComp.timestamp < cacheTtl) {
            return cachedComp;
        }
    }

    try {
        const response = await get(fullUrl, 'retry');
        const text = await response.data;
        const lines = text.split('\n');
        const compData = {
            name: lines[0] + ' ' + lines[1],
            club: lines[4],
            category: lines[7],
            timestamp: Date.now(),
        };
        cachedCompTxts[fullUrl] = compData;
        return compData;
    } catch (e) {
        logger.debug(`Failed to analyze competitor txt file ${fullUrl} - ${e}`);
        return undefined;
    }
}