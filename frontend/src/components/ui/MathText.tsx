import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

/** Render agent-provided inline LaTeX inside a normal text flow. */
export default function MathText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`esc-math-text ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {text}
      </ReactMarkdown>
    </span>
  );
}
