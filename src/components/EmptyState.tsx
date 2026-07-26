import './EmptyState.css';

interface EmptyStateProps {
  eyebrow: string;
  title: string;
  body: string;
}

export default function EmptyState({ eyebrow, title, body }: EmptyStateProps) {
  return (
    <div className="mj-empty mj-tile">
      <span className="mj-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
