import { useEffect } from "react";
import CRTTerminal from "@/components/crt-terminal";

export default function Terminal() {
  useEffect(() => {
    document.title = "Ethos AI Terminal - Retro CRT Interface";
    
    // Add meta description for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'AI-powered retro CRT terminal for exploring Ethos Network Web3 reputation data. Natural language queries meet 1980s computing aesthetics.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'AI-powered retro CRT terminal for exploring Ethos Network Web3 reputation data. Natural language queries meet 1980s computing aesthetics.';
      document.head.appendChild(meta);
    }

    // Add Open Graph tags
    const ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    ogTitle.content = 'Ethos AI Terminal - Retro CRT Interface';
    document.head.appendChild(ogTitle);

    const ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    ogDescription.content = 'AI-powered retro CRT terminal for exploring Ethos Network Web3 reputation data with natural language queries.';
    document.head.appendChild(ogDescription);

    const ogType = document.createElement('meta');
    ogType.setAttribute('property', 'og:type');
    ogType.content = 'website';
    document.head.appendChild(ogType);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <CRTTerminal />
    </div>
  );
}
