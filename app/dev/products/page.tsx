import { getProducts } from '@/lib/db/products'

// Throwaway smoke-test page — delete before shipping.
// Visit /dev/products to verify the DB connection and products repository.
export default async function DevProductsPage() {
  const products = await getProducts({ includeArchived: true })

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>smoke test — products ({products.length})</h1>
      <pre>{JSON.stringify(products, null, 2)}</pre>
    </main>
  )
}
