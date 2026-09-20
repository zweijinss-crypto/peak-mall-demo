'use client';

import { UserSidebar } from './UserSidebar';
import AnnouncementBar from './AnnouncementBar';
import ShopHeader from './ShopHeader';
import Footer from './Footer';

/**
 * UserShell — header + footer + left rail (UserSidebar) + main content.
 *
 * Used by every logged-in user page (profile, commissions, withdraw,
 * withdraw-address, orders, address, wishlist, aftersale, security/*).
 * The sidebar mirrors the source site's 4-group nav.
 */
export function UserShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <ShopHeader />
      <main className="bg-neutral-50 min-h-[calc(100vh-300px)] py-6 md:py-8">
        <div className="max-w-[1280px] mx-auto px-4 flex flex-col md:flex-row gap-4 md:gap-6">
          <UserSidebar />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}