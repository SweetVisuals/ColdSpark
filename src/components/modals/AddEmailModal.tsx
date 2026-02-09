import React, { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { verifyImap, verifySmtp } from '../../lib/api/email-verification';
import { supabase } from '../../lib/supabase';
import { EmailAccount } from '../../types';
import { toast } from '../../components/ui/use-toast';

interface Props {
  onClose: () => void;
}

const AddEmailModal: React.FC<Props> = ({ onClose }) => {
  const { addEmailAccount } = useApp();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company: '',
    phone_number: '',
    imap_host: '',
    imap_port: '993',
    smtp_host: '',
    smtp_port: '587',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  const verifyEmailConnection = async () => {
    try {
      setConnectionStatus('verifying');

      // Verify IMAP connection
      const imapResult = await verifyImap({
        host: formData.imap_host,
        port: Number(formData.imap_port),
        username: formData.email,
        password: formData.password
      });

      if (!imapResult.success) throw new Error(imapResult.message || 'IMAP connection failed');

      // Verify SMTP connection
      const smtpResult = await verifySmtp({
        host: formData.smtp_host,
        port: Number(formData.smtp_port),
        username: formData.email,
        password: formData.password
      });

      if (!smtpResult.success) throw new Error(smtpResult.message || 'SMTP connection failed');

      setConnectionStatus('success');
      return true;
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to verify email connection',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isVerified = await verifyEmailConnection();
      if (!isVerified) return;

      if (!user) {
        throw new Error('User not authenticated');
      }

      const newAccount: EmailAccount = {
        id: crypto.randomUUID(),
        email: formData.email,
        name: formData.name,
        imap_host: formData.imap_host,
        imap_port: formData.imap_port,
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        user_id: user.id,
        created_at: new Date().toISOString(),
        warmup_enabled: false,
        warmup_filter_tag: null,
        warmup_increase_per_day: 0,
        warmup_daily_limit: 0,
        warmup_status: 'disabled',
        warmup_start_date: null,
        smtp_password: formData.password,
        password: '', // Required by type, but we use encrypted_password
        company: formData.company,
        phone_number: formData.phone_number
      };

      try {
        const { data: encryptedData, error: encryptError } = await supabase
          .rpc('encrypt_password', { password: formData.password });

        if (!encryptError && encryptedData) {
          newAccount.encrypted_password = encryptedData;
        } else {
          console.error('Encryption failed:', encryptError);
          // Fallback or error? For now, proceed but maybe warn? 
          // Actually if encryption fails, we can't save the password securely.
          throw new Error('Failed to encrypt password');
        }
      } catch (err) {
        console.error('Encryption error:', err);
        throw new Error('Failed to encrypt password');
      }

      await addEmailAccount(newAccount);
      onClose();
      toast({
        title: 'Success',
        description: 'Email account added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add email account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[600px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Email Account</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="MyCorp"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="+1 555-0123"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">IMAP Host</label>
              <input
                type="text"
                required
                value={formData.imap_host}
                onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IMAP Port</label>
              <input
                type="number"
                required
                value={formData.imap_port}
                onChange={(e) => setFormData({ ...formData, imap_port: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
              <input
                type="text"
                required
                value={formData.smtp_host}
                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
              <input
                type="number"
                required
                value={formData.smtp_port}
                onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'verifying' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {connectionStatus === 'success' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {connectionStatus === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {connectionStatus === 'verifying' && 'Verifying connection...'}
                {connectionStatus === 'success' && 'Connection verified'}
                {connectionStatus === 'error' && 'Connection failed'}
              </span>
            </div>
            <div className="space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || connectionStatus === 'verifying'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Account'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmailModal;
