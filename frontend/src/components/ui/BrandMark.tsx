type BrandMarkProps = {
  className?: string;
  label?: string;
};

/** Static ESC identity. ThinkingOrb remains the product's live AI-state mark. */
export default function BrandMark({ className = '', label }: BrandMarkProps) {
  return (
    <img
      src="/brand/esc-logo-transparent.png"
      className={className}
      alt={label || ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  );
}
