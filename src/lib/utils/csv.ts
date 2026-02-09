import Papa from 'papaparse';
import { Lead } from '@/types';

export async function parseCSV(file: File): Promise<Lead[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const leads = results.data.map((row: any) => ({
          id: crypto.randomUUID(),
          email: row.email || '',
          name: row.name || '',
          company: row.company || '',
          title: row.title || '',
          phone: row.phone || '',
          linkedin: row.linkedin || '',
        }));
        resolve(leads);
      },
      error: (error) => reject(error)
    });
  });
}
