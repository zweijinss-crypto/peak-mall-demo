// EN mirror of /shop/[id]
// Re-uses the same generateStaticParams from the zh page so static export
// emits en/shop/<id>/index.html alongside shop/<id>/index.html.
// Real bilingual wiring (copy.en.ts → client components) is a follow-up.
import ZhPage, { generateStaticParams } from '../../../shop/[id]/page'

export const dynamic = 'force-static'
export const dynamicParams = false

export { generateStaticParams }
export default ZhPage
