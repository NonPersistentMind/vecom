import { getProducts } from '@/lib/db/products'
import { getVariantsByProduct } from '@/lib/db/variants'

// Throwaway smoke-test page — delete before shipping.
// Visit /dev/products to verify the DB connection and both repositories.
export default async function DevProductsPage() {
  const products = await getProducts({ includeArchived: true })
  const variantsByProduct = await Promise.all(
    products.map(p =>
      getVariantsByProduct(p.id, { includeArchived: true }).then(vs => ({ product: p.name, variants: vs }))
    )
  )

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>smoke test — products ({products.length})</h1>
      <pre>{JSON.stringify(products, null, 2)}</pre>
      <h2>variants per product</h2>
      <pre>{JSON.stringify(variantsByProduct, null, 2)}</pre>
    </main>
  )
}
