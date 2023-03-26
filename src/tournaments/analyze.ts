
import { logger } from "../app";
import axios from 'axios';

const SHIAI_REGEX = /<meta *name="keywords" *content="JudoShiai-[^"]+" *\/>/;

/// Check whether the URL has available Shiai results.
///
/// Returns true if the results are available. Otherwise returns false.
export async function analyzeUrl(url: string, useProxy: boolean = false): Promise<boolean> {
    logger.debug(`Analyzing URL ${url}`);
    var fullUrl = url + 'index.html';

    if (useProxy) {
        fullUrl = process.env.PROXY_URL + encodeURIComponent(fullUrl);
    } 

    try {
        // Get content of the index.html file
        const response = await axios.get(fullUrl, {
            headers: {
                'Cache-Control': 'no-cache',
            },
        });

        if (response.status !== 200) {
            logger.debug(`Failed to analyze URL ${url} - status ${response.status}`);
            return false;
        }

        const html = await response.data;

        // Check if this is Shiai page (regex)
        if (SHIAI_REGEX.test(html)) {
            return true;
        } else {
            logger.debug(`Failed to analyze URL ${url} - not a Shiai page`);
            logger.debug(html);
            return false;
        }
    } catch (e) {
        if (e instanceof TypeError) {
            logger.debug(`Failed to analyze URL ${url} - ${e.name} ${e.message} ${e.stack}`);
        } else {
            logger.debug(`Failed to analyze URL ${url} - ${e}`);
        }
        return false;
    }
}