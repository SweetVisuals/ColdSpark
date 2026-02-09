import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { parseCSV } from '@/lib/utils/csv';
import { Lead } from '@/types';

interface Props {
  onUpload: (leads: Lead[]) => void;
}

export const LeadUploader: React.FC<Props> = ({ onUpload }) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const leads = await parseCSV(file);
      onUpload(leads);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
        ${isDragActive
          ? 'border-primary bg-primary/10 ring-4 ring-primary/5'
          : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30'}`}
    >
      <input {...getInputProps()} />
      <div className={`mx-auto h-16 w-16 mb-4 rounded-full flex items-center justify-center transition-colors
        ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10'}`}>
        <Upload size={32} />
      </div>
      <p className="text-md font-bold text-foreground">
        {isDragActive
          ? 'Drop the CSV file now'
          : 'Drag & drop your CSV file here'}
      </p>
      <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
        Or click to browse your computer. Supports email, name, company, and more.
      </p>
    </div>
  );
};
