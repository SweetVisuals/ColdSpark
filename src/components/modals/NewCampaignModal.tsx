import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Campaign } from '../../types';

interface Props {
  onClose: () => void;
}

const NewCampaignModal: React.FC<Props> = ({ onClose }) => {
  const { addCampaign } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    emailTemplate: '',
    maxEmailsPerDay: '100',
    frequency: 'daily',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name: formData.name,
      status: 'Draft',
      prospects: '0',
      replies: '0',
      openRate: '0%',
      emailTemplate: formData.emailTemplate,
      schedule: {
        frequency: formData.frequency as 'daily' | 'weekly',
        maxEmailsPerDay: parseInt(formData.maxEmailsPerDay),
      },
    };
    addCampaign(newCampaign);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">New Campaign</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Campaign Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="e.g. Q1 Outreach"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email Template</label>
            <textarea
              required
              value={formData.emailTemplate}
              onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
              rows={4}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              placeholder="Write your email template content here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Emails Per Day</label>
              <input
                type="number"
                required
                min="1"
                max="1000"
                value={formData.maxEmailsPerDay}
                onChange={(e) => setFormData({ ...formData, maxEmailsPerDay: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
              >
                <option value="daily" className="bg-card text-foreground">Daily</option>
                <option value="weekly" className="bg-card text-foreground">Weekly</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-border rounded-xl text-foreground hover:bg-muted font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-medium transition-all shadow-lg shadow-primary/20"
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCampaignModal;
