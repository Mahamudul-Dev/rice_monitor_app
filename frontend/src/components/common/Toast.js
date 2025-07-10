import React, { useEffect, useState, useCallback } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Toast Notification Component
 * Displays temporary notification messages to the user
 * 
 * @param {Object} props - Component properties
 * @param {string} props.message - The message to display
 * @param {string} props.type - Toast type ('success', 'error', 'warning', 'info')
 * @param {number} props.duration - How long to show the toast (ms), 0 for persistent
 * @param {function} props.onClose - Callback when toast is closed
 * @param {string} props.position - Toast position ('top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center')
 * @param {boolean} props.showCloseButton - Whether to show the close button
 * @param {string} props.className - Additional CSS classes
 */
const Toast = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top-right',
  showCloseButton = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);


  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300); // Match animation duration
  }, [onClose]);


  // Auto close toast after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  
  

  if (!isVisible) return null;

  // Toast type configurations
  const typeConfig = {
    success: {
      icon: Check,
      bgColor: 'bg-green-600',
      borderColor: 'border-green-600',
      textColor: 'text-white',
      iconBg: 'bg-green-700'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-600',
      borderColor: 'border-red-600',
      textColor: 'text-white',
      iconBg: 'bg-red-700'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-600',
      borderColor: 'border-orange-600',
      textColor: 'text-white',
      iconBg: 'bg-orange-700'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-600',
      borderColor: 'border-blue-600',
      textColor: 'text-white',
      iconBg: 'bg-blue-700'
    }
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  // Animation classes
  const animationClasses = isLeaving
    ? 'animate-toast-exit opacity-0 scale-95'
    : 'animate-toast-enter';

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <div
      className={`
        fixed z-50 max-w-sm w-full
        ${positionClasses[position]}
        ${animationClasses}
        transition-all duration-300 ease-in-out
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          ${config.bgColor} ${config.borderColor} ${config.textColor}
          rounded-lg shadow-lg border-l-4 p-4
          flex items-start space-x-3
        `}
      >
        {/* Icon */}
        <div className={`${config.iconBg} rounded-full p-1 flex-shrink-0`}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className={`
              ${config.iconBg} rounded-full p-1 
              hover:opacity-80 transition-opacity
              flex-shrink-0
            `}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Toast Container Component
 * Manages multiple toasts and their positioning
 */
export const ToastContainer = ({ toasts = [], onRemoveToast, position = 'top-right' }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={position}
          onClose={() => onRemoveToast && onRemoveToast(toast.id)}
          className="pointer-events-auto"
        />
      ))}
    </div>
  );
};

/**
 * Custom hook for managing toasts
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      duration: options.duration || 5000,
      ...options
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove if duration is set
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message, options) => addToast(message, 'success', options);
  const error = (message, options) => addToast(message, 'error', options);
  const warning = (message, options) => addToast(message, 'warning', options);
  const info = (message, options) => addToast(message, 'info', options);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  };
};

/**
 * Higher-order component to provide toast functionality
 */
export const withToast = (Component) => {
  return (props) => {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
};

// CSS animations (add to your global CSS file)
export const toastStyles = `
  @keyframes toast-enter {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes toast-exit {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }

  .animate-toast-enter {
    animation: toast-enter 0.3s ease-out;
  }

  .animate-toast-exit {
    animation: toast-exit 0.3s ease-in;
  }
`;

export default Toast;