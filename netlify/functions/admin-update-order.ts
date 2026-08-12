import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, json, methodNotAllowed, notFound, ok, parseBody, serverError } from '../shared/http';
import { sendOrderEmail, type OrderRecord, type TicketedEventRecord } from '../shared/tickets';

// The Treasurer's actions on an order: confirm an e-transfer arrived, take cash,
// cancel a no-show, record a refund, correct the payment method, add a note.
//
// Marking paid goes through the mark_order_paid() RPC so it stays idempotent and
// always writes an audit row.

type Action = 'mark_paid' | 'cancel' | 'refund' | 'update' | 'resend_email';

interface Payload {
  orderId?: string;
  action?: Action;
  paymentReference?: string;
  paymentMethod?: 'stripe' | 'etransfer' | 'cash';
  notes?: string;
  refundedAmountCents?: number;
  sendEmail?: boolean;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const auth = await requireRole(event, 'event_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const payload = parseBody<Payload>(event.body);
  if (!payload) return badRequest('Invalid JSON body');
  if (!payload.orderId) return badRequest('orderId is required');
  if (!payload.action) return badRequest('action is required');

  const supabase = getServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('event_orders')
    .select('*')
    .eq('id', payload.orderId)
    .single();

  if (orderError || !order) return notFound('Order not found');

  const { data: ticketedEvent } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', order.event_id)
    .single();

  const audit = (kind: string, detail: string) =>
    supabase.from('event_order_audit').insert({
      order_id: order.id,
      kind,
      detail,
      actor_id: auth.user.id,
    });

  switch (payload.action) {
    case 'mark_paid': {
      const wasPaid = order.payment_status === 'paid';

      // Correct the method first if the money arrived a different way than the
      // buyer originally selected (e.g. they said e-transfer, paid cash).
      if (payload.paymentMethod && payload.paymentMethod !== order.payment_method) {
        await supabase
          .from('event_orders')
          .update({ payment_method: payload.paymentMethod })
          .eq('id', order.id);
        await audit('note', `Method corrected to ${payload.paymentMethod}`);
      }

      const { data: updated, error } = await supabase.rpc('mark_order_paid', {
        p_order_id: order.id,
        p_actor: auth.user.id,
        p_reference: (payload.paymentReference || '').trim(),
        p_detail: `Marked paid by ${auth.user.email}`,
      });

      if (error) {
        console.error('admin-update-order: mark_order_paid failed', error);
        return serverError(error.message);
      }

      // Only mail on the real pending → paid transition, so a double-click
      // cannot send the buyer two tickets.
      if (!wasPaid && payload.sendEmail !== false && ticketedEvent) {
        const sent = await sendOrderEmail(
          'paid',
          (updated || order) as OrderRecord,
          ticketedEvent as TicketedEventRecord,
        );
        await audit(sent ? 'email_sent' : 'email_failed', 'Payment confirmation');
        if (sent) {
          await supabase
            .from('event_orders')
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq('id', order.id);
        }
      }

      return ok({ order: updated || order });
    }

    case 'cancel': {
      const { data: updated, error } = await supabase
        .from('event_orders')
        .update({ payment_status: 'cancelled', hold_expires_at: null })
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('admin-update-order: cancel failed', error);
        return serverError(error.message);
      }
      await audit('cancelled', (payload.notes || '').trim() || `Cancelled by ${auth.user.email}`);
      return ok({ order: updated });
    }

    case 'refund': {
      const amount = Math.round(Number(payload.refundedAmountCents ?? order.amount_cents));
      if (!Number.isFinite(amount) || amount < 0 || amount > order.amount_cents) {
        return badRequest('Refund amount must be between zero and the order total');
      }

      const { data: updated, error } = await supabase
        .from('event_orders')
        .update({
          refunded_amount_cents: amount,
          payment_status: amount >= order.amount_cents ? 'refunded' : order.payment_status,
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('admin-update-order: refund failed', error);
        return serverError(error.message);
      }
      // Card refunds are issued in the Stripe dashboard, where the money
      // actually is; this only records that it happened.
      await audit('refunded', `${(amount / 100).toFixed(2)} recorded by ${auth.user.email}`);
      return ok({ order: updated });
    }

    case 'update': {
      const patch: Record<string, unknown> = {};
      if (payload.paymentMethod) patch.payment_method = payload.paymentMethod;
      if (payload.paymentReference !== undefined) patch.payment_reference = payload.paymentReference.trim();
      if (payload.notes !== undefined) patch.notes = payload.notes.trim();
      if (!Object.keys(patch).length) return badRequest('Nothing to update');

      const { data: updated, error } = await supabase
        .from('event_orders')
        .update(patch)
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('admin-update-order: update failed', error);
        return serverError(error.message);
      }
      await audit('note', `Updated by ${auth.user.email}`);
      return ok({ order: updated });
    }

    case 'resend_email': {
      if (!ticketedEvent) return notFound('Event not found');
      const sent = await sendOrderEmail(
        order.payment_status === 'paid' ? 'paid' : 'reserved',
        order as OrderRecord,
        ticketedEvent as TicketedEventRecord,
      );
      await audit(sent ? 'email_sent' : 'email_failed', 'Resent by request');
      if (!sent) return serverError('Could not send the email');
      return ok({ order });
    }

    default:
      return badRequest('Unknown action');
  }
};
