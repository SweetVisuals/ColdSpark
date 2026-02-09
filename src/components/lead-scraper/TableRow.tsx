import React from 'react';
import { Lead } from '@/types';
import {
  ExternalLink, Facebook, Instagram, Linkedin, Twitter, FileText,
  ShieldCheck, CheckCircle2, XCircle, Loader2, AlertTriangle, BrainCircuit, ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomCheckbox } from '../ui/CustomCheckbox';

interface Props {
  lead: Lead;
  selected: boolean;
  onSelect: (id: string) => void;
  hidePersonalColumns?: boolean;
  onDelete?: (id: string) => void;
}

export const TableRow: React.FC<Props & { validationStatus?: 'idle' | 'loading' | 'valid' | 'warning' | 'invalid', validationMessage?: string, onValidate?: () => void }> = ({ lead, selected, onSelect, hidePersonalColumns, onDelete, validationStatus = 'idle', validationMessage = '', onValidate }) => {
  const [deepResearch, setDeepResearch] = React.useState<string | null>(null);
  const [isResearching, setIsResearching] = React.useState(false);
  const [deepResearchOpen, setDeepResearchOpen] = React.useState(false);

  // Determine if we have deep research content (either from state or pre-loaded in lead.summary)
  // Deep research is characterized by markdown headers (##), length > 200 chars, or specific error flags.
  const hasDeepResearchContent = deepResearch || (lead.summary && (lead.summary.includes('##') || lead.summary.length > 200));
  const hasError = (deepResearch && deepResearch.startsWith('AI_ERROR')) || (lead.summary && lead.summary.startsWith('AI_ERROR'));

  // If there's an error, we treat it as "not deep research yet" so user sees the retry button clearly
  const contentToShow = deepResearch || lead.summary;

  const handleDeepResearch = async () => {
    if (isResearching) return;
    setIsResearching(true);
    try {
      const res = await axios.post('/api/deep-research', {
        company: lead.company,
        website: lead.website,
        notesContext: ''
      });
      if (res.data.success) {
        setDeepResearch(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResearching(false);
    }
  };


  return (
    <tr className={`transition-colors duration-200 border-b border-border ${selected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
      <td className="px-6 py-4">
        <CustomCheckbox
          checked={selected}
          onChange={() => onSelect(lead.id)}
        />
      </td>
      <td className="px-6 py-4 text-sm font-medium text-foreground/90">
        <div className="flex items-center space-x-2">
          <span>{lead.email}</span>
          {lead.email && onValidate && (
            <button
              onClick={(e) => { e.stopPropagation(); onValidate(); }}
              disabled={validationStatus === 'loading' || validationStatus === 'valid'}
              title={validationMessage || "Validate Email"}
              className="focus:outline-none"
            >
              {validationStatus === 'idle' && (
                <ShieldCheck className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
              )}
              {validationStatus === 'loading' && (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              )}
              {validationStatus === 'valid' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {validationStatus === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              {validationStatus === 'invalid' && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </button>
          )}
        </div>
      </td>
      {!hidePersonalColumns && (
        <td className="px-6 py-4 text-sm text-muted-foreground">{lead.name}</td>
      )}
      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.company}</td>
      <td className="px-6 py-4">
        <Dialog>
          <DialogTrigger asChild>
            <button className={`p-2 rounded-lg transition-colors ${contentToShow ? 'text-primary/70 hover:text-primary hover:bg-primary/10' : 'text-muted-foreground/30 hover:text-primary hover:bg-primary/10'}`}>
              <FileText className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border max-w-2xl">
            <DialogHeader>
              <div className="flex justify-between items-center pr-8">
                <DialogTitle className="text-foreground flex items-center gap-3">
                  {lead.company} Summary
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground">
                {hasDeepResearchContent ? "Deep Dive Analysis & Social Check" : "Company Summary"}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">

              {/* HEADER ACTIONS */}
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${hasDeepResearchContent ? 'bg-purple-500/20 text-purple-400' : 'bg-primary/20 text-primary'}`}>
                    {hasDeepResearchContent ? <BrainCircuit className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {hasDeepResearchContent ? "Deep Research Active" : "Standard Summary"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {hasDeepResearchContent ? "600-word analysis + Social Check" : "Basic website scrape"}
                    </p>
                  </div>
                </div>

                {/* Allow upgrading to Deep Research if not already present or if user wants to re-run */}
                <Button
                  onClick={handleDeepResearch}
                  disabled={isResearching}
                  size="sm"
                  className={`${hasDeepResearchContent ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-purple-600 hover:bg-purple-700 text-white'} gap-2 transition-all`}
                >
                  {isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                  {isResearching ? "Researching..." : (hasError ? "Retry Deep Research" : (hasDeepResearchContent ? "Refresh Analysis" : "Run Deep Research"))}
                </Button>
              </div>

              {/* CONTENT AREA */}
              <div className="text-sm text-foreground leading-relaxed space-y-4 min-h-[100px] p-1">
                {isResearching ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="relative mx-auto w-12 h-12">
                      <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">
                      Scanning website, checking social media, and generating report...
                    </p>
                  </div>
                ) : hasError ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    <div className="flex items-center gap-2 mb-2 font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      Research Failed
                    </div>
                    <p>{contentToShow?.replace('AI_ERROR:', '')}</p>
                    <p className="mt-2 text-xs opacity-70">Check your API key or try again.</p>
                  </div>
                ) : contentToShow ? (
                  <div className="space-y-4">
                    {/* PARSE & DISPLAY SPLIT CONTENT */}
                    {(() => {
                      // Simple parser for the new structure
                      const parts = contentToShow.split('## 🔬 Deep Research');
                      const quickSummaryPart = parts[0]?.split('## ⚡ Quick Summary')[1] || parts[0]; // Fallback to all if no headers
                      const deepResearchPart = parts[1] || '';

                      const responseToQuery = contentToShow.match(/## 🎯 Response to Query\n([\s\S]*?)(?=\n##|$)/)?.[1];

                      // Filter out the response section from quick summary if it got caught there (unlikely due to top placement but safety clean)
                      const cleanQuickSummary = quickSummaryPart.replace(/## 🎯 Response to Query[\s\S]*?(?=\n##|$)/, '').trim();

                      return (
                        <>
                          {/* 1. Context Response (Priority) */}
                          {responseToQuery && (
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <h5 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Response to your query
                              </h5>
                              <p className="text-foreground/90">{responseToQuery.trim()}</p>
                            </div>
                          )}

                          {/* 2. Quick Summary */}
                          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick Summary</h5>
                            <div className="prose prose-invert prose-sm max-w-none">
                              <p className="text-foreground/90">{cleanQuickSummary}</p>
                            </div>
                          </div>

                          {/* 3. Deep Research (Collapsible) */}
                          {(deepResearchPart || (!parts[1] && contentToShow.length > 500)) && (
                            <div className="relative">
                              <div className={`rounded-lg bg-black/20 border border-border/50 p-4 ${!deepResearchOpen ? "max-h-[100px] overflow-hidden mask-linear-fade" : ""}`}>
                                <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                  <BrainCircuit className="w-3 h-3" /> Deep Research Analysis
                                </h5>
                                <div className="prose prose-invert prose-sm max-w-none">
                                  {(deepResearchPart || contentToShow).split('\n').map((line, i) => (
                                    <p key={i} className={`mb-2 ${line.startsWith('##') ? 'text-lg font-bold text-foreground mt-6 border-b border-border/50 pb-2' : ''} ${line.startsWith('**') ? 'font-semibold text-foreground/90' : ''}`}>
                                      {line.replace(/##/g, '').replace(/\*\*/g, '')}
                                    </p>
                                  ))}
                                </div>
                              </div>

                              {/* Expand Button */}
                              <div className={`mt-2 flex justify-center ${!deepResearchOpen ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent pt-8' : ''}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeepResearchOpen(!deepResearchOpen)}
                                  className="gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                >
                                  {deepResearchOpen ? (
                                    <>Collapse Analysis <ChevronUp className="w-3 h-3" /></>
                                  ) : (
                                    <>Read Full Deep Dive <ChevronDown className="w-3 h-3" /></>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-border/50 rounded-xl">
                    <p className="text-muted-foreground italic mb-4">No summary available yet.</p>
                    <Button variant="outline" onClick={handleDeepResearch}>Start Research</Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </td>
      {
        !hidePersonalColumns && (
          <td className="px-6 py-4 text-sm text-muted-foreground">{lead.role || '-'}</td>
        )
      }
      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.location || '-'}</td>
      <td className="px-6 py-4">
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium hover:underline decoration-primary/30 underline-offset-4">
            <ExternalLink className="w-3 h-3" /> Visit
          </a>
        ) : <span className="text-muted-foreground/30 text-lg">-</span>}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-3">
          {lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#0077b5] transition-colors"><Linkedin className="w-4 h-4" /></a>}
          {lead.twitter && <a href={lead.twitter} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-colors"><Twitter className="w-4 h-4" /></a>}
          {lead.facebook && <a href={lead.facebook} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#4267B2] transition-colors"><Facebook className="w-4 h-4" /></a>}
          {lead.instagram && <a href={lead.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#E1306C] transition-colors"><Instagram className="w-4 h-4" /></a>}
        </div>
      </td>
      {onDelete && (
        <td className="px-6 py-4 text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lead.id);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </td>
      )}
    </tr >
  );
};
