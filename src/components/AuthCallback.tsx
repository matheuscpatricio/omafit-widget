import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/?error=auth_failed');
          return;
        }

        if (data?.session) {
          // Successfully authenticated - redirect to dashboard
          navigate('/dashboard');
        } else {
          // No session found
          navigate('/?error=no_session');
        }
      } catch (error) {
        console.error('Auth callback catch error:', error);
        navigate('/?error=callback_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Finalizando login...
        </h2>
        <p className="text-gray-600">
          Aguarde enquanto processamos sua autenticação.
        </p>
      </div>
    </div>
  );
}