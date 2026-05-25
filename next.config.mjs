/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',   // fotos comprimidas cabem com folga
    },
  },
};

export default nextConfig;
