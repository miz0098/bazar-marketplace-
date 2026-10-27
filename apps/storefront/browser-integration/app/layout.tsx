export const metadata = { title: "BAZAR — ізольований серверний checkout" };
import { Suspense } from "react";
import "../../app/globals.css";
import "../../app/profile/profile.css";
import { BrowserIntegrationApp } from "../screen";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <Suspense
          fallback={<p role="status">Завантажуємо ізольований інтерфейс…</p>}
        >
          <BrowserIntegrationApp />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
