/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:all",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(self)",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;