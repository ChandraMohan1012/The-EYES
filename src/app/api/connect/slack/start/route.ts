import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!clientId) {
    return NextResponse.redirect(new URL('/connect/slack?oauth=error&reason=missing_client_id', siteUrl));
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.redirect(new URL('/login', siteUrl));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('slack_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });

  const callbackUrl = new URL('/api/connect/slack/callback', siteUrl);
  const authUrl = new URL('https://slack.com/oauth/v2/authorize');
  
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl.toString());
  authUrl.searchParams.set('user_scope', 'channels:read,groups:read,im:read,mpim:read'); // User scopes for reading user's messages/channels
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl);
}
