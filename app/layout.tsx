import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { Providers } from "../components/providers/Providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zendor - Markdown Editor",
  description:
    "A simple, beautiful markdown editor with live preview. Like Google Docs, but for Markdown.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head>
          {process.env.NODE_ENV === "development" && (
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          )}
          {process.env.NODE_ENV === "development" && (
            <Script
              src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"
              strategy="lazyOnload"
            />
          )}
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  },
                  classNames: {
                    error:
                      "!bg-red-50 dark:!bg-red-950 !border-red-200 dark:!border-red-800 !text-red-900 dark:!text-red-100",
                  },
                }}
              />
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
