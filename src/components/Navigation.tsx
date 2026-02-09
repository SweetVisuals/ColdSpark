import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Inbox, Settings, LogOut, BarChart2, AtSign, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ThemeToggle } from './ThemeToggle';
import Logo from './Logo';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-gray-50 dark:bg-[#050508] border-r border-gray-200 dark:border-white/10 p-6 flex flex-col z-50 transition-all duration-300">

      <div className="mb-10 pl-2">
        <Logo />
      </div>

      <nav className="space-y-2 flex-1 overflow-y-auto py-2 scrollbar-none">
        <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase tracking-[0.2em] pl-4 mb-4">Platform</p>
        <NavLink
          icon={<Search size={18} />}
          text="Lead Scraper"
          onClick={() => navigate('/lead-scraper')}
          active={isActive('/lead-scraper')}
        />
        <NavLink
          icon={<BarChart2 size={18} />}
          text="Campaigns"
          onClick={() => navigate('/dashboard')}
          active={isActive('/dashboard')}
        />
        <NavLink
          icon={<List size={18} />}
          text="Lists"
          onClick={() => navigate('/lists')}
          active={isActive('/lists')}
        />

        <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase tracking-[0.2em] pl-4 mt-10 mb-4">Communication</p>
        <NavLink
          icon={<Inbox size={18} />}
          text="Inbox"
          onClick={() => navigate('/inbox')}
          active={isActive('/inbox')}
        />
        <NavLink
          icon={<AtSign size={18} />}
          text="Email Accounts"
          onClick={() => navigate('/email-accounts')}
          active={isActive('/email-accounts')}
        />

        <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground/40 uppercase tracking-[0.2em] pl-4 mt-10 mb-4">Configuration</p>
        <NavLink
          icon={<Settings size={18} />}
          text="Settings"
          onClick={() => navigate('/account-settings')}
          active={isActive('/account-settings')}
        />
      </nav>

      <div className="mt-auto space-y-4 pt-8 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/5">
          <span className="text-xs font-medium text-gray-600 dark:text-muted-foreground/80">Dark Mode</span>
          <ThemeToggle />
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center space-x-3 text-gray-500 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-white w-full px-4 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-white/5 transition-all duration-200 group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-medium text-sm tracking-wide">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

interface NavLinkProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick: () => void;
}

const NavLink = ({ icon, text, active = false, onClick }: NavLinkProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3.5 p-3.5 rounded-xl w-full transition-all duration-300 group relative overflow-hidden ${active
        ? 'text-primary bg-primary/10 border border-primary/20 shadow-sm dark:text-white dark:bg-primary/10 dark:border-primary/20 dark:shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 border border-transparent dark:text-muted-foreground dark:hover:text-white dark:hover:bg-white/5 dark:hover:border-white/5'
        }`}
    >
      <span className={`transition-all duration-300 relative z-10 ${active ? 'text-primary' : ''}`}>
        {icon}
      </span>
      <span className="font-medium text-sm relative z-10 tracking-wide">
        {text}
      </span>
    </button>
  );
};

export default Navigation;
