/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Custom green palette for rice/agriculture theme
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#059669', // Primary green
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        },
        // Additional color palette
        rice: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006'
        },
        // Status colors
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        info: '#2563eb'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace']
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem'
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem'
      },
      minHeight: {
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'colored': '0 4px 14px 0 rgba(16, 185, 129, 0.15)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-gentle': 'pulseGentle 2s infinite',
        'shimmer': 'shimmer 2s infinite',
        'toast-enter': 'toastEnter 0.3s ease-out',
        'toast-exit': 'toastExit 0.3s ease-in'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' }
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        toastEnter: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        toastExit: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      screens: {
        'xs': '475px',
        '3xl': '1680px',
        '4xl': '2560px'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    }
  },
  plugins: [
    // Form plugin for better form styling
    require('@tailwindcss/forms')({
      strategy: 'class'
    }),
    
    // Typography plugin for rich text content
    require('@tailwindcss/typography'),
    
    // Aspect ratio plugin for responsive media
    require('@tailwindcss/aspect-ratio'),
    
    // Container queries plugin
    require('@tailwindcss/container-queries'),
    
    // Custom plugin for additional utilities
    function({ addUtilities, addComponents, theme }) {
      // Custom utilities
      addUtilities({
        '.glass': {
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          'background': 'rgba(255, 255, 255, 0.8)',
          'border': '1px solid rgba(255, 255, 255, 0.2)'
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          'background': 'rgba(0, 0, 0, 0.2)',
          'border': '1px solid rgba(255, 255, 255, 0.1)'
        },
        '.gradient-text': {
          'background': 'linear-gradient(135deg, #059669, #10b981)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text'
        },
        '.hide-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.custom-scrollbar': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#d1d5db #f9fafb',
          '&::-webkit-scrollbar': {
            width: '6px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#f9fafb',
            'border-radius': '9999px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#d1d5db',
            'border-radius': '9999px',
            '&:hover': {
              background: '#9ca3af'
            }
          }
        }
      });

      // Custom components
      addComponents({
        '.btn': {
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.medium'),
          fontSize: theme('fontSize.sm'),
          lineHeight: theme('lineHeight.5'),
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme('spacing.2'),
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${theme('colors.green.500')}`
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed'
          }
        },
        '.btn-primary': {
          backgroundColor: theme('colors.green.600'),
          color: theme('colors.white'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.green.700')
          }
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.700'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.gray.200')
          }
        },
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.sm'),
          border: `1px solid ${theme('colors.gray.100')}`,
          transition: 'all 0.2s ease-in-out'
        },
        '.input-field': {
          width: '100%',
          padding: `${theme('spacing.3')} ${theme('spacing.3')}`,
          border: `1px solid ${theme('colors.gray.300')}`,
          borderRadius: theme('borderRadius.lg'),
          fontSize: theme('fontSize.sm'),
          lineHeight: theme('lineHeight.5'),
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.green.500'),
            boxShadow: `0 0 0 1px ${theme('colors.green.500')}`
          },
          '&:disabled': {
            backgroundColor: theme('colors.gray.50'),
            color: theme('colors.gray.500'),
            cursor: 'not-allowed'
          }
        }
      });
    }
  ],
  // Enable dark mode (class-based)
  darkMode: 'class',
  
  // Purge unused styles in production
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './src/**/*.{js,jsx,ts,tsx}',
      './public/index.html'
    ]
  }
};