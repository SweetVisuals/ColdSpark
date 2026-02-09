import { Save, Trash } from 'lucide-react';
import { EmailTemplate } from '../../../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TemplateEditorProps {
  template: EmailTemplate;
  onChange: (template: EmailTemplate) => void;
  onSave: () => void;
  onDelete: () => void;
}

const TemplateEditor = ({ template, onChange, onSave, onDelete }: TemplateEditorProps) => {
  return (
    <div className="flex-1 p-6 bg-card text-card-foreground">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-bold text-foreground">Edit Template</h3>
        <div className="flex space-x-3">
          <button
            onClick={onDelete}
            className="flex items-center px-4 py-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium border border-transparent hover:border-destructive/20"
          >
            <Trash size={18} className="mr-2" />
            Delete
          </button>
          <button
            onClick={onSave}
            className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/20"
          >
            <Save size={18} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Template Name</Label>
          <Input
            value={template.name}
            onChange={(e) => onChange({ ...template, name: e.target.value })}
            placeholder="e.g. Initial Outreach"
            className="bg-background/50 border-border focus:border-primary/50 h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Subject Line</Label>
          <Input
            value={template.subject}
            onChange={(e) => onChange({ ...template, subject: e.target.value })}
            placeholder="Enter email subject"
            className="bg-background/50 border-border focus:border-primary/50 h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Message Content</Label>
          <Textarea
            value={template.content}
            onChange={(e) => onChange({ ...template, content: e.target.value })}
            rows={14}
            placeholder="Write your email content here. Use {{company}} for prospects, [[relevant_observation]] for AI personalization, or <company>, <contactnumber>, <primaryemail> for your details."
            className="bg-background/50 border-border focus:border-primary/50 font-mono resize-none p-4"
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
