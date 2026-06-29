/**
 * @param {{children: import('react').ReactNode, className?: string}} props
 */
export default function Card({ children, className = '' }) {
  return <div className={`rounded-xl bg-white shadow-card ${className}`}>{children}</div>;
}
