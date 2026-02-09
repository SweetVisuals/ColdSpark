import React from 'react';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
    checked: boolean;
    onChange: (e?: React.MouseEvent) => void;
    label?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange, label }) => {
    return (
        <div
            className="flex items-center space-x-3 cursor-pointer group select-none"
            onClick={(e) => onChange(e)}
        >
            <div
                className={`
          relative w-6 h-6 rounded-lg transition-all duration-300 ease-out flex items-center justify-center
          ${checked
                        ? 'bg-primary scale-100 ring-0'
                        : 'bg-muted border border-border/50 hover:bg-muted/80'
                    }
        `}
            >
                <div className={`
          transform transition-all duration-200 
          ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}>
                    <Check size={14} className="text-primary-foreground stroke-[4]" />
                </div>
            </div>

            {label && (
                <span className={`
          font-medium transition-colors duration-200
          ${checked ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
        `}>
                    {label}
                </span>
            )}
        </div>
    );
};
