/** @type {import('next').NextConfig} */
const nextConfig = {
    // Explicitly expose environment variables to the browser
    env: {
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
};

export default nextConfig;
