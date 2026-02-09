import React from 'react';

export const EmailAccountsHeader: React.FC = () => {
  return (
    <thead className="bg-gray-50 dark:bg-muted/50">
      <tr>
        <th className="w-10 px-6 py-3"></th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase">Email</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase">Emails Sent</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase">Warmup Emails</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase">Health Score</th>
        <th className="w-10 px-6 py-3"></th>
      </tr>
    </thead>
  );
};
