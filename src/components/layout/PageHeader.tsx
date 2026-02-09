import React from 'react';
import { Title } from '../ui/title';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode; // For actions like buttons
    className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    children,
    className
}) => {
    return (
        <div className={cn("flex justify-between items-center mb-8", className)}>
            <div>
                <Title className="text-3xl font-bold tracking-tight text-foreground mb-2">{title}</Title>
                {description && (
                    <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
