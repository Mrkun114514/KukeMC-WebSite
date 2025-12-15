import React from 'react';
import { getLevelColor } from '../utils/levelUtils';
import clsx from 'clsx';
import { Crown } from 'lucide-react';

interface LevelBadgeProps {
  level?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ 
  level = 0, 
  size = 'sm', 
  showIcon = false,
  className 
}) => {
  const styles = getLevelColor(level);
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-0.5 gap-1",
    lg: "text-sm px-2.5 py-1 gap-1.5"
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14
  };

  return (
    <span 
      className={clsx(
        "inline-flex items-center justify-center font-bold rounded-full transition-all duration-300 select-none",
        styles.bg,
        styles.text,
        styles.border,
        "border",
        sizeClasses[size],
        className
      )}
      title={`Level ${level}`}
    >
      {showIcon && (
        <Crown size={iconSizes[size]} className={clsx(styles.icon, "fill-current opacity-70")} />
      )}
      <span className="font-mono">Lv.{level}</span>
    </span>
  );
};

export default LevelBadge;
