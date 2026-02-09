import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { customTheme } from './AuthLayout';

const SignUpLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Sign Up for an account
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Get started with email outreach automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="pt-6">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: customTheme
              }}
              theme="default"
              providers={[]}
              redirectTo={`${window.location.origin}/dashboard`}
              onlyThirdPartyProviders={false}
              view="sign_up"
              showLinks={false}
            />
            <div className="mt-4 text-center text-sm">
              <span className="text-zinc-400">Already have an account?</span>{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-500 hover:text-blue-400 font-medium"
              >
                Sign in
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUpLayout;
