import { getScoreColor, getGrade } from '@/lib/utils/score';

interface ScoreBadgeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, label, size = 'md' }: ScoreBadgeProps) {
  const { bg, text } = getScoreColor(score);
  const grade = getGrade(score);

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg ${bg} ${sizes[size]}`}>
      <span className={`font-bold ${text}`}>{score}</span>
      <span className={`font-medium ${text} opacity-70`}>{grade}</span>
      <span className="text-neutral-500 text-xs">{label}</span>
    </div>
  );
}
