// EN mirror — useT() in the zh page reads usePathname() so /en/* resolves COPY_EN
// automatically. This file is a thin shell so the static export gets /en/shop-all.
import ZhPage from '../../shop-all/page'
export const dynamic = 'force-static'
export default ZhPage
