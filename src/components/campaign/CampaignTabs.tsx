interface TabProps {
  active: string;
  onChange: (tab: string) => void;
}

const CampaignTabs = ({ active, onChange }: TabProps) => {
  const tabs = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'leads', label: 'Leads' },
    { id: 'sequences', label: 'Sequences' },
    { id: 'emails', label: 'Emails' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'progress', label: 'Progress' },
    { id: 'options', label: 'Options' },
  ];

  return (
    <div className="border-b border-border mb-6">
      <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap
              ${active === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default CampaignTabs;
