import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface GlowMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onSelect?: () => void;
  active?: boolean;
}

export interface GlowMenuBarProps {
  items: GlowMenuItem[];
  ariaLabel?: string;
  className?: string;
}

/**
 * A compact navigation surface with a restrained hover/focus glow.
 * It accepts real links or button actions and does not own application state.
 */
export function GlowMenuBar({ items, ariaLabel = 'Section navigation', className = '' }: GlowMenuBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <nav className={`glow-menu ${className}`} aria-label={ariaLabel}>
      <ul>
        {items.map((item) => {
          const content = <>{item.icon && <span className="glow-menu-icon" aria-hidden="true">{item.icon}</span>}<span>{item.label}</span></>;
          const shared = {
            className: `glow-menu-link${item.active ? ' is-active' : ''}`,
            whileHover: reduceMotion ? undefined : { y: -1 },
            transition: { duration: 0.16 },
          };

          return (
            <li key={item.key}>
              {item.onSelect ? (
                <motion.button type="button" onClick={item.onSelect} {...shared}>{content}</motion.button>
              ) : (
                <motion.a href={item.href || '#'} aria-current={item.active ? 'page' : undefined} {...shared}>{content}</motion.a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default GlowMenuBar;
