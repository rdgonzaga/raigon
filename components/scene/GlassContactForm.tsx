"use client";

import { useState } from "react";
import { site } from "@/lib/content";

type FormStatus = "idle" | "sending" | "sent" | "error";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

/** Same Web3Forms submit as the v1 contact form, restyled for the sheet. */
export function GlassContactForm() {
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

  const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;

  return (
    <form onSubmit={handleSubmit} className="rg-form">
      <input
        type="checkbox"
        name="botcheck"
        checked={botcheck}
        onChange={(event) => setBotcheck(event.target.checked)}
        tabIndex={-1}
        autoComplete="off"
        hidden
        aria-hidden="true"
      />
      <label>
        Name
        <input required disabled={disabled} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
      </label>
      <label>
        Email
        <input type="email" required disabled={disabled} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      </label>
      <label className="rg-form-wide">
        Message
        <textarea required rows={4} disabled={disabled} value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <div className="rg-form-wide rg-form-foot">
        <button type="submit" disabled={disabled}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <span role="status">
          {status === "sent" && "Message sent. Thanks!"}
          {status === "error" && <>Send failed. Email me at {mail}</>}
          {!configured && <>Form not configured yet. Email me at {mail}</>}
        </span>
      </div>
    </form>
  );
}
