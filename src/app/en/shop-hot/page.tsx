// EN mirror — useT() in the zh page reads usePathname() so /en/* resolves COPY_EN
// automatically. This file is a thin shell so the static export gets /en/shop-hot.
import ZhPage from '../../shop-hot/page'
export const dynamic = 'force-static'
export default ZhPage
