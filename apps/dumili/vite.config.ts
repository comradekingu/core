import { promises as fs } from "node:fs";

import VueI18n from "@intlify/unplugin-vue-i18n/vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import { BootstrapVueNextResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import eslintPlugin from "vite-plugin-eslint";
import Pages from "vite-plugin-pages";

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      autoInstall: true,
      customCollections: {
        // key as the collection name
        "extra-icons": {
          brokenLightbulb: () =>
            fs.readFile("./public/broken-lightbulb.svg", "utf-8"),
        },
      },
    }),
    eslintPlugin({
      exclude: [
        `node_modules/**`,
        `${path.resolve(__dirname, "../..")}/node_modules/**`,
        `${path.resolve(__dirname, "../..")}/packages/**`,
        "dist/**",
      ],
    }),
    AutoImport({
      dts: true,
      imports: ["vue", "vue-router", "vue-i18n", "pinia"],
      vueTemplate: true,
      dirs: [
        "../web/src/composables",
        "../web/src/stores",
        "../../packages/types",
      ],
    }),
    Components({
      resolvers: [BootstrapVueNextResolver(), IconsResolver({})],
      dts: true,
    }),

    Pages(),

    // https://github.com/intlify/bundle-tools/tree/main/packages/unplugin-vue-i18n
    VueI18n({
      runtimeOnly: false,
      compositionOnly: true,
      include: [path.resolve(__dirname, "..", "translations/**")],
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "~dm-services": path.resolve(__dirname, "../../packages/api/services"),
      "~dm-types": path.resolve(__dirname, "../../packages/types"),
      "~dumili-services": path.resolve(__dirname, "api/services"),
      "~dumili-types": path.resolve(__dirname, "types"),
      "~web": path.resolve(__dirname, "../web"),
      "~socket.io-client-services": path.resolve(
        __dirname,
        "../../packages/socket.io-client-services"
      ),
      "~socket.io-services": path.resolve(
        __dirname,
        "../../packages/socket.io-services"
      ),
      "~translations": path.resolve(__dirname, "translations"),
    },
  },
});
