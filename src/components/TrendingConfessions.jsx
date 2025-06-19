import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import confetti from 'canvas-confetti';

function TrendingConfessions() {
  const [trending, setTrending] = useState([]);
  const lastTopConfessionId = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'confessions'), (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        const totalReactions = Object.values(data.reactions || {}).reduce((a, b) => a + b, 0);
        return {
          id: doc.id,
          text: data.text || '',
          gifUrl: data.gifUrl || null,
          mediaUrl: data.mediaUrl || null,
          mediaType: data.mediaType || null,
          reactions: data.reactions || {},
          createdAt: data.createdAt || null,
          totalReactions,
        };
      });

      const sorted = items.sort((a, b) => b.totalReactions - a.totalReactions).slice(0, 5);

      // 🎉 Trigger confetti when new #1
      if (sorted.length && sorted[0].id !== lastTopConfessionId.current) {
        if (lastTopConfessionId.current !== null) {
          launchConfetti();
        }
        lastTopConfessionId.current = sorted[0].id;
      }

      setTrending(sorted);
    });

    return () => unsub();
  }, []);

  const launchConfetti = () => {
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

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
