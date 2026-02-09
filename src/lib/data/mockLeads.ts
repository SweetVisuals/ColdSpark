import { generateUUID } from '../utils/uuid.js';

export const mockLeads = [
  {
    id: generateUUID(),
    email: 'john.doe@techcorp.com',
    name: 'John Doe',
    company: 'TechCorp',
    title: 'CTO',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/johndoe',
    industry: 'Technology',
    location: 'San Francisco, CA',
    employees: '50-200',
    company_news: 'Recently raised Series A funding'
  },
  {
    id: generateUUID(),
    email: 'sarah.smith@innovate.io',
    name: 'Sarah Smith',
    company: 'Innovate.io',
    title: 'VP of Marketing',
    phone: '+1 (555) 234-5678',
    linkedin: 'linkedin.com/in/sarahsmith',
    industry: 'SaaS',
    location: 'New York, NY',
    employees: '10-50',
    company_news: 'Launched new product line'
  },
  {
    id: generateUUID(),
    email: 'michael.brown@growthco.com',
    name: 'Michael Brown',
    company: 'GrowthCo',
    title: 'CEO',
    phone: '+1 (555) 345-6789',
    linkedin: 'linkedin.com/in/michaelbrown',
    industry: 'Marketing',
    location: 'Austin, TX',
    employees: '200-500',
    company_news: 'Expanding to European markets'
  }
];
