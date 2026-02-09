import React from 'react';

interface Props {
  onSelectAll: () => void;
  allSelected: boolean;
  totalLeads: number;
  hidePersonalColumns?: boolean;
  showActions?: boolean;
}

import { CustomCheckbox } from '../ui/CustomCheckbox';

export const TableHeader: React.FC<Props> = ({ onSelectAll, allSelected, totalLeads, hidePersonalColumns, showActions }) => (
  <thead className="bg-transparent border-b border-border">
    <tr>
      <th className="px-6 py-4 text-left w-[60px]">
        <div className="flex items-center gap-2">
          <CustomCheckbox
            checked={allSelected}
            onChange={onSelectAll}
          />
        </div>
      </th>
      <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Email</th>
      {!hidePersonalColumns && (
        <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Name</th>
      )}
      <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Company</th>
      <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Notes</th>
      {!hidePersonalColumns && (
        <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Role</th>
      )}
      <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Location</th>
      <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Website</th>
      <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Socials</th>
      {showActions && (
        <th className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Actions</th>
      )}
    </tr>
  </thead>
);
