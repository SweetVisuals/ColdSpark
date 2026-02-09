import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

const BackButton = ({ onClick }: BackButtonProps) => (
  <button
    onClick={onClick}
    className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6 group"
  >
    <ArrowLeft size={20} className="mr-2 transition-transform group-hover:-translate-x-1" />
    Back to Dashboard
  </button>
);

export default BackButton;
