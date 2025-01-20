const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,

  configureWebpack: {
    'resolve': {
      fallback: {
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "util": require.resolve("util/"),
        "stream": require.resolve("stream-browserify"),
        "url": require.resolve("url/"),
        "assert": require.resolve("assert/"),
        "zlib": require.resolve("browserify-zlib")
      }
    }
  }
})

module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/fms-web-app/'
    : '/'
}