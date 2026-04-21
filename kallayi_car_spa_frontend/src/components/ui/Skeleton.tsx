import React from 'react';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded-xl ${className}`}
      {...props}
    />
  );
}
