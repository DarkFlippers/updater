import { instance } from 'boot/axios';
import { unpack, ungzip } from 'shared/lib/utils/operation';

async function fetchChannels() {
    return await instance.get('https://up.unleashedflip.com/directory.json')
    .then(({ data }) => {
        const params = new URLSearchParams(location.search);
        const customSource = {
            url: params.get('url'),
            channel: params.get('channel'),
            version: params.get('version'),
            target: params.get('target')
        }

        if (customSource.url) {
            data.channels.push({
                id: 'custom',
                title: customSource.channel || 'Custom',
                versions: [
                    {
                        version: customSource.version || 'unknown',
                        timestamp: Date.now(),
                        files: [
                            {
                                url: customSource.url,
                                type: 'update_tgz',
                                target: customSource.target || 'f7'
                            }
                        ]
                    }
                ]
            });
        }

        return data.channels;
    })
    .catch((err) => {
        const data = err.response.data;
        console.error(err);
        return data;
    });
}

async function fetchFirmware(url: string) {
    return await instance.get(url, { responseType: 'arraybuffer' })
    .then(async ({ data }) => unpack(data))
    .catch((error) => {
        const decoder = new TextDecoder('utf-8')
        const data = JSON.parse(decoder.decode(error.response.data)).detail
        if (data.code >= 400) throw new Error('Failed to fetch firmware (' + data.code + ')');
    });
}

async function fetchFirmwareTar(url: string) {
    return await instance.get(url, { responseType: 'arraybuffer' })
    .then(({ data }) => ungzip(data))
    .catch((error) => {
        const decoder = new TextDecoder('utf-8');
        const data = JSON.parse(decoder.decode(error.response.data)).detail;
        if (data.code >= 400) throw new Error('Failed to fetch firmware (' + data.code + ')');
    });
}

export const api = { fetchChannels, fetchFirmware, fetchFirmwareTar }
