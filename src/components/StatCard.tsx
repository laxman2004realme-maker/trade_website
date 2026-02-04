import React from 'react';
import '../styles/StatCard.css';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: 'default' | 'success' | 'danger' | 'primary';
    trend?: {
        direction: 'up' | 'down';
        value: number;
    };
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    color = 'default',
    trend
}) => {
    return (
        <div className={`stat-card stat-card-${color}`}>
            <div className="stat-header">
                <span className="stat-label">{label}</span>
                {icon && <span className="stat-icon">{icon}</span>}
            </div>
            <div className="stat-content">
                <div className="stat-value">{value}</div>
                {trend && (
                    <div className={`stat-trend stat-trend-${trend.direction}`}>
                        {trend.direction === 'up' ? '📈' : '📉'} {trend.value}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
