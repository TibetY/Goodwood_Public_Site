import type { Handler } from '@netlify/functions';
import { getServiceClient } from '../shared/supabase';
import { badRequest, methodNotAllowed, notFound, serverError } from '../shared/http';
import { qrPngBuffer } from '../shared/tickets';

// Serves the QR PNG for a ticket. One endpoint feeds both the <img> on the
// ticket page and the <img> in the confirmation email, which keeps the `qrcode`
// package server-side — no QR library ships to the browser.

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed();

  const token = event.queryStringParameters?.t;
  if (!token) return badRequest('t is required');

  const supabase = getServiceClient();

  // 404 for unknown tokens so this cannot be used as an oracle to discover
  // valid ones.
  const { data: order, error } = await supabase
    .from('event_orders')
    .select('id')
    .eq('checkin_token', token)
    .maybeSingle();

  if (error) {
    console.error('ticket-qr: lookup failed', error);
    return serverError(error.message);
  }
  if (!order) return notFound('Ticket not found');

  try {
    const png = await qrPngBuffer(token);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        // Private: this image identifies one ticket and must not be shared by a
        // CDN between viewers.
        'Cache-Control': 'private, max-age=86400',
      },
      body: png.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('ticket-qr: generation failed', err);
    return serverError('Could not generate the QR code');
  }
};
