import { load } from "cheerio";
import { logger } from "../app";
import { Match } from "./match";
import { get } from "../core/requests";

export async function analyzeNextMatches(url: string): Promise<Match[][] | undefined> {
    const fullUrl = url + 'nextmatches.html';

    try {
        // Get content of the nextmatches.html file
        const response = await get(fullUrl, 'retry');
        const html = await response.data;
        const $ = load(html);

        const catList = $('table.nextmatches tbody tr td.cur1 b, table.nextmatches tbody tr td.cur2 b');
        const leftList = $('table.nextmatches tbody tr td.cdl1, table.nextmatches tbody tr td.cdl2');
        const rightList = $('table.nextmatches tbody tr td.cdr1, table.nextmatches tbody tr td.cdr2');

        const tatamiCount = leftList.length / 10;

        var matches: Match[][] = Array(tatamiCount).fill(null).map(() => Array(10).fill(null));

        for (let i = 0; i < leftList.length; i++) {
            const category = $(catList[i]).contents().toString();
            const left = $(leftList[i]).contents().toString().split('<br>');
            const right = $(rightList[i]).contents().toString().split('<br>');

            const round = Math.floor(i / tatamiCount);
            const tatami = i % tatamiCount;

            matches[tatami][round] = {
                category: category,
                l_name: left[0],
                l_club: left[1],
                r_name: right[0],
                r_club: right[1],
            };
        }

        return matches;

    } catch (e) {
        logger.debug(`Failed to analyze URL ${fullUrl} - ${e}`);
        return undefined;
    }
}
