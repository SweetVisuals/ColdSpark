import React from 'react';
import { AlertCircle } from 'lucide-react';

export const NoTemplatesMessage: React.FC = () => {
  return (
    <div className="text-center py-6">
      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No Email Templates Found</h3>
      <p className="mt-1 text-sm text-gray-500">
        Create an email template in the Sequences tab before scheduling emails.
      </p>
    </div>
  );
};
