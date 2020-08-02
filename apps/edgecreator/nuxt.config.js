import { json } from 'body-parser'

export default {
  mode: 'universal',
  /*
   ** Headers of the page
   */
  head: {
    title: process.env.npm_package_name || '',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: process.env.npm_package_description || '',
      },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },
  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#fff' },
  /*
   ** Global CSS
   */
  css: [],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    '~/plugins/axios',
    { src: '~/plugins/vue-cropper', ssr: false },
    { src: '~/plugins/vue-bootstrap-typeahead', ssr: false },
  ],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [
    // Doc: https://github.com/nuxt-community/eslint-module
    '@nuxtjs/eslint-module',
  ],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://github.com/Developmint/nuxt-svg-loader#readme
    'nuxt-svg-loader',
    // Doc: https://nuxt-community.github.io/nuxt-i18n/
    [
      'nuxt-i18n',
      {
        lazy: true,
        langDir: 'locales/',
        defaultLocale: 'fr',
        locales: [
          {
            code: 'fr',
            name: 'Français',
            iso: 'fr-FR',
            file: 'fr-FR.json',
          },
        ],
      },
    ],
    // Doc: https://bootstrap-vue.js.org
    'bootstrap-vue/nuxt',
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // Doc: https://github.com/nuxt-community/dotenv-module
    '@nuxtjs/dotenv',
    // Doc: https://github.com/microcipcip/cookie-universal
    'cookie-universal-nuxt',
  ],
  /*
   ** Axios module configuration
   ** See https://axios.nuxtjs.org/options
   */
  axios: {
    proxy: true,
    credentials: true,
    proxyHeaders: true,
  },

  /*
   ** Build configuration
   */
  build: {
    transpile: ['@nuxtjs/auth'],
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {},
  },

  serverMiddleware: [
    json({ limit: '10mb' }),
    {
      path: '/api',
      handler: '~/api/api.js',
    },
    {
      path: '/fs/base64',
      handler: '~/api/fs/base64.js',
    },
    {
      path: '/fs/browseElements',
      handler: '~/api/fs/browseElements.js',
    },
    {
      path: '/fs/save',
      handler: '~/api/fs/saveEdge.js',
    },
    {
      path: '/fs/text',
      handler: '~/api/fs/text.js',
    },
    {
      path: '/fs/upload',
      handler: '~/api/fs/upload.js',
    },
    {
      path: '/fs/upload-base64',
      handler: '~/api/fs/upload-base64.js',
    },
  ],
}
