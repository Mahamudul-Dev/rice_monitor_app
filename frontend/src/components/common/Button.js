import React from 'react';
import { Loader } from 'lucide-react';

/**
 * Reusable Button Component
 * Provides consistent styling and behavior for buttons throughout the app
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant ('primary', 'secondary', 'outline', 'ghost', 'danger')
 * @param {string} props.size - Button size ('sm', 'md', 'lg', 'xl')
 * @param {boolean} props.loading - Whether the button is in loading state
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {boolean} props.fullWidth - Whether the button should take full width
 * @param {React.ReactElement} props.leftIcon - Icon to display on the left
 * @param {React.ReactElement} props.rightIcon - Icon to display on the right
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onClick - Click handler
 * @param {string} props.type - Button type ('button', 'submit', 'reset')
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  // Base button classes
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
  `;

  // Variant styles
  const variantClasses = {
    primary: `
      bg-green-600 text-white
      hover:bg-green-700 
      focus:ring-green-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-100 text-gray-700
      hover:bg-gray-200
      focus:ring-gray-400
    `,
    outline: `
      border-2 border-green-600 text-green-600 bg-transparent
      hover:bg-green-50
      focus:ring-green-500
    `,
    ghost: `
      text-gray-600 bg-transparent
      hover:bg-gray-100
      focus:ring-gray-400
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus:ring-red-500
      shadow-sm hover:shadow-md
    `
  };

  // Size styles
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.md}
    ${widthClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Handle click with loading state
  const handleClick = (e) => {
    if (!loading && !disabled && onClick) {
      onClick(e);
    }
  };

  // Icon size based on button size
  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }[size];

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {/* Loading spinner or left icon */}
      {loading ? (
        <Loader className={`animate-spin ${iconSize} ${children ? 'mr-2' : ''}`} />
      ) : leftIcon ? (
        <span className={`${iconSize} ${children ? 'mr-2' : ''}`}>
          {leftIcon}
        </span>
      ) : null}

      {/* Button content */}
      {loading && !children ? null : (
        <span className={loading ? 'opacity-0' : ''}>
          {children}
        </span>
      )}

      {/* Right icon */}
      {!loading && rightIcon && (
        <span className={`${iconSize} ${children ? 'ml-2' : ''}`}>
          {rightIcon}
        </span>
      )}
    </button>
  );
};

/**
 * Button Group Component
 * For grouping related buttons together
 */
export const ButtonGroup = ({ 
  children, 
  className = '',
  orientation = 'horizontal',
  ...props 
}) => {
  const orientationClasses = {
    horizontal: 'flex-row space-x-2',
    vertical: 'flex-col space-y-2'
  };

  return (
    <div 
      className={`flex ${orientationClasses[orientation]} ${className}`}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Icon Button Component
 * For buttons that only contain an icon
 */
export const IconButton = ({
  icon,
  'aria-label': ariaLabel,
  size = 'md',
  variant = 'ghost',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <Button
      variant={variant}
      className={`${sizeClasses[size]} ${className}`}
      aria-label={ariaLabel}
      {...props}
    >
      <span className={iconSizes[size]}>
        {icon}
      </span>
    </Button>
  );
};

/**
 * Link Button Component
 * For buttons that look like links
 */
export const LinkButton = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <Button
    variant="ghost"
    className={`p-0 h-auto font-normal text-green-600 hover:text-green-700 hover:bg-transparent hover:underline ${className}`}
    {...props}
  >
    {children}
  </Button>
);

export default Button;