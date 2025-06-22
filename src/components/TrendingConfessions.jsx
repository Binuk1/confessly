import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem'; // ADDED

function TrendingConfessions() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true); // Added for consistency

  useEffect(() => {
    const q = query(collection(db, 'confessions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        const totalReactions = Object.values(data.reactions || {}).reduce(
          (a, b) => a + b,
          0
        );
        return { id: doc.id, ...data, totalReactions };
      });

      const sorted = items
        .sort((a, b) => b.totalReactions - a.totalReactions)
        .slice(0, 5);

      setTrending(sorted);
      setLoading(false); // Set loading false after fetch
    });

    return () => unsub();
  }, []);

  return (
    <div className="trending-wrapper">
      {/* UPDATED: Loading logic */}
      {trending.length === 0 && loading ? (
        <>
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </>
      ) : (
        trending.map((conf, index) => (
          <ConfessionItem key={conf.id} confession={conf} rank={index + 1} />
        ))
      )}
    </div>
  );
}

export default TrendingConfessions;