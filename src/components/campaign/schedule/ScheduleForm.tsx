import React from 'react';
import { Label } from 'components/ui/label';
import { Input } from 'components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import { EmailTemplate } from 'types';
import { Calendar, Clock, Mail, Timer, Target, Users } from 'lucide-react';

interface ScheduleFormProps {
  templates: EmailTemplate[];
  selectedTemplate: string;
  startDate: string;
  endDate: string;
  startTime: string;
  emailsPerAccount?: number;
  emailsPerDay?: number;
  interval?: number;
  intervalAccount?: number;
  onTemplateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEmailsPerAccountChange: (value?: number) => void;
  onEmailsPerDayChange: (value?: number) => void;
  onIntervalChange: (value?: number) => void;
  onIntervalAccountChange: (value?: number) => void;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  templates,
  selectedTemplate,
  startDate,
  endDate,
  startTime,
  emailsPerAccount,
  emailsPerDay,
  interval,
  intervalAccount,
  onTemplateChange,
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEmailsPerAccountChange,
  onEmailsPerDayChange,
  onIntervalChange,
  onIntervalAccountChange,
}) => {
  return (
    <div className="space-y-10">
      {/* Template Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-bold">Email Template</Label>
            <p className="text-xs text-muted-foreground">Select the email sequence to send</p>
          </div>
        </div>
        <Select value={selectedTemplate} onValueChange={onTemplateChange}>
          <SelectTrigger className="mt-2 h-12 bg-background border-border/50 hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Scheduling Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label className="text-base font-bold">Campaign Timeline</Label>
              <p className="text-xs text-muted-foreground">Set the duration and start time</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 bg-muted/20 rounded-2xl border border-border/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onStartDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-background border-border/50 focus:ring-primary/20 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onStartTimeChange(e.target.value)}
                    className="bg-background border-border/50 focus:ring-primary/20 h-11"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEndDateChange(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                className="bg-background border-border/50 focus:ring-primary/20 h-11"
              />
            </div>
          </div>
        </div>

        {/* Limits & Intervals Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label className="text-base font-bold">Volume & Pace</Label>
              <p className="text-xs text-muted-foreground">Configure daily limits and gaps</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-2xl border border-border/50">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Volume</Label>
              <div className="relative group">
                <Input
                  type="text"
                  value={emailsPerDay === undefined ? "" : String(emailsPerDay)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    if (value === "") onEmailsPerDayChange(undefined);
                    else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed)) onEmailsPerDayChange(parsed);
                    }
                  }}
                  className="bg-background border-border/50 focus:ring-primary/20 h-11 pr-10"
                  placeholder="Total emails"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send Interval</Label>
              <div className="relative group">
                <Input
                  type="text"
                  value={interval === undefined ? "" : String(interval)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    if (value === "") onIntervalChange(undefined);
                    else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed)) onIntervalChange(parsed);
                    }
                  }}
                  className="bg-background border-border/50 focus:ring-primary/20 h-11 pr-10"
                  placeholder="Minutes"
                />
                <Timer className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per Account</Label>
              <div className="relative group">
                <Input
                  type="text"
                  value={emailsPerAccount === undefined ? "" : String(emailsPerAccount)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    if (value === "") onEmailsPerAccountChange(undefined);
                    else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed)) onEmailsPerAccountChange(parsed);
                    }
                  }}
                  className="bg-background border-border/50 focus:ring-primary/20 h-11 pr-10"
                  placeholder="Max emails"
                />
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Gap</Label>
              <div className="relative group">
                <Input
                  type="text"
                  value={intervalAccount === undefined ? "" : String(intervalAccount)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    if (value === "") onIntervalAccountChange(undefined);
                    else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed)) onIntervalAccountChange(parsed);
                    }
                  }}
                  className="bg-background border-border/50 focus:ring-primary/20 h-11 pr-10"
                  placeholder="Minutes"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

