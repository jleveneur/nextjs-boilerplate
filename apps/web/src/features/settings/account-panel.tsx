import { AccountPasskeysCard } from "./account-passkeys-card.tsx";
import { AccountPasswordCard } from "./account-password-card.tsx";
import { AccountProfileCard } from "./account-profile-card.tsx";
import { AccountTwoFactorCard } from "./account-two-factor-card.tsx";

type Props = {
  user: { name: string; email: string; twoFactorEnabled: boolean };
};

export function AccountPanel({ user }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <AccountProfileCard name={user.name} email={user.email} />
      <AccountPasswordCard />
      <AccountTwoFactorCard enabled={user.twoFactorEnabled} />
      <AccountPasskeysCard />
    </div>
  );
}
