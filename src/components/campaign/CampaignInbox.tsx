import { useState, useEffect, useMemo } from 'react';
import { Search, Mail, RefreshCw, Trash2, Archive, Inbox as InboxIcon, Send as SendIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EmailMessage } from '../../types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/use-toast';
import { fetchEmailAccounts } from '../../lib/api/email-accounts';

interface CampaignInboxProps {
    campaignId: string;
}

const CampaignInbox = ({ campaignId }: CampaignInboxProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'inbox' | 'sent' | 'archive'>('sent');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
    const { toast } = useToast();

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch accounts for this campaign
                const campaignAccounts = await fetchEmailAccounts(campaignId);
                setAccounts(campaignAccounts);

                // Fetch emails
                await fetchEmails(false, 'all');
            } catch (err) {
                console.error('Error loading inbox data:', err);
                setError('Failed to load inbox data');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [campaignId]);

    // Refetch when account selection changes
    useEffect(() => {
        if (!loading) {
            fetchEmails(false, selectedAccountId);
        }
    }, [selectedAccountId]);

    const fetchEmails = async (refresh = false, accountId: string = selectedAccountId) => {
        try {
            if (!campaignId) return;

            // Don't set full loading on refresh or filter change to preserve UI context, just show spinner
            if (!refresh) setLoading(true);

            setError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const url = new URL('/api/emails', window.location.origin);
            url.searchParams.append('campaignId', campaignId);

            if (accountId && accountId !== 'all') {
                url.searchParams.append('emailAccountId', accountId);
            }

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
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('Error fetching emails:', err);
            setError('Failed to load emails. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchEmails(true);
    };

    const filteredEmails = useMemo(() => {
        return emails.filter(email => {
            // Account Filter (Client side fallback, though backend handles it)
            if (selectedAccountId !== 'all' && email.accountId !== selectedAccountId) {
                return false;
            }

            // View Mode Filter
            if (viewMode === 'inbox') {
                if (email.folder !== 'inbox') return false;
            } else if (viewMode === 'sent') {
                if (email.folder !== 'sent') return false;
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
    }, [emails, searchTerm, viewMode, selectedAccountId]);

    // Handle Actions needs to be updated to rely on filtered list or current state
    const handleAction = async (action: 'delete' | 'archive', targetEmails: EmailMessage | EmailMessage[]) => {
        // ... (existing action logic is fine as it uses IDs)
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const emailList = Array.isArray(targetEmails) ? targetEmails : [targetEmails];
            if (emailList.length === 0) return;

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
        // ... (existing click logic)
        if (event.shiftKey && lastSelectedId) {
            const currentIndex = filteredEmails.findIndex(e => e.id === email.id);
            const lastIndex = filteredEmails.findIndex(e => e.id === lastSelectedId);

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const rangeEmails = filteredEmails.slice(start, end + 1);
                const rangeIds = rangeEmails.map(e => e.id);

                setSelectedEmailIds(prev => {
                    const next = new Set(prev);
                    rangeIds.forEach(id => next.add(id));
                    return next;
                });
            }
        } else if (event.ctrlKey || event.metaKey) {
            setSelectedEmailIds(prev => {
                const next = new Set(prev);
                if (next.has(email.id)) next.delete(email.id);
                else next.add(email.id);
                return next;
            });
            setLastSelectedId(email.id);
            setSelectedEmail(email);
        } else {
            setSelectedEmailIds(new Set([email.id]));
            setSelectedEmail(email);
            setLastSelectedId(email.id);
        }
    };

    return (
        <div className="h-[600px] flex border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f0f12]">

            {/* Column 1: Navigation Sidebar */}
            <div className="w-64 border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#050508] flex flex-col shrink-0 transition-colors duration-300">
                <div className="p-4 flex flex-col h-full overflow-hidden">
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase mb-4 tracking-widest pl-2 shrink-0">Mailboxes</h3>
                    <div className="flex flex-col gap-1 shrink-0">
                        <button
                            onClick={() => { setSelectedAccountId('all'); setViewMode('sent'); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                selectedAccountId === 'all' && viewMode === 'sent'
                                    ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                                    : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                            )}
                        >
                            <SendIcon size={16} className={cn("transition-colors", selectedAccountId === 'all' && viewMode === 'sent' ? "text-primary" : "text-gray-400 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground")} />
                            Sent
                            <span className={cn("ml-auto text-xs opacity-60", selectedAccountId === 'all' && viewMode === 'sent' ? "text-primary" : "text-gray-400 dark:text-muted-foreground")}>
                                {emails.filter(e => e.folder === 'sent').length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setSelectedAccountId('all'); setViewMode('inbox'); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                selectedAccountId === 'all' && viewMode === 'inbox'
                                    ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                                    : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                            )}
                        >
                            <InboxIcon size={16} className={cn("transition-colors", selectedAccountId === 'all' && viewMode === 'inbox' ? "text-primary" : "text-gray-400 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground")} />
                            Inbox
                            <span className={cn("ml-auto text-xs opacity-60", selectedAccountId === 'all' && viewMode === 'inbox' ? "text-primary" : "text-gray-400 dark:text-muted-foreground")}>
                                {emails.filter(e => e.folder === 'inbox').length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setSelectedAccountId('all'); setViewMode('archive'); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                selectedAccountId === 'all' && viewMode === 'archive'
                                    ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                                    : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                            )}
                        >
                            <Archive size={16} className={cn("transition-colors", selectedAccountId === 'all' && viewMode === 'archive' ? "text-primary" : "text-gray-400 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground")} />
                            Archived
                            <span className={cn("ml-auto text-xs opacity-60", selectedAccountId === 'all' && viewMode === 'archive' ? "text-primary" : "text-gray-400 dark:text-muted-foreground")}>
                                {emails.filter(e => e.folder === 'archive').length}
                            </span>
                        </button>
                    </div>

                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase mt-8 mb-4 tracking-widest pl-2 shrink-0">Accounts</h3>
                    <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 min-h-0 -mx-2 px-2">
                        {accounts.map(account => (
                            <button
                                key={account.id}
                                onClick={() => { setSelectedAccountId(account.id); setSelectedEmailIds(new Set()); setSelectedEmail(null); }}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group shrink-0",
                                    selectedAccountId === account.id
                                        ? "bg-primary/10 text-primary shadow-sm dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                                        : "hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-all",
                                    selectedAccountId === account.id
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
            <div className="w-80 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f12]/50 flex flex-col shrink-0 transition-colors duration-300">
                {/* Search Bar */}
                <div className="p-3 border-b border-gray-200 dark:border-white/10 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted-foreground/50" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground/40 focus:bg-white dark:focus:bg-black/40 focus:border-primary/50 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        className={cn("p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors", refreshing && "animate-spin")}
                        title="Refresh Emails"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>

                {/* General Error Alert */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 p-3 border-b border-red-100 dark:border-red-500/20">
                        <p className="text-xs text-red-700 dark:text-red-500 font-medium flex items-center gap-2">
                            <span className="text-base">❌</span> {error}
                        </p>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 dark:text-muted-foreground">
                            <RefreshCw className="animate-spin text-primary" size={24} />
                            <span className="text-sm font-medium">Loading...</span>
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
                                        "p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-l-2 relative group",
                                        selectedEmailIds.has(email.id)
                                            ? "bg-blue-50/50 dark:bg-white/5 border-primary"
                                            : "border-transparent"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={cn("font-medium text-xs truncate pr-2 transition-colors",
                                            !email.isRead ? "text-gray-900 dark:text-white font-bold" : "text-gray-600 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground"
                                        )}>
                                            {viewMode === 'sent' ? `To: ${email.to}` : (email.from.replace(/<.*>/, '').trim() || email.from)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-muted-foreground/50 shrink-0">
                                            {format(new Date(email.date), 'MMM d')}
                                        </span>
                                    </div>
                                    <div className={cn("text-xs mb-1 truncate transition-colors",
                                        !email.isRead ? "font-semibold text-gray-900 dark:text-foreground" : "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-foreground/80")}>
                                        {email.subject}
                                    </div>
                                    <div className="text-[10px] text-gray-400 dark:text-muted-foreground/40 line-clamp-2 leading-relaxed">
                                        {email.snippet}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Reading Pane */}
            <div className="flex-1 bg-white dark:bg-[#0f0f12] flex flex-col min-w-0 transition-colors duration-300">
                {selectedEmail ? (
                    <>
                        {/* Toolbar */}
                        <div className="h-14 border-b border-gray-200 dark:border-white/10 flex items-center px-6 justify-between shrink-0 bg-white/50 dark:bg-[#0f0f12]/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const target = selectedEmailIds.size > 1 ? filteredEmails.filter(e => selectedEmailIds.has(e.id)) : selectedEmail;
                                        handleAction('archive', target);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors"
                                    title="Archive"
                                >
                                    <Archive size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const target = selectedEmailIds.size > 1 ? filteredEmails.filter(e => selectedEmailIds.has(e.id)) : selectedEmail;
                                        handleAction('delete', target);
                                    }}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-500 dark:text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="text-xs font-medium text-gray-400 dark:text-muted-foreground/50">
                                {format(new Date(selectedEmail.date), 'PPpp')}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#0f0f12] scrollbar-thin flex flex-col min-h-0">
                            <div className="mb-6">
                                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-foreground">{selectedEmail.subject}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                                        {(selectedEmail.from.replace(/<.*>/, '').trim() || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-semibold text-gray-900 dark:text-foreground">{selectedEmail.from}</div>
                                        <div className="text-gray-500 dark:text-muted-foreground">to {selectedEmail.to}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-sm max-w-none dark:prose-invert flex-1 flex flex-col">
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
                            }
                            @media (prefers-color-scheme: dark) {
                              body { color: #e4e4e7; }
                              a { color: #8b5cf6 !important; }
                              p, span, div, td, th, li, h1, h2, h3, h4, h5, h6 { color: #e4e4e7 !important; }
                            }
                            @media (prefers-color-scheme: light) {
                              body { color: #111827; }
                              a { color: #2563eb; }
                            }
                            ::-webkit-scrollbar { width: 6px; }
                            ::-webkit-scrollbar-track { background: transparent; }
                            ::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 9999px; }
                          </style>
                        </head>
                        <body>
                          ${selectedEmail.html || `<div style="white-space: pre-wrap;">${selectedEmail.text || 'No content'}</div>`}
                        </body>
                      </html>
                    `}
                                    className="w-full flex-1 border-0"
                                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-muted-foreground/30 bg-white dark:bg-[#0f0f12]">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-gray-100 dark:ring-white/5">
                            <Mail size={32} className="opacity-50 text-gray-400 dark:text-zinc-600" />
                        </div>
                        <p className="font-medium text-lg text-gray-400 dark:text-zinc-600">Select an email to view</p>
                    </div>
                )}
            </div>
        </div>
    );

};

export default CampaignInbox;
