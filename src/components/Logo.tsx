import React from 'react';
import { Zap } from 'lucide-react';

const Logo = () => {
  return (
    <div className="flex items-center space-x-2">
      <Zap size={24} className="text-primary" />
      <span className="text-2xl font-bold text-foreground tracking-tight">ColdSpark</span>
    </div>
  );
};

export default Logo;
