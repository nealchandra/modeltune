const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');

module.exports = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    return config;
  },
  env: {
    NEXTAUTH_SECRET: 'bR03smfoHtPSLt52U+L3mkeXGLo7I6odk6cj2z7aIoI=',
  },
};
