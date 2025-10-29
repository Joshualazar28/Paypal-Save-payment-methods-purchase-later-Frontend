'use client'
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { apiBase, jfetch } from '../lib/api';
export default function App({ Component, pageProps }) {
  const initialOptions = {
    'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'USD',
    intent: 'authorize'
  };
  const [form, setForm] = useState({ customerName: '', pickupLocation: '', amount: 199.00 });
  const [status, setStatus] = useState('');

  const isReady = form.customerName.trim() && form.pickupLocation.trim() && Number(form.amount) > 0;

  return (
    <PayPalScriptProvider options={initialOptions}>
   <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Prestige Ride — Book Your Limo</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Customer Name" value={form.customerName} onChange={e=>setForm({ ...form, customerName: e.target.value })} />
        <input placeholder="Pickup Location" value={form.pickupLocation} onChange={e=>setForm({ ...form, pickupLocation: e.target.value })} />
        <input type="number" step="0.01" placeholder="Ride Amount (USD)" value={form.amount} onChange={e=>setForm({ ...form, amount: parseFloat(e.target.value || '0') })} />
      </div>

      <div style={{ marginTop: 20 }}>
        <PayPalButtons
          style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
          disabled={!isReady}
          createOrder={function(){
            setStatus('Creating order…');
            return jfetch(apiBase() + '/api/paypal/create-order', {
              method: 'POST',
              body: JSON.stringify({ amount: Number(form.amount) })
            }).then(function(r){ setStatus('Order created'); return r.id; });
          }}
          onApprove={function(data){
            setStatus('Authorizing…');
            return jfetch(apiBase() + '/api/paypal/authorize-order', {
              method: 'POST',
              body: JSON.stringify({
                orderId: data.orderID,
                customerName: form.customerName,
                pickupLocation: form.pickupLocation,
                amount: Number(form.amount)
              })
            }).then(function(r){
              setStatus('✅ Booking authorized! Authorization ID: ' + r.authorizationId);
            }).catch(function(err){ setStatus('❌ ' + err.message); });
          }}
          onError={function(err){ setStatus('❌ ' + (err && err.message ? err.message : 'PayPal error')); }}
        />
      </div>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
    </PayPalScriptProvider>
  );
}
