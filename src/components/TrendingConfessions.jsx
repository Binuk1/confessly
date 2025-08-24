import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';
import { subscribeToReactions } from '../services/reactionService';

function TrendingConfessions({ isActive = true, onOpenSettings }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState([]);
  const LIMIT_RECENT = 100; // cap how many docs we process client-side

  useEffect(() => {
    if (!isActive) {
      return;
    }
    // Get timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const timestamp24hAgo = Timestamp.fromDate(twentyFourHoursAgo);

    // Query confessions from last 24 hours
    const q = query(
      collection(db, 'confessions'), 
      where('createdAt', '>=', timestamp24hAgo),
      orderBy('createdAt', 'desc'),
      limit(LIMIT_RECENT)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        const totalReactions = Object.values(data.reactions || {}).reduce(
          (a, b) => a + b,
          0
        );
        return { id: doc.id, ...data, totalReactions };
      });

      setRecentItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trending confessions:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [isActive]);

  const topFive = useMemo(() => {
    if (!recentItems || recentItems.length === 0) return [];
    const sorted = [...recentItems].sort((a, b) => b.totalReactions - a.totalReactions);
    return sorted.slice(0, 5);
  }, [recentItems]);

  useEffect(() => {
    setTrending(topFive);
  }, [topFive]);

  return (
    <div className="trending-wrapper">
      {trending.length === 0 && loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <SkeletonItem size={50} />
        </div>
      ) : trending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No trending confessions in the last 24 hours
        </div>
      ) : (
        trending.map((conf, index) => (
          <ConfessionItem key={conf.id} confession={conf} rank={index + 1} onOpenSettings={onOpenSettings} />
        ))
      )}
    </div>
  );
}

export default TrendingConfessions;