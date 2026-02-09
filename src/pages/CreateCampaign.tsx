import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useApp } from '../context/AppContext';
import BackButton from '../components/common/BackButton';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FormData {
  name: string;
  niche: string;
  maxEmailsPerDay: string;
  frequency: 'daily' | 'weekly';
}

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { addCampaign } = useApp();
  const { register, handleSubmit, setValue } = useForm<FormData>(); // Added setValue

  const onSubmit = async (data: FormData) => {
    try {
      await addCampaign({
        name: data.name,
        status: 'Draft',
        prospects: '0',
        replies: '0',
        openRate: '0%',
        niche: data.niche,
        schedule: {
          frequency: data.frequency,
          maxEmailsPerDay: parseInt(data.maxEmailsPerDay),
        },
      });
      navigate('/');
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  return (
    <Layout>
      <div className="mb-4">
        <BackButton onClick={() => navigate('/dashboard')} />
      </div>

      <PageHeader
        title="Create New Campaign"
        description="Launch a new cold email outreach campaign"
      />

      <div className="max-w-3xl">
        <Card className="border-border shadow-2xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30 p-8">
            <CardTitle className="text-2xl font-bold text-foreground">Campaign Details</CardTitle>
            <p className="text-muted-foreground mt-1">Configure your new outreach campaign settings below.</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-foreground font-semibold">Campaign Name</Label>
                <Input
                  id="name"
                  {...register('name', { required: true })}
                  placeholder="e.g. Q1 SaaS Outreach"
                  className="bg-background/50 border-border focus:border-primary/50 h-12 px-4 rounded-xl transition-all"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="niche" className="text-foreground font-semibold">Niche</Label>
                <Input
                  id="niche"
                  {...register('niche', { required: true })}
                  placeholder="e.g. SaaS, E-commerce, Real Estate"
                  className="bg-background/50 border-border focus:border-primary/50 h-12 px-4 rounded-xl transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="maxEmailsPerDay" className="text-foreground font-semibold">Emails Per Day</Label>
                  <Input
                    id="maxEmailsPerDay"
                    type="number"
                    {...register('maxEmailsPerDay', { required: true })}
                    defaultValue="100"
                    min="1"
                    max="1000"
                    className="bg-background/50 border-border focus:border-primary/50 h-12 px-4 rounded-xl transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Max limit: 1000/day</p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="frequency" className="text-foreground font-semibold">Frequency</Label>
                  <Select defaultValue="daily" onValueChange={(value) => setValue('frequency', value as 'daily' | 'weekly')}>
                    <SelectTrigger className="bg-background/50 border-border focus:border-primary/50 h-12 px-4 rounded-xl transition-all text-foreground">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
                <button
                  onClick={() => navigate('/')}
                  type="button"
                  className="px-6 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold transition-all shadow-lg shadow-primary/30"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateCampaign;
