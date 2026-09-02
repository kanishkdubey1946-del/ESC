import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  noHover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', noHover = false, ...props }) => {
  return (
    <motion.div
      className={`bg-white rounded-xl border border-border shadow-soft p-4 md:p-6 transition-all duration-300 ${className}`}
      whileHover={noHover ? {} : { y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
