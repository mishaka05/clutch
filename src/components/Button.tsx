import React from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'none';
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  
  // Base structural classes
  const baseClasses = 'clutch-premium-btn select-none font-space font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020106] disabled:opacity-50 disabled:pointer-events-none active:scale-95';

  // Size classes
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-xs md:text-sm',
    lg: 'px-8 py-4 text-sm md:text-base',
    none: ''
  };

  const chosenSize = sizeClasses[size];

  // Primary Variant (Rotating animated border, premium filled depth)
  if (variant === 'primary') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} p-[1px] bg-transparent ${className}`}
        {...props}
      >
        <div className="clutch-premium-btn-dots" />
        <div className={`clutch-premium-btn-inner ${chosenSize} text-white`}>
          {children}
        </div>
      </button>
    );
  }

  // Danger Variant (Rotating animated warning border, filled danger depth)
  if (variant === 'danger') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} p-[1px] bg-transparent ${className} focus-visible:ring-[#FF6B6B]`}
        {...props}
      >
        <div className="clutch-premium-btn-dots clutch-premium-btn-dots-danger" />
        <div className={`clutch-premium-btn-inner clutch-premium-btn-inner-danger ${chosenSize} text-white`}>
          {children}
        </div>
      </button>
    );
  }

  // Secondary Variant (Glass surface, thin border, no rotating animation)
  if (variant === 'secondary') {
    return (
      <button
        disabled={disabled}
        className={`${baseClasses} ${chosenSize} bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  // Ghost Variant (Transparent background, hover only, used for navigation/utilities)
  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${chosenSize} bg-transparent hover:bg-white/5 text-slate-300 hover:text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
