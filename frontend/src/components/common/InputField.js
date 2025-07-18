import React from 'react';
import Card from './Card';

/**
 * Reusable Input Field Component with Card wrapper
 * Provides consistent styling for form inputs throughout the app
 * 
 * @param {Object} props - Component properties
 * @param {string} props.label - Input label text
 * @param {React.ReactElement} props.icon - Icon to display with the label
 * @param {React.ReactNode} props.children - Input element(s) to be wrapped
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.error - Error message to display
 * @param {string} props.hint - Hint text to display below the input
 * @param {string} props.className - Additional CSS classes for the card
 */
const InputField = ({ 
  label, 
  icon: Icon, 
  children, 
  required = false,
  error,
  hint,
  className = '',
  ...props 
}) => {
  return (
    <Card className={`p-4 mb-4 ${className}`} {...props}>
      {/* Label with icon */}
      <div className="flex items-center mb-3">
        {Icon && (
          <Icon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
        )}
        <label className="text-gray-800 font-medium flex-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {/* Input content */}
      <div className="space-y-2">
        {children}

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p className="text-gray-500 text-sm">{hint}</p>
        )}
      </div>
    </Card>
  );
};

/**
 * Text Input Component
 * Standard text input with consistent styling
 */
export const TextInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  ...props
}) => {
  const baseClasses = `
    w-full px-3 py-2 
    border rounded-lg 
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed bg-gray-100
  `;

  const borderClasses = error 
    ? 'border-red-300 focus:ring-red-500' 
    : 'border-gray-300 focus:ring-green-500';

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseClasses} ${borderClasses} ${className}`}
      {...props}
    />
  );
};

/**
 * Textarea Component
 * Multi-line text input with consistent styling
 */
export const TextArea = ({
  placeholder,
  value,
  onChange,
  rows = 4,
  disabled = false,
  error,
  className = '',
  ...props
}) => {
  const baseClasses = `
    w-full px-3 py-2 
    border rounded-lg 
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    resize-none bg-gray-100
  `;

  const borderClasses = error 
    ? 'border-red-300 focus:ring-red-500' 
    : 'border-gray-300 focus:ring-green-500';

  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      disabled={disabled}
      className={`${baseClasses} ${borderClasses} ${className}`}
      {...props}
    />
  );
};

/**
 * Select Component
 * Dropdown select with consistent styling
 */
export const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  error,
  className = '',
  ...props
}) => {
  const baseClasses = `
    w-full px-3 py-2 
    border rounded-lg 
    transition-colors duration-200 
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    appearance-none
    bg-white bg-gray-200
  `;

  const borderClasses = error 
    ? 'border-red-300 focus:ring-red-500' 
    : 'border-gray-300 focus:ring-green-500';

  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

/**
 * Checkbox Component
 * Custom styled checkbox with label
 */
export const Checkbox = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
          checked 
            ? 'bg-green-600 border-green-600' 
            : 'border-gray-300 hover:border-gray-400'
        }`}>
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-gray-700 select-none">{label}</span>
    </label>
  );
};

/**
 * Radio Button Component
 * Custom styled radio button with label
 */
export const RadioButton = ({
  label,
  value,
  checked = false,
  onChange,
  disabled = false,
  name,
  className = '',
  ...props
}) => {
  return (
    <label className={`flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="radio"
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          name={name}
          className="sr-only"
          {...props}
        />
        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${
          checked 
            ? 'bg-green-600 border-green-600' 
            : 'border-gray-300 hover:border-gray-400'
        }`}>
          {checked && (
            <div className="w-2 h-2 rounded-full bg-white"></div>
          )}
        </div>
      </div>
      <span className="text-gray-700 select-none">{label}</span>
    </label>
  );
};

/**
 * File Input Component
 * Custom styled file input
 */
export const FileInput = ({
  accept,
  multiple = false,
  onChange,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <label className={`inline-block cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      {children}
    </label>
  );
};

export default InputField;