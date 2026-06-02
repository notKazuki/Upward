// Posts the latest changelog entry to a Discord webhook.
// Runs in CI when src/data/changelog.json changes on main.
import { readFileSync } from "node:fs";

const url = process.env.DISCORD_WEBHOOK_URL;
if (!url) {
  console.log("No DISCORD_WEBHOOK_URL secret set — skipping Discord post.");
  process.exit(0);
}

const entries = JSON.parse(readFileSync("src/data/changelog.json", "utf8"));
const entry = entries[0];
if (!entry) {
  console.log("No changelog entries — nothing to post.");
  process.exit(0);
}

const description = entry.items.map((i) => `• ${i}`).join("\n");
const payload = {
  username: "Upward",
  embeds: [
    {
      title: `Upward — ${entry.title}`,
      description,
      color: 0xbc572f,
      footer: { text: `Update · ${entry.date}` },
    },
  ],
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  console.error("Discord webhook failed:", res.status, await res.text());
  process.exit(1);
}
console.log("Posted latest changelog entry to Discord.");
