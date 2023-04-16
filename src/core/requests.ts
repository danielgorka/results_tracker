import axios, { AxiosResponse } from 'axios';

/**
 * Proxy rule
 * @typedef {('disabled' | 'retry' | 'force')} ProxyRule
 * @property {string} disabled - No proxy will be used
 * @property {string} retry - Retry with proxy if failed
 * @property {string} force - Force request to call through proxy
 */
type ProxyRule = 'disabled' | 'retry' | 'force';

/**
 * GET request with proxy support.
 * @param url - URL to request
 * @param proxyRule - Proxy rule
 * @returns 
 */
export async function get(url: string, proxyRule: ProxyRule): Promise<AxiosResponse> {
    var useProxy = proxyRule === 'force';

    if (proxyRule === 'retry') {
        // Force proxy if the URL is whitelisted (includes whitelisted string)
        const proxyUrls = (process.env.CONFIG == null ? require('../../config.json').use_proxy_urls : JSON.parse(process.env.CONFIG!).use_proxy_urls) as string[];
        useProxy = proxyUrls.some(proxyUrl => url.includes(proxyUrl));
    }

    try {
        var finalUrl: string;
        var headers = {};
        if (useProxy) {
            finalUrl = process.env.PROXY_URL!;
            headers = {
                'Proxy-Auth': process.env.PROXY_AUTH!,
                'Proxy-Url': url,
            };
        } else {
            finalUrl = url;
        }

        return await axios.get(finalUrl, {
            headers: {
                ...headers,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (e) {
        if (proxyRule === 'retry') {
            return get(url, 'force');
        }

        throw e;
    }
}