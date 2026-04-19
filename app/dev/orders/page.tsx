import { getOrders } from '@/lib/db/orders'

// Throwaway smoke-test page — delete before shipping.
// Visit /dev/orders to verify the orders repository.
// createOrder is not exercised here — that's tested via the checkout flow in Phase 3.
export default async function DevOrdersPage() {
  const orders = await getOrders()

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>smoke test — orders ({orders.length})</h1>
      <pre>{JSON.stringify(orders, null, 2)}</pre>
    </main>
  )
}
