
import { Tournament } from "./tournament";

const SHIAI_REGEX = /<meta name="keywords" content="JudoShiai-[^"]+" \/>/;

/// Check whether the URL has available Shiai results.
///
/// Returns true if the results are available. Otherwise returns false.
export async function analyzeUrl(url: string): Promise<boolean> {
    const fullUrl = url + 'index.html';

    try {
        // Get content of the index.html file
        const response = await fetch(fullUrl);
        const html = await response.text();

        // Check if this is Shiai page (regex)
        if (SHIAI_REGEX.test(html)) {
            return true;
        }
    } catch (e) {
        console.error(e);
    }

    return false;
}