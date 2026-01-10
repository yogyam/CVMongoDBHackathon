interface ScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
    const displayScore = Math.round(score * 10);

    const getScoreClass = () => {
        if (score >= 0.8) return 'score-high';
        if (score >= 0.5) return 'score-medium';
        return 'score-low';
    };

    const sizeClasses = {
        sm: 'w-10 h-10 text-sm',
        md: 'w-14 h-14 text-lg',
        lg: 'w-20 h-20 text-2xl',
    };

    return (
        <div className={`score-ring ${getScoreClass()} ${sizeClasses[size]}`}>
            {displayScore}/10
        </div>
    );
}
