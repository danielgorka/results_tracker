import { logger } from "../app";
import { YourCompetitor } from "./your_competitor";
import axios from "axios";
import { get } from "../core/requests";

/**
 * Cache TTL for competitor txt files.
 */
const cacheTtl = 5 * 60 * 1000; // 5 minutes
var cachedCompTxts: Map<string, CompData> = new Map();

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

    logger.debug('Cache: ' + cachedCompTxts);
    
    const cachedComp = cachedCompTxts.get(fullUrl);
    if (cachedComp !== undefined) {
        if (Date.now() - cachedComp.timestamp < cacheTtl) {
            logger.debug(`Using cached data for competitor txt file ${fullUrl}`);
            return cachedComp;
        } else {
            logger.debug(`Cached data for competitor txt file ${fullUrl} expired`);
        }
    }

    try {
        logger.debug(`Getting data for competitor txt file ${fullUrl}`);
        const response = await get(fullUrl, 'retry');
        const text = await response.data;
        const lines = text.split('\n');
        const compData = {
            name: lines[0] + ' ' + lines[1],
            club: lines[4],
            category: lines[7],
            timestamp: Date.now(),
        };
        cachedCompTxts.set(fullUrl, compData);
        return compData;
    } catch (e) {
        logger.debug(`Failed to analyze competitor txt file ${fullUrl} - ${e}`);
        return undefined;
    }
}