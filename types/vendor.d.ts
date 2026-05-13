// Type declarations for packages that ship without TypeScript definitions.

declare module "playwright-extra-plugin-stealth" {
  import type { Plugin } from "playwright-extra";
  function StealthPlugin(): Plugin;
  export = StealthPlugin;
}
