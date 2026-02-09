import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';

export const customTheme = {
  default: {
    colors: {
      brand: 'rgb(37, 99, 235)',
      brandAccent: 'rgb(29, 78, 216)',
      brandButtonText: 'white',
      defaultButtonBackground: '#27272a', // zinc-800
      defaultButtonBackgroundHover: '#3f3f46', // zinc-700
      defaultButtonBorder: '#3f3f46', // zinc-700
      defaultButtonText: 'white',
      dividerBackground: '#3f3f46', // zinc-700
      inputBackground: '#18181b', // zinc-900
      inputBorder: '#27272a', // zinc-800
      inputBorderHover: '#3f3f46', // zinc-700
      inputBorderFocus: 'rgb(37, 99, 235)',
      inputText: 'white',
      inputLabelText: '#a1a1aa', // zinc-400
      inputPlaceholder: '#52525b', // zinc-600
    },
    space: {
      spaceSmall: '4px',
      spaceMedium: '8px',
      spaceLarge: '16px',
      labelBottomMargin: '8px',
      anchorBottomMargin: '4px',
      emailInputSpacing: '4px',
      socialAuthSpacing: '4px',
      buttonPadding: '8px',
      inputPadding: '8px',
    },
    borderWidths: {
      buttonBorderWidth: '1px',
      inputBorderWidth: '1px',
    },
    radii: {
      borderRadiusButton: '6px',
      buttonBorderRadius: '6px',
      inputBorderRadius: '6px',
    },
    fonts: {
      bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
      buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
      inputFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
    },
    fontSizes: {
      baseBodySize: '14px',
      baseInputSize: '14px',
      baseLabelSize: '14px',
      baseButtonSize: '14px',
    },
  },
};

const AuthLayout = () => {
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
          Sign in to your account
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
              view="sign_in"
              showLinks={false}
            />
            <div className="mt-4 text-center text-sm">
              <span className="text-zinc-400">Don't have an account?</span>{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-500 hover:text-blue-400 font-medium"
              >
                Create an account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthLayout;
