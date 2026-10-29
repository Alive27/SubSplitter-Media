import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Desactivar el body parser por defecto de Next.js/Vercel para leer el raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Usamos la Service Role Key para tener permisos de escritura en la tabla profiles
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`⚠️ Error de firma de Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento de pago completado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email || session.customer_email;

    console.log(`💰 Pago completado para el correo: ${customerEmail}`);

    if (customerEmail) {
      // Actualizar el perfil del usuario a is_premium = true en Supabase
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_premium: true })
        .eq('email', customerEmail);

      if (error) {
        console.error('❌ Error al actualizar Supabase:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✨ Usuario ${customerEmail} actualizado a PRO con éxito.`);
    }
  }

  res.status(200).json({ received: true });
}