'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarImageUrl = user?.avatar && user.avatar.length > 2 ? user.avatar : null;
  const avatarInitial = user?.avatar && user.avatar.length <= 2 ? user.avatar : user?.name?.[0] || 'U';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.eyeIcon}>
          <EyeIcon />
        </div>
        <span className={styles.logoText}>EYES</span>
      </div>

      <div className={styles.right} ref={menuRef}>
        <button 
          className={styles.avatarBtn} 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="User menu"
        >
          <div className={styles.avatar}>
            {avatarImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarImageUrl} alt="User avatar" className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarInitial}>{avatarInitial}</span>
            )}
            <span className={styles.onlineDot} />
          </div>
        </button>

        {isMenuOpen && (
          <div className={styles.dropdown}>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userPlan}>{user?.plan || 'PRIVATE BETA'}</div>
            </div>
            <div className={styles.divider} />
            <button 
              className={`${styles.menuItem} ${styles.logoutBtn}`}
              onClick={() => logout()}
            >
              <LogoutIcon /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
