import { useState } from 'react';
import ConfessionForm from './ConfessionForm';
import ConfessionList from './ConfessionList';

function ConfessionContainer() {
  const [optimisticConfession, setOptimisticConfession] = useState(null);

  const handleOptimisticConfession = (confession, isError = false) => {
    if (isError) {
      // Clear optimistic confession on error
      setOptimisticConfession(null);
    } else {
      // Set optimistic confession
      setOptimisticConfession(confession);
    }
  };

  const handleOptimisticCleared = () => {
    setOptimisticConfession(null);
  };

  return (
    <div className="confession-container">
      <ConfessionForm onOptimisticConfession={handleOptimisticConfession} />
      <ConfessionList 
        optimisticConfession={optimisticConfession}
        onOptimisticCleared={handleOptimisticCleared}
      />
    </div>
  );
}

export default ConfessionContainer;