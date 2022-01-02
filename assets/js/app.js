import Vue from "vue";
import BackendDataPlugin from './plugins/backendDataPlugin'

import * as Sentry from '@sentry/vue';
import {Integrations} from "@sentry/tracing";

import App from "./layouts/App"
import { i18n } from "./i18n";

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import '../css/app.scss';
import { createPinia, PiniaVuePlugin } from "pinia";
import axios from "axios";
import { ongoingRequests } from "./stores/ongoing-requests";

const store = createPinia()

Vue.use(PiniaVuePlugin)
Vue.use(BackendDataPlugin)

const useOngoingRequests = ongoingRequests(store);
axios.interceptors.request.use(config => {
  if (useOngoingRequests.numberOfOngoingAjaxCalls === null) {
    useOngoingRequests.numberOfOngoingAjaxCalls = 1
  } else {
    useOngoingRequests.numberOfOngoingAjaxCalls++;
  }
  return config;
}, function (error) {
  return Promise.reject(error);
});
axios.interceptors.response.use(response => {
  useOngoingRequests.numberOfOngoingAjaxCalls--;
  return response;
}, error => {
  useOngoingRequests.numberOfOngoingAjaxCalls--;
  return Promise.reject(error);
});

new Vue({
  i18n,
  pinia: store,
  render(createElement) {
    let props = {}, component = null
    const attributes = this.$el.attributes;
    Object.keys(attributes || {}).forEach(key => {
      const {name, value} = attributes[key]
      if (name === 'component') {
        component = value
      } else {
        props[name] = value
      }
    })
    return createElement(App, {
      attrs: {
        props,
        component
      }
    })
  }
}).$mount('#app')

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    Vue,
    dsn: 'https://a225a6550b8c4c07914327618685a61c@sentry.ducksmanager.net/1385898',
    logErrors: true,

    integrations: [
      new Integrations.BrowserTracing(),
    ],
    tracesSampleRate: 1.0,
    tracingOptions: {
      trackComponents: true,
    },
  });
}
