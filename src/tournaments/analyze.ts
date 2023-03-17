
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
        const response = await fetch(fullUrl);
        const html = await response.text();

        // Check if this is Shiai page (regex)
        if (SHIAI_REGEX.test(html)) {
            return true; //todo change to true
        } else {
            logger.debug(`Failed to analyze URL ${fullUrl} - not a Shiai page`);
            return false;
        }
    } catch (e) {
        logger.debug(`Failed to analyze URL ${fullUrl} - ${e}`);
        return false;
    }
}