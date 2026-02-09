import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

const CampaignsTab = ({ account }) => {
  const { campaigns } = useApp();
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const accountCampaigns = campaigns.filter(campaign => campaign.emailId === account.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Assignment</h3>
        <button
          onClick={() => setShowAddCampaign(true)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <Plus size={20} />
          <span>Add to Campaign</span>
        </button>
      </div>

      {showAddCampaign ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Campaign</label>
            <select className="w-full rounded-lg border-none bg-white/5 text-foreground py-2.5 px-4 shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all">
              {campaigns
                .filter(campaign => !campaign.emailId)
                .map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowAddCampaign(false)}
              className="px-4 py-2 bg-white/5 rounded-lg text-muted-foreground hover:bg-white/10 transition-all font-medium"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Add to Campaign
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {accountCampaigns.length === 0 ? (
            <p className="text-gray-500 dark:text-muted-foreground">This email is not assigned to any campaigns.</p>
          ) : (
            <div className="space-y-3">
              {accountCampaigns.map(campaign => (
                <div key={campaign.id} className="p-4 bg-white/5 rounded-xl hover:bg-white/[0.08] transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-foreground">{campaign.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaign.prospects} prospects • {campaign.openRate} open rate
                      </p>
                    </div>
                    <button className="text-destructive hover:text-destructive/80 text-sm font-medium transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignsTab;
