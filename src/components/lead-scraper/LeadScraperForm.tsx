import React, { useState } from 'react';
import { jobRoles } from '../../data/jobRoles';

interface LeadScraperFormProps {
  onSearch: (formData: any) => void;
}

import { CustomCheckbox } from '../ui/CustomCheckbox';
import { CustomSelect } from '../ui/CustomSelect';

interface LeadScraperFormProps {
  onSearch: (formData: any) => void;
}

const LeadScraperForm: React.FC<LeadScraperFormProps> = ({ onSearch }) => {
  const [formData, setFormData] = useState({
    platforms: {
      linkedin: false,
      google: false,
      general: false,
      all: false,
    },
    business: '',
    jobRole: '',
    location: '',
    news: '',
    notesContext: '',
  });

  const handlePlatformChange = (platform: keyof typeof formData.platforms) => {
    if (platform === 'all') {
      const allSelected = !formData.platforms.all;
      setFormData({
        ...formData,
        platforms: {
          linkedin: allSelected,
          google: allSelected,
          general: allSelected,
          all: allSelected,
        },
      });
    } else {
      setFormData(prev => {
        const newPlatforms = {
          ...prev.platforms,
          [platform]: !prev.platforms[platform],
          all: false,
        };
        return { ...prev, platforms: newPlatforms };
      });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(formData);
      }}
      className="glass-card rounded-2xl p-6 mb-6"
    >
      <div className="mb-6">
        <label className="block text-xs font-bold text-foreground mb-4 uppercase tracking-wider opacity-90 pl-1">Search Platforms</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(formData.platforms).map(([platform, checked]) => (
            <div
              key={platform}
              className={`
                group relative flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer border
                ${checked
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-muted/30 border-border hover:border-primary/20 hover:bg-muted/50'
                }
              `}
              onClick={() => handlePlatformChange(platform as keyof typeof formData.platforms)}
            >
              <div className="flex items-center space-x-3 w-full">
                <CustomCheckbox
                  checked={checked}
                  onChange={() => handlePlatformChange(platform as keyof typeof formData.platforms)}
                />
                <span className={`font-semibold capitalize text-xs transition-colors ${checked ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {platform === 'general' ? 'Business Search' : platform === 'google' ? 'Google Maps' : platform}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Business Type</label>
          <input
            type="text"
            value={formData.business}
            onChange={(e) => setFormData({ ...formData, business: e.target.value })}
            className="glass-input w-full h-10 px-4 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/50"
            placeholder="e.g., SaaS, E-commerce"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Job Role</label>
          <CustomSelect
            value={formData.jobRole}
            onChange={(value) => setFormData({ ...formData, jobRole: value })}
            options={jobRoles.map(role => ({ value: role, label: role }))}
            placeholder="Select Role..."
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="glass-input w-full h-10 px-4 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/50"
            placeholder="e.g., New York"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Recent News</label>
          <input
            type="text"
            value={formData.news}
            onChange={(e) => setFormData({ ...formData, news: e.target.value })}
            className="glass-input w-full h-10 px-4 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/50"
            placeholder="e.g., Funding"
          />
        </div>
        <div className="space-y-2 md:col-span-2 lg:col-span-4">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Notes Focus (Optional)</label>
          <input
            type="text"
            value={formData.notesContext}
            onChange={(e) => setFormData({ ...formData, notesContext: e.target.value })}
            className="glass-input w-full h-10 px-4 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/50"
            placeholder="e.g., Find 3 things that could be improved about their website..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg hover:bg-primary/90 font-bold shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          Start Extraction
        </button>
      </div>
    </form>
  );
};

export default LeadScraperForm;
