/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    transpilePackages: ['pdfjs-dist'],
    experimental: {
        serverComponentsExternalPackages: ['better-sqlite3'],
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
            };
        }
        return config;
    },
};

export default nextConfig;
