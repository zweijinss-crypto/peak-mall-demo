// EN mirror — useT() in the zh page reads usePathname() so /en/* resolves COPY_EN
// automatically. This file is a thin shell so the static export gets /en/shop-new.
import ZhPage from '../../shop-new/page'
export const dynamic = 'force-static'
export default ZhPage
