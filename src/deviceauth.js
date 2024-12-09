const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const GH_DEVICE_FLOW_AUTH_URL = 'https://github.com/login/device/code';
const GH_DEVICE_FLOW_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GH_DEVICE_FLOW_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
const GH_API_USER_URL = 'https://api.github.com/user';


class GithubDeviceAuth {

    constructor(options) {
        this.options = {
            interval: 10000,
            scope: 'user',
            'User-Agent': 'node.js',
            ...options
        };
    }

    async _http_post(url, data, options) {
        const response = await fetch(url, {
            ...options,
            method: 'post',
            body: JSON.stringify(data),
        });
        return response;
    }

    async _http_get(url, options) {
        const response = await fetch(url, {
            ...options,
            method: 'get',
        });
        return response;
    }

    async requestDeviceCode(scope = this.options.scope) {
        const response = await this._http_post(GH_DEVICE_FLOW_AUTH_URL, {
            client_id: this.options.clientId,
            scope: scope
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': this.options['User-Agent']
            }
        });
        return await response.json();
    }

    async getGithubUsername(token) {
        const response = await this._http_get(GH_API_USER_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': this.options['User-Agent'],
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        return data.login;
    }

    async authenticate(options = {
        deviceData: undefined,
        statusCallback: async (data) => { },
        deviceCodeCallback: async (deviceData) => { },
        interval: this.options.interval,
        resolveUsername: true,
    }) {

        if (options.deviceData && options.deviceCodeCallback) {
            throw new Error("Either provide deviceData or deviceCodeCallback");
        }

        return new Promise(async (resolve, reject) => {
            const opts = {
                deviceData: undefined,
                statusCallback: async () => { },
                deviceCodeCallback: undefined,
                interval: this.options.interval,
                resolveUsername: true,
                ...options
            }

            if (!opts.deviceData && opts.deviceCodeCallback) {
                opts.deviceData = await this.requestDeviceCode()
                await opts.deviceCodeCallback(opts.deviceData);
            }

            var interval = opts.interval;
            var deadline = Date.now() + opts.deviceData.expires_in * 1000
            const poll = async () => {
                try {
                    const response = await this._http_post(GH_DEVICE_FLOW_TOKEN_URL, {
                        client_id: this.options.clientId,
                        device_code: opts.deviceData.device_code,
                        grant_type: GH_DEVICE_FLOW_GRANT_TYPE
                    }, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'User-Agent': this.options['User-Agent']
                        }
                    });
                    const data = await response.json();
                    opts.statusCallback({ ...data, deadline: deadline });
                    if (data.error === 'authorization_pending') {
                        // Wait and poll again                        
                    } else if (data.error === 'slow_down') {
                        interval += data.interval * 1000;  // Increase polling interval on slow_down
                        clearInterval(pollingInterval);
                        pollingInterval = setInterval(poll, interval);
                    } else if (data.access_token) {
                        clearInterval(pollingInterval);  // Stop polling
                        const username = opts.resolveUsername == true ? await this.getGithubUsername(data.access_token) : undefined;
                        return resolve({
                            ...data,
                            username
                        })
                    } else {
                        clearInterval(pollingInterval);  // Stop polling
                        return reject(data);
                    }
                    // timeout?
                    if (Date.now() > deadline) {
                        clearInterval(pollingInterval);  // Stop polling
                        return reject(new Error(`Operation Timed out at ${deadline} after ${opts.deviceData.expires_in} seconds.`));
                    }
                } catch (error) {
                    clearInterval(pollingInterval);  // Stop polling
                    return reject(error);
                }
            };
            let pollingInterval = setInterval(poll, interval);
        });
    }
}

module.exports = {
    GithubDeviceAuth,
    GH_API_USER_URL,
    GH_DEVICE_FLOW_AUTH_URL,
    GH_DEVICE_FLOW_GRANT_TYPE,
    GH_DEVICE_FLOW_TOKEN_URL
}