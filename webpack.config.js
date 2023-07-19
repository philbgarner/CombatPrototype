import { URL } from 'url'

const __dirname = new URL('.', import.meta.url).pathname.slice(1)

export default {
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: __dirname + 'dist',
    library: {
        name: 'scene',
        type: 'umd'
    }
  },
  devtool: 'source-map',
  externals: ['bfontjs', 'imui', 'gameControl', 'font']
}