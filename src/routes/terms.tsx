import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Hearth Handbook" },
      { name: "description", content: "The terms governing your use of Hearth Handbook's town guides, accounts, and sponsor listings." },
      { property: "og:title", content: "Terms of Service — Hearth Handbook" },
      { property: "og:description", content: "The terms governing your use of Hearth Handbook." },
      { property: "og:url", content: "https://hearthhandbook.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://hearthhandbook.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
      <p>By using Welcome Home you agree to these terms.</p>
      <h2>Use of the service</h2>
      <p>Welcome Home is a free service that surfaces local businesses, coupons, and town information. Don't abuse it, scrape it at scale, or use it to harass others.</p>
      <h2>Accounts</h2>
      <p>You're responsible for keeping your account secure. We may suspend accounts that violate these terms.</p>
      <h2>Content</h2>
      <p>Business listings and coupons are provided by realtors and merchants. We don't guarantee accuracy or honor of any listed offer.</p>
      <h2>Changes</h2>
      <p>We may update these terms; continued use means you accept the new terms.</p>
    </div>
  );
}
