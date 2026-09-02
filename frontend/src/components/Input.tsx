import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1 w-full">
        {label && (
          <label className="text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`px-4 py-3 bg-background border border-border rounded-xl text-text-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-accent transition-shadow w-full ${
            error ? 'border-error focus:ring-error' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-sm text-error mt-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
