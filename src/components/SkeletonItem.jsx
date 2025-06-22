import './SkeletonItem.css';

function SkeletonItem({ size = 40 }) {
  return (
    <div className="skeleton-spinner" style={{ width: size, height: size }} />
  );
}

export default SkeletonItem;
