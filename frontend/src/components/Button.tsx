import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyles = "px-6 py-3 rounded-full font-medium text-[15px] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center";
  
  const variants = {
    primary: "bg-primary text-white shadow-medium hover:brightness-105 focus:ring-primary",
    secondary: "bg-white border-2 border-accent text-accent hover:bg-slate-50 focus:ring-accent",
    ghost: "bg-transparent text-text-primary hover:bg-slate-100 focus:ring-slate-200"
  };

  return (
    <motion.button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};
