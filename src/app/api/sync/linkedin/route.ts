import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-cron-secret');
  const userId = request.headers.get('x-cron-user-id');

  if (authHeader !== process.env.CRON_SECRET || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Get Token
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .single();

    if (!tokenData) return NextResponse.json({ error: 'No token found' }, { status: 404 });

    // 2. Mock Fetching
    const mockEvents = [
      {
        user_id: userId,
        platform: 'linkedin',
        platform_id: `li_${Date.now()}`,
        event_type: 'post',
        title: 'New LinkedIn Post',
        content: 'I am thrilled to announce that I have joined the EYES team as a Lead Developer!',
        author: 'User',
        timestamp: new Date().toISOString(),
        metadata: { likes: 42 }
      }
    ];

    // 3. Save Events
    const { error: eventError } = await supabase
      .from('raw_events')
      .upsert(mockEvents, { onConflict: 'user_id,platform,platform_id' });

    if (eventError) throw eventError;

    // 4. Update Sync Status
    await supabase
      .from('sync_status')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'idle'
      })
      .eq('user_id', userId)
      .eq('platform', 'linkedin');

    return NextResponse.json({ success: true, count: mockEvents.length });
  } catch (err) {
    console.error('LinkedIn Sync Error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
