// SkeletonItem.jsx
import React from 'react';
import './SkeletonItem.css';

function SkeletonItem({ style = {}, className = '' }) {
  return (
    <div className={`skeleton-item ${className}`} style={style} />
  );
}

export default SkeletonItem;
