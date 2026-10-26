// SVG geometry preserved from Shopify 105d10f sections/bazar-footer.liquid.
const icons = {
  Facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14.2 8.3V6.8c0-.7.5-.9.9-.9h2.2V2.2L14.2 2c-3.5 0-4.3 2.6-4.3 4.2v2.1H7.2v3.9h2.7V22h4.1v-9.8h3.1l.5-3.9h-3.4Z"
        fill="currentColor"
      />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  ),
  Threads: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12.3 3.1c4.4 0 7.2 2.7 7.2 8.1 0 5.8-3.1 9.7-7.7 9.7-4 0-7.3-2.7-7.3-7.1 0-4 2.9-6.2 6.2-6.2 2.7 0 4.7 1.5 4.9 3.9 1.1.4 1.9 1 2.4 1.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.6 11.6c-.2 2.1-1.6 4-4 4-1.6 0-2.8-.8-2.8-2.1 0-1.5 1.4-2.2 3.2-2.2 1.5 0 2.9.4 3.6.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  ),
  Telegram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20.8 4.4 3.8 11c-1 .4-1 1.7.1 2l4.2 1.3 1.6 5c.3.9 1.4 1.1 2 .4l2.4-2.5 4.3 3.2c.8.6 2 .1 2.1-.9l2.3-13.4c.2-1.1-.9-2-2-1.6Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m8.1 14.2 8.4-5.1-5.5 6.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  ),
};
export function SocialIcon({ name }: { name: string }) {
  return icons[name as keyof typeof icons] ?? null;
}
