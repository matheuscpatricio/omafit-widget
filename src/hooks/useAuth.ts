import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: { name }
      }
    });
    
    // Se não houver erro, o usuário foi criado e já está logado
    if (!error && data.user) {
      // Força a atualização do estado do usuário
      setUser(data.user);
    }
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 useAuth.signIn chamado:', { 
      email, 
      passwordLength: password.length,
      timestamp: new Date().toISOString()
    });
    
    // Log das configurações do Supabase (sem expor chaves)
    console.log('🔧 Configuração Supabase:', {
      url: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
    });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('📊 Resposta COMPLETA do Supabase signIn:', {
      hasData: !!data,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      userConfirmed: data?.user?.email_confirmed_at,
      hasSession: !!data?.session,
      sessionValid: !!data?.session?.access_token,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStatus: error?.status,
      fullError: error ? JSON.stringify(error, null, 2) : null
    });
    
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
}