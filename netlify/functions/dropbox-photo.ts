import type { Handler, HandlerEvent } from '@netlify/functions';

const DROPBOX_SHARED_LINK = 'https://www.dropbox.com/scl/fo/7gd10a4uuajp1nl41b1kt/AC9kDN6IoQI1W406N-K6rbU?rlkey=fphtf4p8pfashffjhqtd606gd&st=uwxnfm4g&dl=0';

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const path = event.queryStringParameters?.path;
    if (!path) {
        return { statusCode: 400, body: 'Missing path parameter' };
    }

    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) {
        return { statusCode: 500, body: 'Server configuration error' };
    }

    const full = event.queryStringParameters?.full === '1';

    try {
        let response: Response;

        if (full) {
            // Full resolution for lightbox
            response = await fetch('https://content.dropboxapi.com/2/sharing/get_shared_link_file', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({ url: DROPBOX_SHARED_LINK, path }),
                },
            });
        } else {
            // Thumbnail for gallery grid
            response = await fetch('https://content.dropboxapi.com/2/files/get_thumbnail_v2', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        resource: {
                            '.tag': 'shared_link',
                            url: DROPBOX_SHARED_LINK,
                            path,
                        },
                        size: { '.tag': 'w1024h768' },
                        format: { '.tag': 'jpeg' },
                        mode: { '.tag': 'fitone_bestfit' },
                    }),
                },
            });
        }

        if (!response.ok) {
            console.error(`dropbox-photo error for "${path}":`, await response.text());
            return { statusCode: 404, body: 'Photo not found' };
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (err: any) {
        console.error('Error in dropbox-photo function:', err);
        return { statusCode: 500, body: 'Internal server error' };
    }
};
