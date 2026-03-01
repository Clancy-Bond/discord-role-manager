import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Discord Role Manager",
    short_name: "RoleManager",
    description: "Manage Discord server roles from your phone",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e10",
    theme_color: "#5865f2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
