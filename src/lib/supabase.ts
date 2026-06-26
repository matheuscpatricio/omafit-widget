import { createClient } from '@supabase/supabase-js';

/** Mesmo projecto/anon key já expostos em `public/omafit-widget.js` (Shopify embed). */
const OMAFIT_SUPABASE_URL_FALLBACK = 'https://lhkgnirolvbmomeduoaj.supabase.co';
const OMAFIT_SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa2duaXJvbHZibW9tZWR1b2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjE2NDYsImV4cCI6MjA2MzMzNzY0Nn0.aSBMJMT8TiAqvdO_Z9D_oINLaQrFMZIK5IEQJG6KaOI';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim() || OMAFIT_SUPABASE_URL_FALLBACK;
const supabaseAnonKey =
  String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() || OMAFIT_SUPABASE_ANON_KEY_FALLBACK;

console.log('🔧 Configuração Supabase:', {
  urlValid: supabaseUrl.includes('supabase.co'),
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  usedFallback:
    !import.meta.env.VITE_SUPABASE_URL?.trim() || !import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  environment: import.meta.env.MODE,
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      shopify_stores: {
        Row: {
          id: string;
          user_id: string;
          store_url: string;
          access_token: string;
          api_key: string;
          api_secret: string;
          store_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_url: string;
          access_token: string;
          api_key: string;
          api_secret: string;
          store_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_url?: string;
          access_token?: string;
          api_key?: string;
          api_secret?: string;
          store_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      widget_configurations: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          title: string;
          subtitle: string;
          modal_config: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          title?: string;
          subtitle?: string;
          modal_config?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          title?: string;
          subtitle?: string;
          modal_config?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          garment_image: string | null;
          category: 'tops' | 'dresses' | 'bottoms' | 'shoes' | 'accessories';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          garment_image?: string | null;
          category: 'tops' | 'dresses' | 'bottoms' | 'shoes' | 'accessories';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          garment_image?: string | null;
          category?: 'tops' | 'dresses' | 'bottoms' | 'shoes' | 'accessories';
          created_at?: string;
          updated_at?: string;
        };
      };
      tryon_sessions: {
        Row: {
          id: string;
          product_id: string;
          customer_email: string;
          model_image: string;
          result_image: string | null;
          fashn_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_email: string;
          model_image: string;
          result_image?: string | null;
          fashn_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          customer_email?: string;
          model_image?: string;
          result_image?: string | null;
          fashn_status?: string;
          created_at?: string;
        };
      };
    };
  };
};