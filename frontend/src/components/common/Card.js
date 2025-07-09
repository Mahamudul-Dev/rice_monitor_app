import React from 'react';

/**
 * Reusable Card Component
 * Provides consistent styling for card-based layouts
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Content to be displayed inside the card
 * @param {string} props.className - Additional CSS classes to apply
 * @param {function} props.onClick - Click handler for the card
 * @param {Object} props.style - Inline styles to apply
 * @param {boolean} props.hover - Whether to show hover effects
 * @param {string} props.variant - Card variant ('default', 'outlined', 'elevated')
 */
const Card = ({ 
  children, 
  className = '', 
  onClick, 
  style = {}, 
  hover = false,
  variant = 'default',
  ...props 
}) => {
  // Define variant styles
  const variantStyles = {
    default: 'bg-white rounded-xl shadow-sm border border-gray-100',
    outlined: 'bg-white rounded-xl border-2 border-gray-200',
    elevated: 'bg-white rounded-xl shadow-lg border border-gray-100'
  };

  // Base classes
  const baseClasses = 'transition-all duration-200';
  
  // Hover effects
  const hoverClasses = hover || onClick ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : '';
  
  // Combine all classes
  const cardClasses = `
    ${baseClasses}
    ${variantStyles[variant] || variantStyles.default}
    ${hoverClasses}
    ${className}
  `.trim();

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      style={style}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Card Header Component
 * For consistent header styling within cards
 */
export const CardHeader = ({ children, className = '', ...props }) => (
  <div 
    className={`px-6 py-4 border-b border-gray-100 ${className}`}
    {...props}
  >
    {children}
  </div>
);

/**
 * Card Body Component
 * For consistent body content styling within cards
 */
export const CardBody = ({ children, className = '', ...props }) => (
  <div 
    className={`px-6 py-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

/**
 * Card Footer Component
 * For consistent footer styling within cards
 */
export const CardFooter = ({ children, className = '', ...props }) => (
  <div 
    className={`px-6 py-4 border-t border-gray-100 ${className}`}
    {...props}
  >
    {children}
  </div>
);

/**
 * Card Title Component
 * For consistent title styling within cards
 */
export const CardTitle = ({ children, className = '', level = 'h3', ...props }) => {
  const Component = level;
  const sizeClasses = {
    h1: 'text-2xl',
    h2: 'text-xl',
    h3: 'text-lg',
    h4: 'text-base',
    h5: 'text-sm',
    h6: 'text-xs'
  };

  return (
    <Component 
      className={`font-semibold text-gray-800 ${sizeClasses[level]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * Card Description Component
 * For consistent description styling within cards
 */
export const CardDescription = ({ children, className = '', ...props }) => (
  <p 
    className={`text-gray-600 text-sm leading-relaxed ${className}`}
    {...props}
  >
    {children}
  </p>
);

export default Card;