import type { Metadata } from "next";
import { requireProductionSecrets } from "@/lib/supabase-admin";
import "./globals.css";
import "./crm-standard.css";
import { ProfilePhotoProvider } from "./components/profile-photo-provider";

export const metadata: Metadata = {
  title: "Monteiro CRM",
  description: "Central de operação imobiliária de Franklin Monteiro",
  icons: {
    icon: "/monteiro-logo.png",
    shortcut: "/monteiro-logo.png",
    apple: "/monteiro-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  requireProductionSecrets();
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const p=localStorage.getItem('monteiro-profile-photo');if(p)document.documentElement.style.setProperty('--crm-profile-photo','url('+p+')')}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ProfilePhotoProvider />
        {children}
      </body>
    </html>
  );
}
