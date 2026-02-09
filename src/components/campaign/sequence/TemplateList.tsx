import { Plus } from 'lucide-react';
import { EmailTemplate } from '../../../types';

interface TemplateListProps {
  templates: EmailTemplate[];
  selectedTemplate: EmailTemplate | null;
  onSelect: (template: EmailTemplate) => void;
  onCreateNew: () => void;
}

const TemplateList = ({ templates, selectedTemplate, onSelect, onCreateNew }: TemplateListProps) => {
  return (
    <div className="w-64 border-r border-border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-foreground">Templates</h3>
        <button
          onClick={onCreateNew}
          className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={16} className="mr-1" />
          New
        </button>
      </div>

      <div className="space-y-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedTemplate?.id === template.id
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            <div className="font-medium truncate">{template.name}</div>
            <div className="text-sm opacity-80 truncate">{template.subject}</div>
          </button>
        ))}

        {templates.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No templates yet
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateList;
