'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainContent from '@/components/MainContent';
import styles from './page.module.css';

export default function Home() {
  const [isSystemBooting, setIsSystemBooting] = useState(true);

  // Synchronize loading across components
  const handleBootComplete = () => {
    // Artificial delay for that premium 'handshake' feel
    setTimeout(() => setIsSystemBooting(false), 200);
  };

  return (
    <div className={styles.pageRoot}>
      {isSystemBooting && (
        <div className={styles.globalBootLoader}>
          <div className={styles.bootText}>
            INITIALIZING EYES NEURAL LINK...
          </div>
          <div className={styles.bootProgressLine} />
        </div>
      )}
      <div className={`${styles.sidebarWrapper} ${isSystemBooting ? styles.hidden : ''}`}>
        <Sidebar />
      </div>
      <div className={`${styles.headerWrapper} ${isSystemBooting ? styles.hidden : ''}`}>
        <Header />
      </div>
      <div className={`${styles.mainWrapper} ${isSystemBooting ? styles.hidden : ''}`}>
        <MainContent onLoaded={handleBootComplete} />
      </div>
    </div>
  );
}
