const path = require('path');
const webpack = require('../tools/test/node_modules/webpack');

module.exports = {
	mode: 'none',
	entry: path.resolve(__dirname, 'utils', 'index.ts'),
	output: {
		path: path.resolve(__dirname, '..', 'example', 'util'),
		filename: 'data-util.js',
		libraryTarget: 'window'
	},
	resolve: {
		extensions: ['.ts']
	},
	module: {
		rules: [{
			test: /\.ts$/,
			loader: 'ts-loader'
		}]
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: `
/**
 * utility functions compiled from:
 * <libflacjs>/src/util/*.ts
 */
`,
			entryOnly: true,
			raw: true
		})
	]
};
