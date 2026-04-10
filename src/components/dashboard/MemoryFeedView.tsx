'use client';

import React from 'react';
import styles from '../MainContent.module.css';
import { ALL_POSSIBLE_PLATFORMS } from '@/config/platforms';
import type { FeedItem, PlatformStatus } from '@/types/dashboard';

interface MemoryFeedViewProps {
  onBack: () => void;
  feedEvents: FeedItem[];
  platforms: PlatformStatus[];
  filterPlatform: string;
  setFilterPlatform: (id: string) => void;
}

export function MemoryFeedView({ 
  onBack, 
  feedEvents, 
  platforms, 
  filterPlatform, 
  setFilterPlatform 
}: MemoryFeedViewProps) {
  return (
    <div className={styles.soloView}>
       <div className={styles.viewHeader}>
          <div className={styles.headerTop}>
             <button className={styles.backBtn} onClick={onBack}>← Back</button>
             <h1 className={styles.soloTitle}>MEMORY FEED</h1>
          </div>
          
          <div className={styles.filterBar}>
             <button 
               className={`${styles.filterChip} ${filterPlatform === 'all' ? styles.filterChipActive : ''}`}
               onClick={() => setFilterPlatform('all')}
             >
                All Activities
             </button>
             {platforms.filter(p => p.connected).map(p => (
                <button 
                  key={p.id}
                  className={`${styles.filterChip} ${filterPlatform === p.id ? styles.filterChipActive : ''}`}
                  onClick={() => setFilterPlatform(p.id)}
                >
                   {p.name}
                </button>
             ))}
          </div>
       </div>
       
       <div className={styles.feedScrollArea}>
          {feedEvents
            .filter(e => filterPlatform === 'all' || e.platform.toLowerCase() === filterPlatform.toLowerCase())
            .map((e) => {
            const platform = ALL_POSSIBLE_PLATFORMS.find(p => p.id === e.platform.toLowerCase());
            return (
              <div key={e.id} className={styles.feedEventCard}>
                 <div className={styles.eventIconWrapper}>
                    {platform?.icon || <div className={styles.fallbackIcon}>{e.platform[0]}</div>}
                 </div>
                 <div className={styles.eventMain}>
                    <div className={styles.eventMeta}>
                       <span className={styles.platformBadge}>{e.platform}</span>
                       <span className={styles.eventTime}>{e.timestamp ? new Date(e.timestamp).toLocaleDateString() : 'Recent'}</span>
                    </div>
                    <h3 className={styles.eventTitle}>{e.title || 'Indexed Discovery'}</h3>
                    <p className={styles.eventBody}>{e.content}</p>
                    <div className={styles.eventFooter}>
                       <span className={styles.categoryTag}>MEMORY INDEX</span>
                    </div>
                 </div>
              </div>
            );
          })}
          {feedEvents.length === 0 && (
            <div className={styles.emptyFeed}>
               <div className={styles.emptyIcon}>∅</div>
               <p>The neural index is currently empty. Connect a platform to begin ingestion.</p>
            </div>
          )}
       </div>
    </div>
  );
}
