import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializamos Stripe con tu clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inicializamos Supabase con la Service Role Key para poder actualizar perfiles con privilegios
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false, // Necesario para validar la firma de Stripe
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error(`Error de firma en el Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejamos el evento cuando el pago se completa con éxito
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (customerEmail) {
      console.log(`Pago recibido de: ${customerEmail}. Actualizando a Premium...`);

      // Actualizamos al usuario en la tabla profiles de Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('email', customerEmail);

      if (error) {
        console.error('Error al actualizar el perfil en Supabase:', error);
        return res.status(500).json({ error: 'Error al actualizar base de datos' });
      }
    }
  }

  res.status(200).json({ received: true });
}