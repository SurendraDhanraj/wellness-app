import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlobalHeader } from "@/components/MiniLogo";

export const metadata: Metadata = {
  title: "Heritage Wellness Tracker",
  description: "Heritage Petroleum Company Limited — Employee Wellness Tracker",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#C0244C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <GlobalHeader />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}

// Import after to avoid circular
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
