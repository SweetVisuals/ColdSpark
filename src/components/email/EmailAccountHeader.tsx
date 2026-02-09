import React from 'react';
import { Title } from '../ui/title';
import { Plus, Search } from 'lucide-react';

interface EmailAccountHeaderProps {
  onAddEmail: () => void;
}

const EmailAccountHeader = ({ onAddEmail }: EmailAccountHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <Title>Email Accounts</Title>
      <div className="flex space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search accounts..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={onAddEmail}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Add Account</span>
        </button>
      </div>
    </div>
  );
};

export default EmailAccountHeader;
