import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          w-full px-4 rounded-xl text-left transition-all duration-300 flex items-center justify-between h-full border border-input
          bg-background shadow-sm
          ${isOpen
                        ? 'ring-2 ring-primary/20 shadow-lg'
                        : 'hover:bg-muted/50'
                    }
        `}
            >
                <span className={!selectedOption ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            <div
                className={`
          absolute z-50 w-full mt-2 rounded-xl bg-popover/95 backdrop-blur-2xl shadow-2xl border border-border
          transform transition-all duration-200 origin-top overflow-hidden
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
        `}
            >
                <div className="p-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`
                w-full px-3 py-3 rounded-lg text-left text-sm transition-all duration-200 flex items-center justify-between group margin-b-1
                ${value === option.value
                                    ? 'bg-primary/10 text-primary font-medium shadow-none'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }
              `}
                        >
                            <span>{option.label}</span>
                            {value === option.value && (
                                <Check className="w-4 h-4 text-primary" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
