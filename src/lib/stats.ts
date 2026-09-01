import { doc, onSnapshot, setDoc, increment, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function trackSiteVisit(): Promise<void> {
  if (typeof window === 'undefined') return;

  const sessionKey = 'wbsedcl_has_visited_session';
  const hasVisited = sessionStorage.getItem(sessionKey);

  if (!hasVisited) {
    sessionStorage.setItem(sessionKey, 'true');
    try {
      const statsRef = doc(db, 'site_stats', 'global_metrics');
      const snap = await getDoc(statsRef);
      if (!snap.exists()) {
        await setDoc(statsRef, { visitCount: 1, updatedAt: Date.now() });
      } else {
        await setDoc(statsRef, { visitCount: increment(1), updatedAt: Date.now() }, { merge: true });
      }
    } catch (e) {
      console.warn('Could not record site visit:', e);
    }
  }
}

export function subscribeToSiteVisits(callback: (count: number) => void): () => void {
  const statsRef = doc(db, 'site_stats', 'global_metrics');
  return onSnapshot(
    statsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(typeof data.visitCount === 'number' ? data.visitCount : 100);
      } else {
        callback(100);
      }
    },
    (err) => {
      console.warn('Failed to listen to visitor stats:', err);
      callback(100);
    }
  );
}
