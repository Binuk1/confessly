import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';

function TrendingConfessions() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const timestamp24hAgo = Timestamp.fromDate(twentyFourHoursAgo);

    // Query confessions from last 24 hours
    const q = query(
      collection(db, 'confessions'), 
      where('createdAt', '>=', timestamp24hAgo),
      orderBy('createdAt', 'desc')
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

      // Sort by total reactions (trending = most reacted in last 24h)
      const sorted = items
        .sort((a, b) => b.totalReactions - a.totalReactions)
        .slice(0, 5);

      setTrending(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trending confessions:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

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
          <ConfessionItem key={conf.id} confession={conf} rank={index + 1} />
        ))
      )}
    </div>
  );
}

export default TrendingConfessions;