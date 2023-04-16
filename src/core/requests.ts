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
    try {
        var finalUrl: string;
        var headers = {};
        if (proxyRule === 'force') {
            // Proxy request
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