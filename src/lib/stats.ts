import { doc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export async function trackSiteVisit(): Promise<void> {
  if (typeof window === 'undefined') return;

  const sessionKey = 'app_has_visited_session';
  const hasVisited =
    sessionStorage.getItem(sessionKey) ||
    sessionStorage.getItem('wbsedcl_has_visited_session');

  const localVisits = parseInt(
    localStorage.getItem('app_local_visits') ||
      localStorage.getItem('wbsedcl_local_visits') ||
      '0',
    10
  );

  if (!hasVisited) {
    sessionStorage.setItem(sessionKey, 'true');
    localStorage.setItem('app_local_visits', (localVisits + 1).toString());
    try {
      const statsRef = doc(db, 'site_stats', 'global_metrics');
      await setDoc(
        statsRef,
        { visitCount: increment(1), updatedAt: Date.now() },
        { merge: true }
      );
    } catch {
      // Gracefully fall back if Firestore rules or network fail
    }
  }
}

export function subscribeToSiteVisits(callback: (count: number) => void): () => void {
  const localVisits = parseInt(
    localStorage.getItem('app_local_visits') ||
      localStorage.getItem('wbsedcl_local_visits') ||
      '0',
    10
  );

  try {
    const statsRef = doc(db, 'site_stats', 'global_metrics');
    return onSnapshot(
      statsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const count = typeof data.visitCount === 'number' ? data.visitCount : 0;
          callback(count);
        } else {
          callback(0);
        }
      },
      () => {
        callback(localVisits);
      }
    );
  } catch {
    callback(localVisits);
    return () => {};
  }
}
