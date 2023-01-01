/* eslint-disable @typescript-eslint/ban-ts-comment */
import "./styles/main.scss";
import "./styles/histoire.scss";
import "v-contextmenu/dist/themes/default.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue-3/dist/bootstrap-vue-3.css";

import { defineSetupVue3 } from "@histoire/plugin-vue";
import { createHead } from "@vueuse/head";
import axios from "axios";
import BootstrapVue3, { BToastPlugin } from "bootstrap-vue-3";
import { createPinia } from "pinia";
// @ts-ignore
import contextmenu from "v-contextmenu";

import i18n from "./i18n.js";

export const setupVue3 = defineSetupVue3(({ app }) => {
  const head = createHead();

  const store = createPinia();
  axios.defaults.baseURL = import.meta.env.VITE_GATEWAY_URL;
  app.use(i18n);
  app.use(store);
  app.use(BootstrapVue3);
  app.use(BToastPlugin);
  app.use(contextmenu);
  app.use(head);
});
