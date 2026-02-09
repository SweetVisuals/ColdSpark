import { useState, useEffect, useMemo } from 'react';
import { Search, Mail, RefreshCw, Trash2, Archive, Inbox as InboxIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmailMessage, EmailAccount } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { fetchEmailAccounts } from '../lib/api/email-accounts';
import { useToast } from '../components/ui/use-toast';
import { CustomCheckbox } from '../components/ui/CustomCheckbox';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';

const Inbox = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<Array<{ email: string; error: string }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null); // null means "All Inboxes"
  const [viewMode, setViewMode] = useState<'inbox' | 'archive'>('inbox');
  const { toast } = useToast();

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load accounts first
        const accountsData = await fetchEmailAccounts();
        setAccounts(accountsData);
        await fetchEmails();
      } catch (err) {
        console.error('Failed to load inbox data:', err);
        setError('Failed to load inbox. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchEmails = async (refresh = false) => {
    try {
      setError(null);
      setSyncErrors([]);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = new URL('/api/emails', window.location.origin);
      if (refresh) {
        url.searchParams.append('refresh', 'true');
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const result = await response.json();
      if (result.success) {
        setEmails(result.data);
        if (result.errors && result.errors.length > 0) {
          setSyncErrors(result.errors);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to load emails. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmails(true);
  };

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      // Account Filter
      if (selectedAccount && email.accountId !== selectedAccount) {
        return false;
      }

      // View Mode Filter
      if (viewMode === 'inbox') {
        if (email.folder === 'archive') return false;
      } else if (viewMode === 'archive') {
        if (email.folder !== 'archive') return false;
      }

      // Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          email.subject.toLowerCase().includes(term) ||
          email.from.toLowerCase().includes(term) ||
          email.to.toLowerCase().includes(term) ||
          email.snippet.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [emails, selectedAccount, searchTerm, viewMode]);

  // Handle Actions
  const handleAction = async (action: 'delete' | 'archive', targetEmails: EmailMessage | EmailMessage[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const emailList = Array.isArray(targetEmails) ? targetEmails : [targetEmails];
      if (emailList.length === 0) return;

      toast({
        title: `${action === 'delete' ? 'Deleting' : 'Archiving'} ${emailList.length} email${emailList.length > 1 ? 's' : ''}...`,
        description: "Please wait..."
      });

      const emailIdsToRemove = new Set(emailList.map(e => e.id));

      // Optimistic Update
      setEmails(prev => prev.map(e => {
        if (emailIdsToRemove.has(e.id)) {
          if (action === 'archive') return { ...e, folder: 'archive' as const };
        }
        return e;
      }).filter(e => {
        if (emailIdsToRemove.has(e.id) && action === 'delete') return false;
        return true;
      }));

      // Clear selection if needed
      setSelectedEmailIds(prev => {
        const next = new Set(prev);
        emailIdsToRemove.forEach(id => next.delete(id));
        return next;
      });

      if (selectedEmail && emailIdsToRemove.has(selectedEmail.id)) {
        setSelectedEmail(null);
      }

      // Group by account for backend
      const groupedByAccount = emailList.reduce((acc, email) => {
        if (!acc[email.accountId]) {
          acc[email.accountId] = {
            uids: [],
            folder: email.folder
          };
        }
        acc[email.accountId].uids.push(email.uid);
        return acc;
      }, {} as Record<string, { uids: number[], folder: string }>);

      // Perform actions per account
      const results = await Promise.all(
        Object.entries(groupedByAccount).map(([accountId, data]) =>
          fetch('/api/emails/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              emailAccountId: accountId,
              uids: data.uids,
              action,
              folder: data.folder
            })
          })
        )
      );

      const allOk = results.every(res => res.ok);

      if (!allOk) {
        throw new Error('Failed to perform action on some emails');
      }

      toast({
        title: "Success",
        description: `${emailList.length} email${emailList.length > 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : 'archived'}.`
      });

    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      toast({
        title: "Error",
        description: `Failed to ${action} emails.`,
        variant: "destructive"
      });
      fetchEmails();
    }
  };

  const handleEmailClick = (email: EmailMessage, event: React.MouseEvent) => {
    // Standard Shift+Click Range Selection
    if (event.shiftKey && lastSelectedId) {
      const currentIndex = filteredEmails.findIndex(e => e.id === email.id);
      const lastIndex = filteredEmails.findIndex(e => e.id === lastSelectedId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeEmails = filteredEmails.slice(start, end + 1);
        const rangeIds = rangeEmails.map(e => e.id);

        if (event.ctrlKey || event.metaKey) {
          // If Ctrl is held, ADD the range to existing selection
          setSelectedEmailIds(prev => {
            const next = new Set(prev);
            rangeIds.forEach(id => next.add(id));
            return next;
          });
        } else {
          // If only Shift, REPLACE selection with range
          setSelectedEmailIds(new Set(rangeIds));
        }
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click Toggle
      setSelectedEmailIds(prev => {
        const next = new Set(prev);
        if (next.has(email.id)) next.delete(email.id);
        else next.add(email.id);
        return next;
      });
      setLastSelectedId(email.id);
      setSelectedEmail(email);
    } else {
      // Single Click
      setSelectedEmailIds(new Set([email.id]));
      setSelectedEmail(email);
      setLastSelectedId(email.id);
    }
  };

  const handleCheckboxChange = (email: EmailMessage, event?: React.MouseEvent) => {
    if (!event) return;
    event.stopPropagation();

    if (event.shiftKey && lastSelectedId) {
      const currentIndex = filteredEmails.findIndex(e => e.id === email.id);
      const lastIndex = filteredEmails.findIndex(e => e.id === lastSelectedId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeEmails = filteredEmails.slice(start, end + 1);
        const rangeIds = rangeEmails.map(e => e.id);

        if (event.ctrlKey || event.metaKey) {
          // If Ctrl is held, ADD the range to existing selection
          setSelectedEmailIds(prev => {
            const next = new Set(prev);
            rangeIds.forEach(id => next.add(id));
            return next;
          });
        } else {
          // If only Shift, REPLACE selection with range
          setSelectedEmailIds(new Set(rangeIds));
        }
      }
    } else {
      setSelectedEmailIds(prev => {
        const next = new Set(prev);
        if (next.has(email.id)) next.delete(email.id);
        else next.add(email.id);
        return next;
      });
      setLastSelectedId(email.id);
      // We generally don't change the preview on checkbox click unless we want to?
      // Stick to current behavior: don't change selectedEmail
    }
  };

  return (
    <Layout fullHeight>
      <PageHeader
        title="Inbox"
        description="Manage your email communications"
        className="px-8 py-6 mb-0 shrink-0 border-b border-gray-200 dark:border-white/10"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={cn("p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors", refreshing && "animate-spin")}
            title="Refresh Emails"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">

        {/* Column 1: Accounts Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#050508] flex flex-col shrink-0 transition-colors duration-300">
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase mb-4 tracking-widest pl-2 shrink-0">Mailboxes</h3>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={() => { setSelectedAccount(null); setViewMode('inbox'); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  selectedAccount === null && viewMode === 'inbox'
                    ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                    : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                )}
              >
                <InboxIcon size={16} className={cn("transition-colors", selectedAccount === null && viewMode === 'inbox' ? "text-primary" : "text-gray-400 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground")} />
                All Inboxes
                <span className={cn("ml-auto text-xs opacity-60", selectedAccount === null && viewMode === 'inbox' ? "text-primary" : "text-gray-400 dark:text-muted-foreground")}>
                  {emails.filter(e => e.folder !== 'archive').length}
                </span>
              </button>

              <button
                onClick={() => { setSelectedAccount(null); setViewMode('archive'); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  viewMode === 'archive'
                    ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                    : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                )}
              >
                <Archive size={16} className={cn("transition-colors", viewMode === 'archive' ? "text-primary" : "text-gray-400 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground")} />
                Archived
                <span className={cn("ml-auto text-xs opacity-60", viewMode === 'archive' ? "text-primary" : "text-gray-400 dark:text-muted-foreground")}>
                  {emails.filter(e => e.folder === 'archive').length}
                </span>
              </button>
            </div>

            <h3 className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase mt-8 mb-4 tracking-widest pl-2 shrink-0">Accounts</h3>
            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 min-h-0 -mx-2 px-2">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => { setSelectedAccount(account.id); setViewMode('inbox'); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group shrink-0",
                    selectedAccount === account.id
                      ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                      : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-all",
                    selectedAccount === account.id
                      ? "bg-primary text-white"
                      : "bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-muted-foreground group-hover:bg-gray-300 dark:group-hover:bg-white/10 group-hover:text-gray-900 dark:group-hover:text-foreground"
                  )}>
                    {account.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Email List */}
        <div className="w-80 md:w-96 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f12]/50 flex flex-col shrink-0 transition-colors duration-300">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground/50" size={14} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground/40 focus:bg-white dark:focus:bg-black/40 focus:border-primary/50 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* General Error Alert */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 p-3 border-b border-red-100 dark:border-red-500/20">
              <p className="text-xs text-red-700 dark:text-red-500 font-medium flex items-center gap-2">
                <span className="text-base">❌</span> {error}
              </p>
            </div>
          )}

          {/* Sync Errors Alert */}
          {syncErrors.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 p-3 border-b border-yellow-100 dark:border-yellow-500/20">
              <p className="text-xs text-yellow-700 dark:text-yellow-500 font-medium flex items-center gap-2">
                <span className="text-base">⚠️</span> {syncErrors.length} accounts failed to sync
              </p>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-transparent">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 dark:text-muted-foreground">
                <RefreshCw className="animate-spin text-primary" size={24} />
                <span className="text-sm font-medium">Loading emails...</span>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-10 text-center text-gray-400 dark:text-muted-foreground/60 text-sm">
                No emails found
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredEmails.map(email => (
                  <div
                    key={email.id}
                    onClick={(e) => handleEmailClick(email, e)}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-l-2 relative group",
                      selectedEmailIds.has(email.id)
                        ? "bg-blue-50/50 dark:bg-white/5 border-primary"
                        : "border-transparent"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-3">
                      <div className="pt-0.5">
                        <CustomCheckbox
                          checked={selectedEmailIds.has(email.id)}
                          onChange={(e) => handleCheckboxChange(email, e)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={cn("font-medium text-sm truncate pr-2 transition-colors",
                            !email.isRead ? "text-gray-900 dark:text-white font-bold" : "text-gray-600 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground"
                          )}>
                            {email.from.replace(/<.*>/, '').trim() || email.from}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-muted-foreground/50 shrink-0">
                            {format(new Date(email.date), 'MMM d')}
                          </span>
                        </div>
                        <div className={cn("text-xs mb-1.5 truncate transition-colors",
                          !email.isRead ? "font-semibold text-gray-900 dark:text-foreground" : "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-foreground/80")}>
                          {email.subject}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-muted-foreground/40 line-clamp-2 leading-relaxed">
                          {email.snippet}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Reading Pane */}
        <div className="flex-1 bg-white dark:bg-[#0f0f12] flex flex-col min-w-0 transition-colors duration-300 h-full">
          {selectedEmail ? (
            <>
              {/* Toolbar */}
              <div className="h-16 border-b border-gray-200 dark:border-white/10 flex items-center px-8 justify-between shrink-0 bg-white/50 dark:bg-[#0f0f12]/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedEmailIds.size > 1) {
                        const targetEmails = emails.filter(e => selectedEmailIds.has(e.id));
                        handleAction('archive', targetEmails);
                      } else {
                        handleAction('archive', selectedEmail);
                      }
                    }}
                    className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors flex items-center gap-2"
                    title="Archive"
                  >
                    <Archive size={18} />
                    {selectedEmailIds.size > 1 && <span className="text-xs font-medium">Archive {selectedEmailIds.size}</span>}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedEmailIds.size > 1) {
                        const targetEmails = emails.filter(e => selectedEmailIds.has(e.id));
                        handleAction('delete', targetEmails);
                      } else {
                        handleAction('delete', selectedEmail);
                      }
                    }}
                    className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-gray-500 dark:text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                    {selectedEmailIds.size > 1 && <span className="text-xs font-medium">Delete {selectedEmailIds.size}</span>}
                  </button>
                </div>
                <div className="text-xs font-medium text-gray-400 dark:text-muted-foreground/50">
                  {selectedEmailIds.size > 1 ? `${selectedEmailIds.size} emails selected` : format(new Date(selectedEmail.date), 'PPpp')}
                </div>
              </div>

              {/* Email Headers */}
              <div className="p-8 pb-6 border-b border-gray-200 dark:border-white/10">
                <h1 className="text-xl font-bold mb-6 text-gray-900 dark:text-foreground leading-tight">{selectedEmail.subject}</h1>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 text-lg">
                    {(selectedEmail.from.replace(/<.*>/, '').trim() || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-sm text-gray-900 dark:text-foreground truncate">
                        {selectedEmail.from}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-muted-foreground truncate mt-1">
                      to {selectedEmail.to}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-y-auto px-8 pt-8 bg-white dark:bg-[#0f0f12] scrollbar-thin flex flex-col min-h-0">
                <div className="prose prose-sm max-w-none dark:prose-invert flex-1 flex flex-col">
                  {/* Secure iframe for HTML content */}
                  <iframe
                    title="email-content"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <style>
                            body { 
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                              color: inherit;
                              background-color: transparent;
                              font-size: 14px;
                              line-height: 1.6;
                              margin: 0;
                              padding: 0;
                              min-height: 100vh;
                            }
                            img { max-width: 100%; height: auto; }
                            @media (prefers-color-scheme: dark) {
                              body { color: #e4e4e7; }
                              /* Force text color on common elements to override inline styles if needed */
                              p, span, div, td, th, li, h1, h2, h3, h4, h5, h6 { color: #e4e4e7 !important; }
                              a { color: #8b5cf6 !important; }
                              blockquote { border-left-color: #3f3f46 !important; color: #a1a1aa !important; }
                            }
                            @media (prefers-color-scheme: light) {
                              body { color: #111827; }
                              a { color: #2563eb; }
                              ::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); }
                            }
                            /* Custom Scrollbar */
                            ::-webkit-scrollbar {
                              width: 6px;
                              height: 6px;
                            }
                            ::-webkit-scrollbar-track {
                              background: transparent;
                            }
                            ::-webkit-scrollbar-thumb {
                              background-color: rgba(156, 163, 175, 0.3);
                              border-radius: 9999px;
                            }
                            @media (prefers-color-scheme: dark) {
                                ::-webkit-scrollbar-thumb {
                                    background-color: rgba(255, 255, 255, 0.1);
                                }
                            }
                          </style>
                        </head>
                        <body>
                          ${selectedEmail.html || `<div style="white-space: pre-wrap;">${selectedEmail.text || 'No content'}</div>`}
                        </body>
                      </html>
                    `}
                    className="w-full flex-1 border-0"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                    style={{ backgroundColor: 'transparent', height: '100%' }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-muted-foreground/30 bg-white dark:bg-[#0f0f12]">
              <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-gray-100 dark:ring-white/5">
                <Mail size={32} className="opacity-50 text-gray-400 dark:text-zinc-600" />
              </div>
              <p className="font-medium text-lg text-gray-400 dark:text-zinc-600">Select an email to read</p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Inbox;
