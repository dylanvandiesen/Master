const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const projects = require('./src/data/projects.json');

function toPublicAssetPath(file, publicPath = '/') {
	const basePath = publicPath && publicPath !== 'auto' ? publicPath : '/';

	if (/^(?:[a-z]+:)?\/\//i.test(file) || file.startsWith('/')) {
		return file;
	}

	return `${basePath.replace(/\/?$/, '/')}${file}`.replace(/([^:]\/)\/+/g, '$1');
}

function getEntrypointFiles(compilation, name, extensionPattern) {
	const entrypoint = compilation.entrypoints.get(name);

	if (!entrypoint) {
		return [];
	}

	const publicPath = compilation.options.output.publicPath;
	const files = entrypoint.getFiles().filter((file) => extensionPattern.test(file));

	return [...new Set(files.map((file) => toPublicAssetPath(file, publicPath)))];
}

class RemoveDistArtifactsPlugin {
	constructor(paths = []) {
		this.paths = paths;
	}

	apply(compiler) {
		compiler.hooks.afterEmit.tap('RemoveDistArtifactsPlugin', () => {
			for (const relativePath of this.paths) {
				const targetPath = path.resolve(compiler.options.output.path, relativePath);
				fs.rmSync(targetPath, { force: true });
			}
		});
	}
}

module.exports = (
	env,
	argv) => {
	const prod = argv.mode === 'production';

	return {
		entry: {
			preloader: ['./src/js/preloader.js', './src/scss/preloader.scss'],
			main: ['./src/js/index.js', './src/scss/index.scss'],
		},
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: prod ? 'js/[name].[contenthash].js' : 'js/[name].js',
			assetModuleFilename: 'assets/[hash][ext][query]',
			clean: prod,
			publicPath: '/'
		},
		devtool: prod ? false : 'eval-source-map',
		cache: {
			type: 'filesystem',
			buildDependencies: {
				config: [__filename]
			}
		},
		module: {
			rules: [
				// Responsive images
				...(prod
				?
					[
						{
							test: /\.(jpe?g|png|webp|avif)$/i,
							resourceQuery: /sizes\[]=/,
							use: [
								{
									loader: 'responsive-loader',
									options: {
										adapter: require('responsive-loader/sharp'),
										sizes: [480, 640, 960, 1200, 1440, 1600, 1920, 2560, 3840],
										quality: 70,
										name: 'images/[name]-[width].[hash:8].[ext]',
										
									}
								}
							],
							generator: {
								filename: (pathData) => {
									const relPath = pathData.filename.split('src/images/')[1];
									return relPath ? `images/${relPath}` : 'images/[name][ext]';
								}
							},
							
							// include: path.resolve(__dirname, 'src/images'),
							// exclude: path.resolve(__dirname, 'src/images/icons')
						}
					]
					: []
				),
				{
					test: /\.s[ac]ss$/i,
					use: [
						prod ? {
							loader: MiniCssExtractPlugin.loader,
						} : 'style-loader',
						'css-loader',
						{
							loader: 'sass-loader',
							options: {
								implementation: require("sass"),
								sassOptions: {
									quietDeps: true,
								},
							},
						}
					]
				},
				{
					test: /\.html$/i,
					loader: 'html-loader',
					options: {
						sources: false
					}
				},
				{
					test: /\.(png|jpe?g|gif|svg|avif|webp)$/i,
					resourceQuery: {
						not: [/sizes\[]=/]
					},
					type: 'asset',
					parser: {
						dataUrlCondition: {
							maxSize: 0
							// maxSize: 8 * 1024 // 8kb
						}
					},
					generator: {
							filename: (pathData) => {
									const relPath = pathData.filename.split('src/images/')[1];
									return relPath ? `images/${relPath}` : 'images/[name][ext]';
							}
					}
				},
				{
					test: /\.(mp4|webm|ogg)$/i,
					type: 'asset/resource',
					generator: {
						filename: 'videos/[path][name][ext]',
						context: path.resolve(__dirname, 'src/videos')
					}
				},
				{
					test: /\.(woff2?|eot|ttf|otf)$/i,
					type: 'asset/resource',
					generator: {
						filename: (pathData) => {
							const path = pathData.filename;
							// Handle other font files
							return path.replace('src/', '');
						}
					}
				},
				{
					test: /\.svg$/,
					type: 'asset'
				}
			]
		},
		plugins: [
			new WebpackManifestPlugin({
				fileName: 'manifest.json',
				filter: (file) => file.name?.startsWith('preloader') || file.name?.endsWith('.css')
			}),
			new HtmlWebpackPlugin({
				template: './src/index.ejs',
				filename: 'index.html',
				minify: prod
					? {
						removeAttributeQuotes: true,
						collapseWhitespace: true,
						removeComments: true
					}
					: false,
				scriptLoading: 'defer',
				inject: false,
				chunks: ['main', 'vendors'],
				chunksSortMode: 'manual',
				templateParameters: (compilation, assets, assetTags, options) => {
					const preloaderStyles = getEntrypointFiles(compilation, 'preloader', /\.css$/i);
					const preloaderScripts = getEntrypointFiles(compilation, 'preloader', /\.js$/i);
					const mainStyles = getEntrypointFiles(compilation, 'main', /\.css$/i);
					const mainScripts = getEntrypointFiles(compilation, 'main', /\.js$/i)
						.filter((file) => !preloaderScripts.includes(file));

					return {
						publicPath: compilation.options.output.publicPath,
						webpackConfig: compilation.options,
						isProduction: prod,
						isDevelopment: !prod,
						projects,
						preloaderStyles,
						preloaderScripts,
						mainStyles,
						mainScripts,
						...options
					};
				}


			}),

			new MiniCssExtractPlugin({
				filename: (pathData) => prod
					? `css/${pathData.chunk.name}.[contenthash].css`
					: `css/${pathData.chunk.name}.css`
			}),
			...(prod
				? [
					new CompressionPlugin({
						test: /\.(js|json|css|html|svg|json|woff2?|ttf|eot|ico|png|jpg|jpeg|gif|webp|avif)$/, 
						threshold: 0, // compress all sizes
						minRatio: 0.8,
						algorithm: 'gzip',
					}),
					new CompressionPlugin({
						filename: '[path][base].br',
						algorithm: 'brotliCompress',
						test: /\.(js|json|css|html|svg|woff2?)$/,
						threshold: 0,
						minRatio: 0.8,
						compressionOptions: {
							level: 11,
						},
					}),
					new CopyWebpackPlugin({
						patterns: [
							{
								from: path.resolve(__dirname, 'src/images'),
								to: path.resolve(__dirname, 'dist/images'),
								noErrorOnMissing: true,
								globOptions: {
									ignore: ['**/Thumbs.db', '**/.DS_Store']
								}
							},
							{
								from: path.resolve(__dirname, 'src/videos'),
								to: path.resolve(__dirname, 'dist/videos'),
								noErrorOnMissing: true
							},
							{
								from: path.resolve(__dirname, 'src/favicons'),
								to: path.resolve(__dirname, 'dist/favicons'),
								noErrorOnMissing: true
							},
							{
								from: path.resolve(__dirname, 'src/fonts'),
								to: path.resolve(__dirname, 'dist/fonts'),
								noErrorOnMissing: true
							},
							{
								from: path.resolve(__dirname, 'src/.htaccess'),
								to: path.resolve(__dirname, 'dist'),
								noErrorOnMissing: true,
								force: true
							}
						]
					}),
					new RemoveDistArtifactsPlugin([
						'images/portfolio/Thumbs.db',
						'images/.DS_Store'
					])
				]
				: [])
		],
		devServer: {
			static: [
				{
					directory: path.resolve(__dirname, 'src'),
					publicPath: '/'
				},
				{
					directory: path.resolve(__dirname, 'dist'),
					publicPath: '/'
				}
			],
			host: 'local-ip',
			port: 9000,
			open: true,
			hot: false,
			liveReload: true,
			compress: true,
			headers: {
				'Access-Control-Allow-Origin': '*'
			},
			watchFiles: ['src/**/*'],
			client: {
				overlay: {
					errors: true,
					warnings: false
				}
			},
			devMiddleware: {
				writeToDisk: false
			},
			historyApiFallback: true
		},
		optimization: {
			minimize: prod,
			moduleIds: 'deterministic',
			runtimeChunk: 'single',
			splitChunks: {
				chunks: 'all',
				cacheGroups: {
					vendor: {
						test: /[\\/]node_modules[\\/]/,
						name: 'vendors',
						chunks: 'all'
					}
				}
			},
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						compress: {
							passes: 2,
							pure_funcs: [
								'console.log',
								'console.info',
								'console.group',
								'console.groupEnd',
								'console.debug'
							]
						},
						format: {
							comments: false,
						},
					},
					extractComments: false,
				}),
				new CssMinimizerPlugin(),
			],
		},
		performance: {
			hints: prod ? 'warning' : false,
			maxAssetSize: 512000,
			maxEntrypointSize: 512000
		},
		stats: {
			modules: false,
			children: false,
			assets: prod
		}
	};
};
