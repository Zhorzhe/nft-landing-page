import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Самостоятелен изход за лесно пускане в Docker / на VPS (вж. DEPLOYMENT.md).
  output: "standalone",
  // sharp и Prisma адаптерът работят само на сървъра.
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      // Лимит за качване на лога и Excel файлове през Server Actions.
      bodySizeLimit: "20mb",
    },
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
