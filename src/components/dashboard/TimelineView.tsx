'use client';

import React from 'react';
import styles from '../MainContent.module.css';

interface TimelineViewProps {
  onBack: () => void;
}

export function TimelineView({ onBack }: TimelineViewProps) {
  return (
    <div className={styles.soloView}>
      <button className={styles.backBtn} onClick={onBack}>← Back</button>
      <h2 className={`${styles.soloTitle} ${styles.soloTitleBlue}`}>TIME LINE</h2>
      <div className={styles.graphContainer}>
        {/* Y-Axis Label */}
        <div className={styles.yAxisLabel}>Items Indexed</div>
        
        <svg viewBox="0 0 1000 350" className={styles.svgGraph}>
           <defs>
              <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.1" />
              </linearGradient>
              <filter id="barNeon"><feGaussianBlur stdDeviation="4" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
           </defs>

           {/* Grid Lines */}
           <line x1="80" y1="20" x2="980" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
           <line x1="80" y1="120" x2="980" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
           <line x1="80" y1="220" x2="980" y2="220" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

           {/* Y-Axis Scale */}
           <text x="70" y="25" textAnchor="end" className={styles.axisScaleText}>150k</text>
           <text x="70" y="125" textAnchor="end" className={styles.axisScaleText}>100k</text>
           <text x="70" y="225" textAnchor="end" className={styles.axisScaleText}>50k</text>
           <text x="70" y="325" textAnchor="end" className={styles.axisScaleText}>0</text>

           {/* Axes */}
           <line x1="80" y1="20" x2="80" y2="320" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
           <line x1="80" y1="320" x2="980" y2="320" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

           {/* Premium Bar Series */}
           <rect x="100" y="280" width="50" height="40" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="200" y="260" width="50" height="60" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="300" y="200" width="50" height="120" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="400" y="150" width="50" height="170" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="500" y="100" width="50" height="220" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="600" y="180" width="50" height="140" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="700" y="80" width="50" height="240" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="800" y="40" width="50" height="280" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
           <rect x="900" y="20" width="50" height="300" rx="4" fill="url(#barG)" filter="url(#barNeon)" />
        </svg>
        <div className={styles.xAxisLabel}>Indexing Timeline (Year)</div>
        <div className={styles.timelineLabels}>
                  {['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'].map((y) => (
                     <span key={y} className={styles.timelineLabelItem}>
              {y}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
