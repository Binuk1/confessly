import { useEffect, useMemo, useRef, useState } from 'react';
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
  const SUBSCRIBE_LIMIT = 25; // cap how many RTDB listeners we open
  const REACTIONS_WEIGHT = 3; // prioritize reactions over replies
  // Live maps
  const [reactionsMap, setReactionsMap] = useState({}); // { [confessionId]: total }
  const [repliesMap, setRepliesMap] = useState({}); // { [confessionId]: count }
  const reactionUnsubsRef = useRef({});
  const repliesUnsubRef = useRef(null);

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
        // Derive a coarse Firestore reaction count if available to pre-rank candidates
        const coarseReactions = Object.values(data.reactions || {}).reduce((a, b) => a + (b || 0), 0);
        return { id: doc.id, ...data, coarseReactions };
      });

      setRecentItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trending confessions:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [isActive]);

  // Determine candidate IDs to subscribe to (limit to SUBSCRIBE_LIMIT)
  const candidateIds = useMemo(() => {
    if (recentItems.length === 0) return [];
    const scored = recentItems.map(item => {
      const replies = repliesMap[item.id] || 0;
      const coarse = item.coarseReactions || 0;
      return { id: item.id, coarseScore: (coarse * REACTIONS_WEIGHT) + replies };
    });
    scored.sort((a, b) => b.coarseScore - a.coarseScore);
    return scored.slice(0, SUBSCRIBE_LIMIT).map(s => s.id);
  }, [recentItems, repliesMap]);

  // Visibility-based pause/resume for all RTDB subscriptions
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Unsubscribe all when tab not visible
        for (const id in reactionUnsubsRef.current) {
          const fn = reactionUnsubsRef.current[id];
          if (typeof fn === 'function') fn();
          delete reactionUnsubsRef.current[id];
        }
      } else {
        // Will resubscribe via next effect run based on candidateIds
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // (moved) subscription effect placed after topFive to ensure Top 5 are always subscribed

  // Live replies counter for last 24h, grouped by confessionId
  useEffect(() => {
    if (!isActive) return;
    // 24h window
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const ts = Timestamp.fromDate(twentyFourHoursAgo);

    // Listen to replies created in last 24h
    const rq = query(
      collection(db, 'replies'),
      where('createdAt', '>=', ts)
    );

    const unsub = onSnapshot(rq, (snapshot) => {
      const counts = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const cid = data.confessionId;
        if (!cid) return;
        counts[cid] = (counts[cid] || 0) + 1;
      });
      setRepliesMap(counts);
    }, (error) => {
      console.error('Error listening to replies for trending:', error);
      setRepliesMap({});
    });

    // store and cleanup
    repliesUnsubRef.current?.();
    repliesUnsubRef.current = unsub;
    return () => {
      repliesUnsubRef.current?.();
      repliesUnsubRef.current = null;
    };
  }, [isActive]);

  // Hard cleanup when view becomes inactive
  useEffect(() => {
    if (!isActive) {
      // Realtime DB reaction listeners
      for (const id in reactionUnsubsRef.current) {
        const fn = reactionUnsubsRef.current[id];
        if (typeof fn === 'function') fn();
        delete reactionUnsubsRef.current[id];
      }
      // Replies listener
      repliesUnsubRef.current?.();
      repliesUnsubRef.current = null;
      // Optionally reset maps to reduce memory
      setReactionsMap({});
      setRepliesMap({});
    }
  }, [isActive]);

  const topFive = useMemo(() => {
    if (!recentItems || recentItems.length === 0) return [];
    const withScores = recentItems.map(item => {
      const reactions = reactionsMap[item.id] || 0;
      const replies = repliesMap[item.id] || 0;
      const score = (reactions * REACTIONS_WEIGHT) + replies;
      return { ...item, score, reactions, replies };
    });
    const sorted = withScores.sort((a, b) => {
      // Primary: more reactions first
      if (b.reactions !== a.reactions) return b.reactions - a.reactions;
      // Secondary: higher weighted score
      if (b.score !== a.score) return b.score - a.score;
      // Tertiary: more recent
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return sorted.slice(0, 5);
  }, [recentItems, reactionsMap, repliesMap]);

  useEffect(() => {
    setTrending(topFive);
  }, [topFive]);

  // Subscribe to union of Top 5 and candidate IDs (within SUBSCRIBE_LIMIT)
  const subscribedIds = useMemo(() => {
    const topIds = (topFive || []).map(i => i.id);
    const set = new Set(topIds);
    for (const id of candidateIds) {
      if (set.size >= SUBSCRIBE_LIMIT) break;
      set.add(id);
    }
    return Array.from(set);
  }, [topFive, candidateIds]);

  useEffect(() => {
    if (!isActive) return;
    // Unsubscribe anything not in the target set
    const currentSet = new Set(subscribedIds);
    for (const id in reactionUnsubsRef.current) {
      if (!currentSet.has(id)) {
        const fn = reactionUnsubsRef.current[id];
        if (typeof fn === 'function') fn();
        delete reactionUnsubsRef.current[id];
      }
    }

    // Subscribe missing ones
    subscribedIds.forEach(id => {
      if (reactionUnsubsRef.current[id]) return;
      const unsub = subscribeToReactions(id, (reactions) => {
        const total = Object.values(reactions || {}).reduce((a, b) => a + (b || 0), 0);
        setReactionsMap(prev => ({ ...prev, [id]: total }));
      });
      reactionUnsubsRef.current[id] = unsub;
    });

    return () => {
      if (!isActive) {
        for (const id in reactionUnsubsRef.current) {
          const fn = reactionUnsubsRef.current[id];
          if (typeof fn === 'function') fn();
        }
        reactionUnsubsRef.current = {};
      }
    };
  }, [subscribedIds, isActive]);

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