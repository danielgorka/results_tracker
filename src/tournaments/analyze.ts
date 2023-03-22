
import { logger } from "../app";

const SHIAI_REGEX = /<meta *name="keywords" *content="JudoShiai-[^"]+" *\/>/;

/// Check whether the URL has available Shiai results.
///
/// Returns true if the results are available. Otherwise returns false.
export async function analyzeUrl(url: string): Promise<boolean> {
    logger.debug(`Analyzing URL ${url}`);
    const fullUrl = url + 'index.html';

    try {
        // Get content of the index.html file
        const response = await fetch(fullUrl, {
            cache: 'no-cache',
        });
        if (response.status !== 200) {
            logger.debug(`Failed to analyze URL ${fullUrl} - status ${response.status}`);
            return false;
        }

        const html = await response.text();

        // Check if this is Shiai page (regex)
        if (SHIAI_REGEX.test(html)) {
            return true;
        } else {
            logger.debug(`Failed to analyze URL ${fullUrl} - not a Shiai page`);
            return false;
        }
    } catch (e) {
        if (e instanceof TypeError) {
            logger.debug(`Failed to analyze URL ${fullUrl} - ${e.name} ${e.message} ${e.stack}`);
        } else {
            logger.debug(`Failed to analyze URL ${fullUrl} - ${e}`);
        }
        return false;
    }
}