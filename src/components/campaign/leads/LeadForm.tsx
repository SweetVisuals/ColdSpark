import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lead } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  company: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
  summary: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSubmit: (lead: Lead) => void;
  onCancel: () => void;
}

export const LeadForm: React.FC<Props> = ({ onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input id="email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="company">Company</Label>
        <Input id="company" {...register('company')} />
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} />
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...register('phone')} />
      </div>

      <div>
        <Label htmlFor="linkedin">LinkedIn</Label>
        <Input id="linkedin" {...register('linkedin')} />
      </div>

      <div>
        <Label htmlFor="website">Website</Label>
        <Input id="website" {...register('website')} />
      </div>

      <div>
        <Label htmlFor="summary">Notes (Summary)</Label>
        <textarea
          id="summary"
          {...register('summary')}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Add notes for AI personalization (e.g. 'Saw their recent funding news')"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Lead</Button>
      </div>
    </form>
  );
};
