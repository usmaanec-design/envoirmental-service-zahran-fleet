import React from 'react';
import { motion } from 'framer-motion';

interface EnhancedStatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'orange' | 'green' | 'blue' | 'red' | 'purple' | 'yellow';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  subtitle?: string;
  onClick?: () => void;
  gradient?: boolean;
  loading?: boolean;
}

const colorMap = {
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  yellow: {
    gradient: 'from-yellow-500 to-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
};

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  subtitle,
  onClick,
  gradient = false,
  loading = false,
}) => {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-24 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="w-32 h-8 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
        <div className="w-20 h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-lg shadow-md p-3
        ${gradient ? 'bg-orange-500' : `bg-white dark:bg-gray-800 border ${colors.border}`}
        ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
        transition-shadow duration-300
      `}
    >
      {/* Background Pattern - Removed for better text visibility */}

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-xs font-semibold ${gradient ? 'text-gray-900' : 'text-gray-600 dark:text-gray-400'}`}>
            {title}
          </h3>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-lg
            ${gradient ? 'bg-gray-900/10 text-gray-900' : colors.bg}
          `}>
            {icon}
          </div>
        </div>

        {/* Value */}
        <div className={`text-2xl font-bold mb-1 ${gradient ? 'text-gray-900' : colors.text}`}>
          {value.toLocaleString()}
        </div>

        {/* Subtitle & Trend */}
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className={`text-xs ${gradient ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={`
              flex items-center gap-1 text-xs font-medium
              ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}
              ${gradient ? 'bg-gray-900/10 px-2 py-1 rounded' : ''}
            `}>
              <i className={`fas fa-arrow-${trend.direction} text-xs`}></i>
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Period Info */}
        {trend && (
          <p className={`text-xs mt-1 ${gradient ? 'text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
            {trend.period}
          </p>
        )}
      </div>

      {/* Hover Effect Overlay */}
      {onClick && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        />
      )}
    </motion.div>
  );
};

export default EnhancedStatCard;
