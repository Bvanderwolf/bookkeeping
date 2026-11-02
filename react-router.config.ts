import type { Config } from "@react-router/dev/config";

export default {
  basename: process.env.BASE_PATH ?? "/",
  ssr: false,
} satisfies Config;
