import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuração Supabase:', {
  urlValid: supabaseUrl?.includes('supabase.co'),
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  environment: import.meta.env.MODE
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