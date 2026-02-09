import React from 'react';
import { Mail } from 'lucide-react';

const EmptyState = () => {
  return (
    <div className="col-span-full flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
      <div className="bg-primary/10 p-5 rounded-full mb-6 ring-1 ring-primary/20 shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]">
        <Mail size={32} className="text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">No campaigns yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Create your first campaign to start reaching out to prospects. Your active campaigns will appear here.
      </p>
    </div>
  );
};

export default EmptyState;
