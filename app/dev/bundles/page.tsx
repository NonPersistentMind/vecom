import { getBundles } from '@/lib/db/bundles'

// Throwaway smoke-test page — delete before shipping.
// Visit /dev/bundles to verify the bundles repository.
export default async function DevBundlesPage() {
  const bundles = await getBundles({ includeArchived: true })

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>smoke test — bundles ({bundles.length})</h1>
      <pre>{JSON.stringify(bundles, null, 2)}</pre>
    </main>
  )
}
