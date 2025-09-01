import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import _ from 'lodash';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';
import { subscribeToReactionsLast24h } from '../services/reactionService';

function TrendingConfessions({ isActive = true, onOpenSettings }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const LIMIT_RECENT = 100; // cap how many docs we process client-side
  const SUBSCRIBE_LIMIT = 25; // cap how many RTDB listeners we open
  // Live maps
  const [reactionsMap, setReactionsMap] = useState({}); // { [confessionId]: total in last 24h }
  const reactionUnsubsRef = useRef({});
  const reactionsLiveRef = useRef({}); // accumulate live counts without causing reorders every tick
  const syncTimerRef = useRef(null); // throttle state sync
  // Keep previous order to make sorting stable and avoid brief rank flips
  const prevOrderRef = useRef([]);

  useEffect(() => {
    // Always keep a Firestore listener so data is warm when user switches tabs
    const q = query(
      collection(db, 'confessions'),
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
  }, []);

  // Memoize candidate IDs with a stable sort
  const candidateIds = useMemo(() => {
    if (recentItems.length === 0) return [];
    
    // Create a stable sort by including the ID as a tiebreaker
    const scored = recentItems.map(item => ({
      id: item.id,
      coarseScore: item.coarseReactions || 0
    }));
    
    // Sort by score (descending) and then by ID (for stability)
    scored.sort((a, b) => {
      if (b.coarseScore !== a.coarseScore) {
        return b.coarseScore - a.coarseScore;
      }
      return a.id.localeCompare(b.id);
    });
    
    return scored.slice(0, SUBSCRIBE_LIMIT).map(s => s.id);
  }, [recentItems, SUBSCRIBE_LIMIT]);

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

  // Throttle reaction updates to prevent excessive re-renders
  const throttledSetReactionsMap = useRef(
    _.throttle(
      (newReactions) => {
        setReactionsMap(newReactions);
      },
      200, // 200ms throttle
      { leading: true, trailing: true }
    )
  ).current;

  // Hard cleanup when view becomes inactive
  useEffect(() => {
    if (!isActive) {
      // Realtime DB reaction listeners
      for (const id in reactionUnsubsRef.current) {
        const fn = reactionUnsubsRef.current[id];
        if (typeof fn === 'function') fn();
        delete reactionUnsubsRef.current[id];
      }
      // Optionally reset maps to reduce memory
      setReactionsMap({});
    }
  }, [isActive]);

  // Memoize the date calculation to prevent recreation on every render
  const twentyFourHoursAgo = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - (24 * 60 * 60 * 1000));
  }, []);

  const topFive = useMemo(() => {
    if (!recentItems || recentItems.length === 0) return [];
    
    // First, filter out confessions older than 24 hours
    const recentConfessions = recentItems.filter(item => {
      const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(0);
      return createdAt >= twentyFourHoursAgo;
    });
    
    // Add reaction counts and calculate total reactions
    const withScores = recentConfessions.map(item => {
      // Get reactions from our live map, default to empty object if none
      const reactions = reactionsMap[item.id] || {};
      // Calculate total reactions, ensuring we're working with numbers
      const totalReactions = typeof reactions === 'object' 
        ? Object.values(reactions).reduce((sum, count) => sum + (Number(count) || 0), 0)
        : 0;
      
      return { 
        ...item, 
        reactions, 
        totalReactions,
        // Add timestamp for tie-breaking if needed
        timestamp: item.createdAt?.toMillis ? item.createdAt.toMillis() : 0
      };
    });
    
    // Sort by total reactions (descending), then by timestamp (newest first for same reaction count)
    const sorted = [...withScores].sort((a, b) => {
      // First sort by total reactions (descending)
      if (b.totalReactions !== a.totalReactions) {
        return b.totalReactions - a.totalReactions;
      }
      // If reactions are equal, sort by timestamp (newest first)
      return b.timestamp - a.timestamp;
    });
    
    // Return top 5, including those with 0 reactions
    return sorted.slice(0, 5);
  }, [recentItems, reactionsMap]);

  useEffect(() => {
    if (!topFive) return;
    
    // Update trending state immediately when topFive changes
    setTrending(topFive);
    
    // Update previous order ref for stability
    prevOrderRef.current = topFive.map(i => i.id);
    
    // Set updating state briefly to trigger any animations
    setIsUpdating(true);
    const timer = setTimeout(() => setIsUpdating(false), 100);
    return () => clearTimeout(timer);
  }, [topFive]);

  // Optimize subscription list to minimize changes
  const subscribedIds = useMemo(() => {
    // Only consider items from the last 24 hours
    const recentIds = recentItems
      .filter(item => {
        const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(0);
        return createdAt >= twentyFourHoursAgo;
      })
      .map(item => item.id);
    
    // Include current top 5
    const topIds = (topFive || []).map(i => i.id);
    
    // Combine, dedupe, and limit
    const allIds = [...new Set([...recentIds, ...topIds])];
    
    // Sort to maintain stable subscription order
    const sorted = [...allIds].sort((a, b) => a.localeCompare(b));
    return sorted.slice(0, SUBSCRIBE_LIMIT);
  }, [recentItems, topFive, twentyFourHoursAgo, SUBSCRIBE_LIMIT]);

  useEffect(() => {
    if (!isActive) return;
    
    // Unsubscribe anything not in the target set
    const currentSet = new Set(subscribedIds);
    for (const id in reactionUnsubsRef.current) {
      if (!currentSet.has(id)) {
        const fn = reactionUnsubsRef.current[id];
        if (typeof fn === 'function') fn();
        delete reactionUnsubsRef.current[id];
        // Also remove from live ref to prevent stale data
        if (reactionsLiveRef.current[id]) {
          delete reactionsLiveRef.current[id];
        }
      }
    }

    // Subscribe to reactions for each confession
    subscribedIds.forEach(id => {
      if (reactionUnsubsRef.current[id]) return;
      
      const unsub = subscribeToReactionsLast24h(id, (reactions) => {
        // Store the full reactions object, not just the total
        const reactionData = reactions || {};
        const total = Object.values(reactionData).reduce((sum, count) => sum + (Number(count) || 0), 0);
        
        // Update the live ref with the full reaction data
        reactionsLiveRef.current = { 
          ...reactionsLiveRef.current, 
          [id]: reactionData 
        };
        
        // Use the throttled update function
        throttledSetReactionsMap({
          ...reactionsMap,
          ...reactionsLiveRef.current
        });
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

  // Cleanup any pending throttle timers on unmount or when deactivating
  useEffect(() => {
    if (isActive) return;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    
    return () => {
      // Cancel any pending throttle executions
      throttledSetReactionsMap.cancel();
    };
  }, [isActive, throttledSetReactionsMap]);

  return (
    <div className={`trending-wrapper ${isUpdating ? 'updating' : ''}`}>
      {trending.length === 0 && loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <SkeletonItem size={50} />
        </div>
      ) : trending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No trending confessions in the last 24 hours
        </div>
      ) : (
        <>
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.9rem',
            marginBottom: '0.5rem'
          }}>
            Top 5 most reacted in the last 24 hours
          </div>
          {trending.map((conf, index) => (
            <ConfessionItem key={conf.id} confession={conf} rank={index + 1} onOpenSettings={onOpenSettings} />
          ))}
        </>
      )}
    </div>
  );
}

export default TrendingConfessions;