import { useEffect } from 'react';
import { testDeleteFunction } from '../lib/api/test-delete-function';
import { useToast } from '../components/ui/use-toast';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';

export default function TestDeleteFunction() {
  const { toast } = useToast();

  useEffect(() => {
    const testFunction = async () => {
      const { error } = await testDeleteFunction();

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Function exists and is callable',
        });
      }
    };

    testFunction();
  }, [toast]);

  return (
    <Layout>
      <PageHeader
        title="Testing delete_user function"
        description="Check the toast notifications for results"
      />
    </Layout>
  );
}
