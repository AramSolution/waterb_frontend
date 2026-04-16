import React from 'react';
import '@/shared/styles/admin/skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, className = '' }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="skeleton-text"
          width={index === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <Skeleton className="skeleton-title" />
      <SkeletonText lines={4} />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonAvatar: React.FC = () => {
  return <Skeleton className="skeleton-avatar" />;
};

export const SkeletonButton: React.FC = () => {
  return <Skeleton className="skeleton-button" />;
};
