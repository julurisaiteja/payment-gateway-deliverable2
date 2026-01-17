const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/sdk/PaymentGateway.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'checkout.js',
    library: 'PaymentGateway',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env']]
          }
        }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
