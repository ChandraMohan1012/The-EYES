import { NextResponse } from 'next/server';
import { generateEmbedding } from '@/utils/ai';
import { buildDeterministicChunks } from '@/utils/ai/chunking';
import { resolveSyncActor } from '@/utils/sync/actor';

/**
 * Background worker to generate embeddings for all 'raw_events' that haven't been indexed.
 * This makes them searchable via 'Ask Your Memory'.
 */
export async function POST(request: Request) {
  try {
    const actor = await resolveSyncActor(request);
    if ('status' in actor) {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    const { supabase, userId } = actor;

    // Find the latest events that don't have an embedding yet
    // Strategy: Join raw_events with embeddings on event_id and find nulls
    const { data: events, error: fetchError } = await supabase
      .from('raw_events')
      .select('id, platform, event_type, title, content')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .limit(20); // Process in small batches to stay within serverless timeouts

    if (fetchError) throw fetchError;
    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'All memories are already indexed.', count: 0 });
    }

    // Check which ones already have embeddings to avoid double-spend
    const { data: existing } = await supabase
      .from('embeddings')
      .select('event_id')
      .eq('user_id', userId);
    
    const existingIds = new Set(existing?.map(e => e.event_id) || []);
    const pendingEvents = events.filter(e => !existingIds.has(e.id));

    if (pendingEvents.length === 0) {
       return NextResponse.json({ message: 'All memories in this batch already have embeddings.', count: 0 });
    }

    console.log(`[AI-Brain] Indexing ${pendingEvents.length} new memories for ${userId}`);

    const indexResults = await Promise.all(
      pendingEvents.map(async (event) => {
        const chunks = buildDeterministicChunks({
          platform: event.platform,
          eventType: event.event_type,
          title: event.title,
          content: event.content || '',
        });

        let insertedChunks = 0;

        for (const chunk of chunks) {
          const result = await generateEmbedding(chunk);
          if (!result) {
            continue;
          }

          const { error: insertError } = await supabase
            .from('embeddings')
            .insert({
              user_id: userId,
              event_id: event.id,
              content: chunk,
              embedding: result.embedding,
            });

          if (insertError) {
            console.warn('[AI-Brain] Failed to persist embedding chunk:', insertError.message);
            continue;
          }

          insertedChunks += 1;
        }

        return {
          indexedEvent: insertedChunks > 0,
          indexedChunks: insertedChunks,
        };
      })
    );

    const successCount = indexResults.filter((result) => result.indexedEvent).length;
    const indexedChunkCount = indexResults.reduce((total, result) => total + result.indexedChunks, 0);

    return NextResponse.json({ 
      message: `Memory indexing cycle complete.`, 
      indexed: successCount,
      indexedChunks: indexedChunkCount,
      pending: pendingEvents.length - successCount
    });
  } catch (err) {
    console.error('[AI-Brain] Indexing cycle failed:', err);
    return NextResponse.json({ error: 'Failed to generate memory embeddings.' }, { status: 500 });
  }
}
