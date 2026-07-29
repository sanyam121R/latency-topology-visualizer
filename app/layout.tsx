import type { Metadata } from "next";
import type { ReactNode } from 'react';
import "./globals.css";


export const metadata: Metadata = {
  title: 'Latency Topology Visualizer',
  description: 'Crypto exchange server locations and cloud-region latency, in 3D.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}