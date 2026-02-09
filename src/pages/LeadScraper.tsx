import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';
import axios from 'axios';
import LeadScraperForm from '../components/lead-scraper/LeadScraperForm';
import LeadScraperResults from '../components/lead-scraper/LeadScraperResults';
import Layout from '../components/layout/Layout';

const LeadScraper = () => {
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [logs, setLogs] = useState<{ timestamp: string, message: string }[]>([]);

  // Fetch previous leads and check active status on mount
  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const config = {
        headers: { Authorization: `Bearer ${session.access_token}` }
      };

      // 1. Fetch leads
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        setSearchResults(data as Lead[]);
        setHasSearched(true);
      }

      // 2. Check if scraping is in progress
      try {
        const activeRes = await axios.get('/api/scraper-active', config);
        if (activeRes.data.active) {
          setIsSearching(true);
          setHasSearched(true);
        }
      } catch (e) { }
    };
    initPage();
  }, []);

  // Log & Result Polling
  React.useEffect(() => {
    let interval: any;
    if (isSearching) {
      interval = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const config = {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          };

          // Poll Logs
          const logRes = await axios.get('/api/scraper-logs', config);
          if (Array.isArray(logRes.data)) {
            setLogs(logRes.data);
          }

          // Poll Results (Live Update!)
          const resultRes = await axios.get('/api/scraper-results', config);
          if (Array.isArray(resultRes.data) && resultRes.data.length > 0) {
            setSearchResults(resultRes.data);
          }
        } catch (e) { }
      }, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSearching]);

  const handleSearch = async (searchParams: any) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]); // Clear previous results immediately
    setLogs([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session');
        return;
      }

      const response = await axios.post('/api/scrape-leads', searchParams, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        timeout: 300000 // 5 minutes timeout
      });
      if (response.data.success) {
        // setSearchResults(response.data.data); // Handled by Key Polling now
      }
    } catch (error) {
      console.error('Search failed:', error);
      // You might want to show a toast error here
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Layout>
      <main className="flex-1 p-8 pt-6 overflow-y-auto w-full">
        <h1 className="text-foreground text-3xl font-black uppercase tracking-tight mb-8">Lead Scraper</h1>
        <LeadScraperForm onSearch={handleSearch} />
        <LeadScraperResults results={searchResults} isLoading={isSearching} hasSearched={hasSearched} logs={logs} />
      </main>
    </Layout>
  );
};

export default LeadScraper;
