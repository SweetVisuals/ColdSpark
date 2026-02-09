const CampaignSkeleton = () => {
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-6 bg-muted rounded w-16"></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="h-4 bg-muted rounded w-16 mb-2"></div>
          <div className="h-5 bg-muted rounded w-12"></div>
        </div>
        <div>
          <div className="h-4 bg-muted rounded w-16 mb-2"></div>
          <div className="h-5 bg-muted rounded w-12"></div>
        </div>
        <div>
          <div className="h-4 bg-muted rounded w-16 mb-2"></div>
          <div className="h-5 bg-muted rounded w-12"></div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-4 bg-muted rounded w-24"></div>
      </div>
    </div>
  );
};

export default CampaignSkeleton;
