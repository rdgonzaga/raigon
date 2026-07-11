"use client";

import { useState } from "react";
import { site } from "@/lib/content";
import { SpotlightBorder } from "@/components/ui/SpotlightBorder";

type FormStatus = "idle" | "sending" | "sent" | "error";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [botcheck, setBotcheck] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");

  const configured = Boolean(ACCESS_KEY);
  const disabled = !configured || status === "sending";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled || botcheck) return;

    setStatus("sending");
    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_key: ACCESS_KEY, name, email, message }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <SpotlightBorder className="rounded-md border border-line bg-panel p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot: hidden from sighted users, but visible to naive bots that
            fill every field. If it's checked on submit, we silently bail. */}
        <input
          type="checkbox"
          name="botcheck"
          checked={botcheck}
          onChange={(event) => setBotcheck(event.target.checked)}
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="text-xs text-ash-dim">
              name
            </label>
            <input
              id="contact-name"
              required
              disabled={disabled}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="jane doe"
              className="mt-1 w-full border-b border-line bg-transparent py-2 font-mono text-sm text-paper outline-none placeholder:text-ash-dim focus:border-signal disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="text-xs text-ash-dim">
              email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              disabled={disabled}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jane@email.com"
              className="mt-1 w-full border-b border-line bg-transparent py-2 font-mono text-sm text-paper outline-none placeholder:text-ash-dim focus:border-signal disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="text-xs text-ash-dim">
            message
          </label>
          <textarea
            id="contact-message"
            required
            rows={4}
            disabled={disabled}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="say something"
            className="mt-1 w-full resize-none border-b border-line bg-transparent py-2 font-mono text-sm text-paper outline-none placeholder:text-ash-dim focus:border-signal disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-sm">
          <button
            type="submit"
            disabled={disabled}
            className="rounded-[3px] border border-signal/50 px-4 py-2 text-signal transition-colors hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "sending" ? "sending…" : "send message"}
          </button>

          {status === "sent" && <span className="text-live">&gt; message sent</span>}
          {status === "error" && (
            <span className="text-alert">
              &gt; send failed — email me directly at{" "}
              <a href={`mailto:${site.email}`} className="underline">
                {site.email}
              </a>
            </span>
          )}
          {!configured && (
            <span className="text-ash-dim">
              form not configured yet — email me directly at{" "}
              <a href={`mailto:${site.email}`} className="underline">
                {site.email}
              </a>
            </span>
          )}
        </div>
      </form>
    </SpotlightBorder>
  );
}
