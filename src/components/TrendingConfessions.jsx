import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';

function TrendingConfessions() {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'confessions'), (snapshot) => {
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
    });

    return () => unsub();
  }, []);

  return (
    <div className="trending-wrapper">
      {trending.map((conf, index) => (
        <ConfessionItem 
          key={conf.id} 
          confession={conf} 
          rank={index + 1} 
        />
      ))}
    </div>
  );
}

export default TrendingConfessions;