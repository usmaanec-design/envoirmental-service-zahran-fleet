import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: string;
  variant?: 'default' | 'error' | 'warning';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  illustration,
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconText: 'text-gray-400 dark:text-gray-600',
      titleText: 'text-gray-900 dark:text-gray-100',
      descText: 'text-gray-600 dark:text-gray-400',
    },
    error: {
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconText: 'text-red-600 dark:text-red-400',
      titleText: 'text-red-900 dark:text-red-100',
      descText: 'text-red-600 dark:text-red-400',
    },
    warning: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconText: 'text-yellow-600 dark:text-yellow-400',
      titleText: 'text-yellow-900 dark:text-yellow-100',
      descText: 'text-yellow-600 dark:text-yellow-400',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Icon or Illustration */}
      {illustration ? (
        <img src={illustration} alt={title} className="w-64 h-64 mb-6 opacity-80" />
      ) : icon ? (
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${styles.iconBg}`}>
          <div className={`text-4xl ${styles.iconText}`}>{icon}</div>
        </div>
      ) : null}

      {/* Title */}
      <h3 className={`text-xl font-bold mb-2 text-center ${styles.titleText}`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`text-sm text-center max-w-md mb-6 ${styles.descText}`}>
        {description}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg
                   hover:from-orange-600 hover:to-orange-700 transition-all duration-200
                   shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95
                   font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
