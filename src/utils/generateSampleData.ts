import { supabase } from '../lib/supabase';

export async function generateSampleAnalyticsData(userId: string) {
  try {
    // Get products for this user
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', userId);

    if (!products || products.length === 0) {
      console.log('No products found. Please create products first.');
      return;
    }

    // Sample customer emails
    const sampleEmails = [
      'cliente1@example.com',
      'cliente2@example.com',
      'cliente3@example.com',
      'cliente4@example.com',
      'cliente5@example.com',
      'cliente6@example.com',
      'cliente7@example.com',
      'cliente8@example.com',
      'cliente9@example.com',
      'cliente10@example.com',
    ];

    // Generate sample orders
    const orders = [];
    for (let i = 0; i < 20; i++) {
      const usedTryon = Math.random() > 0.3;
      const orderValue = usedTryon
        ? 150 + Math.random() * 300
        : 80 + Math.random() * 200;

      orders.push({
        user_id: userId,
        customer_email: sampleEmails[Math.floor(Math.random() * sampleEmails.length)],
        order_value: orderValue,
        used_tryon: usedTryon,
        order_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const { error: ordersError } = await supabase
      .from('orders')
      .insert(orders);

    if (ordersError) throw ordersError;

    // Generate sample customer analytics
    const customerAnalytics = sampleEmails.map(email => ({
      user_id: userId,
      customer_email: email,
      total_orders: Math.floor(Math.random() * 5) + 1,
      total_spent: (Math.random() * 1000) + 100,
      used_tryon_count: Math.floor(Math.random() * 3) + 1,
      first_purchase_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_purchase_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { error: customerError } = await supabase
      .from('customer_analytics')
      .insert(customerAnalytics);

    if (customerError) throw customerError;

    // Get all tryon sessions for this user
    const { data: sessions } = await supabase
      .from('tryon_sessions')
      .select('id, product_id')
      .in('product_id', products.map(p => p.id));

    if (sessions && sessions.length > 0) {
      // Generate session analytics
      const sessionAnalytics = sessions.map(session => ({
        tryon_session_id: session.id,
        user_id: userId,
        duration_seconds: Math.floor(Math.random() * 180) + 30,
        completed: Math.random() > 0.2,
        shared: Math.random() > 0.7,
        processing_time_seconds: Math.floor(Math.random() * 15) + 5,
        images_processed: 1,
      }));

      const { error: sessionError } = await supabase
        .from('session_analytics')
        .insert(sessionAnalytics);

      if (sessionError) throw sessionError;
    }

    // Generate product analytics
    const productAnalytics = products.map(product => ({
      product_id: product.id,
      user_id: userId,
      tryon_count: Math.floor(Math.random() * 50) + 5,
      conversion_count: Math.floor(Math.random() * 20) + 1,
      last_tryon_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { error: productError } = await supabase
      .from('product_analytics')
      .insert(productAnalytics);

    if (productError) throw productError;

    console.log('Sample analytics data generated successfully!');
    return true;
  } catch (error) {
    console.error('Error generating sample data:', error);
    return false;
  }
}
