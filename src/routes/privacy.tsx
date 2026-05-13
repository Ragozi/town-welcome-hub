import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Welcome Home" }, { name: "description", content: "How Welcome Home collects, uses, and protects your data." }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
      <h2>What we collect</h2>
      <ul>
        <li>Your email and name (from Google sign-in or email signup)</li>
        <li>Your home town (auto-detected from your IP, editable any time)</li>
        <li>Your interests, lifestyle tags, and saved items</li>
        <li>Marketing email opt-ins you choose</li>
      </ul>
      <h2>Why we collect it</h2>
      <p>To personalize your local feed, show you relevant coupons, and (with your opt-in) send you emails about local deals, events, and new businesses.</p>
      <h2>What we never do</h2>
      <ul>
        <li>Sell your email address</li>
        <li>Email you about topics you didn't opt into</li>
        <li>Track your precise GPS location (we only use your IP-derived town)</li>
      </ul>
      <h2>Your rights</h2>
      <p>You can edit your preferences, change your home town, opt out of any email topic, or delete your account entirely from <Link to="/me/settings" className="underline">Preferences</Link>. Deletion is permanent and immediate.</p>
      <h2>Contact</h2>
      <p>Questions? Email igor@halolabsai.com.</p>
    </div>
  );
}
