import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { brandedEmail, escapeHtml, sendEmail } from '../shared/email';

// Invite a member to the portal.
//
// This used to call supabaseAdmin.auth.admin.inviteUserByEmail(), which asks
// Supabase's own mailer to send the email. That mailer is rate-limited to a
// handful of sends an hour and needs custom SMTP configured to be reliable at
// all — when it fails it surfaces as "Error sending invite email /
// unexpected_failure" and the invite silently does not go out.
//
// The lodge already sends its contact and ticket email through Resend, which is
// configured and working. So we generate the invite *link* with the admin API
// (which creates the user but sends nothing) and deliver it ourselves through
// the same path as every other lodge email.

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { email, displayName } = JSON.parse(event.body || '{}');

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    // Generates the invite link and creates the user, but sends no email itself —
    // that is now our job. redirectTo is where the buyer lands after following
    // the link and is what carries them into the set-password flow.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: {
          display_name: displayName || '',
          invited_by: user.email,
        },
        redirectTo: `${process.env.URL || 'http://localhost:5173'}/set-password`,
      },
    });

    if (error) {
      console.error('Error generating invite link:', error);
      // A user who already exists is a common, expected case — say so plainly
      // rather than returning a raw auth error.
      const alreadyExists = /already|exists|registered/i.test(error.message || '');
      return {
        statusCode: alreadyExists ? 409 : 500,
        body: JSON.stringify({
          error: alreadyExists
            ? 'Someone with that email address has already been invited or has an account.'
            : error.message,
        }),
      };
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      console.error('Error inviting user: no action link returned', data);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not create the invitation link' }) };
    }

    const greeting = displayName ? `Hello ${displayName},` : 'Hello,';
    const html = brandedEmail({
      heading: 'You are invited to the member portal',
      intro: `${greeting} ${user.email} has invited you to the Goodwood Lodge No. 159 member portal. Follow the button below to set your password and sign in.`,
      body: `
        <div style="text-align:center;padding:8px 0 4px;">
          <a href="${escapeHtml(actionLink)}"
             style="display:inline-block;background-color:#1b2a4a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.02em;padding:14px 28px;border-radius:4px;">
            Accept invitation
          </a>
        </div>
        <p style="font-size:13px;color:#8a7f6a;line-height:1.6;margin-top:16px;">
          If the button does not work, copy and paste this link into your browser:<br>
          <span style="word-break:break-all;color:#1b2a4a;">${escapeHtml(actionLink)}</span>
        </p>`,
      footer: 'If you were not expecting this invitation, you can safely ignore this email.',
    });

    const text = `${greeting}\n\n${user.email} has invited you to the Goodwood Lodge No. 159 member portal.\n\nSet your password and sign in here:\n${actionLink}\n\nIf you were not expecting this invitation, you can safely ignore this email.`;

    const sent = await sendEmail({
      to: email,
      subject: 'You are invited to the Goodwood Lodge member portal',
      html,
      text,
    });

    if (!sent) {
      // The user was created but the email did not go out. Say so, so the
      // inviter knows to resend rather than assuming it is on its way.
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'The account was created but the invitation email could not be sent. Please try again.',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Invitation sent successfully', user: data.user }),
    };
  } catch (error: any) {
    console.error('Error in invite-member function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
