import { HeaderNav } from "@/components/sections/header-nav";
import { SignedOutIcon, UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/session";

/**
 * Server wrapper: reads the session and hands the client nav a ready-made
 * auth slot. Keeps the session on the server while the nav stays interactive.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <HeaderNav
      authSlot={
        user ? (
          <UserMenu
            name={user.name}
            email={user.email}
            image={user.image}
            isAdmin={user.isAdmin}
          />
        ) : (
          <SignedOutIcon />
        )
      }
    />
  );
}
