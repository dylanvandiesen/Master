const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const manifestOptions = {
    fileName: 'manifest.json',
    filter: (file) => file.name.startsWith('preloader')
};

module.exports = (env, argv) => {
    const prod = argv.mode === 'production';

    return {
        entry: {
            preloader: './src/js/preloader.js',
            main: './src/js/index.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: prod ? 'js/[name].[contenthash].js' : 'js/[name].js',
            assetModuleFilename: 'assets/[hash][ext][query]',
            publicPath: prod ? '' : '/' 
        },
        devtool: prod ? 'source-map' : 'eval-source-map',
        cache: {
            type: 'filesystem',
            buildDependencies: {
                config: [__filename]
            }
        },
        module: {
            rules: [
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        prod ? {
                            loader: MiniCssExtractPlugin.loader,
                            options: {
                                publicPath: '../'
                            }
                        } : 'style-loader',
                        'css-loader',
                        {
                            loader: 'sass-loader',
                            options: {
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
                    type: 'asset',
                    parser: {
                        dataUrlCondition: {
                            maxSize: 8 * 1024 // 8kb
                        }
                    },
                    generator: {
                        filename: (pathData) => {
                            // Remove 'src/' from the path
                            const path = pathData.filename.replace('src/', '');
                            return path;
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
            new WebpackManifestPlugin(manifestOptions),
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
                inject: 'body',
                chunks: ['vendors', 'main'],
                chunksSortMode: 'manual',
                templateParameters: (compilation, assets, assetTags, options) => {
                    let manifest = {};
                    const manifestPath = path.resolve(__dirname, 'dist/manifest.json');
                    if (fs.existsSync(manifestPath)) {
                        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    }
                    return {
                        publicPath: compilation.options.output.publicPath,
                        manifest,
                        ...options
                    };
                }
            }),
              
            new MiniCssExtractPlugin({
                filename: prod ? 'css/[name].[contenthash].css' : 'css/[name].css'
            }),
            new CleanWebpackPlugin(),
            ...(prod
                ? [
                      new CompressionPlugin(),
                      new CopyWebpackPlugin({
                          patterns: [
                              {
                                  from: path.resolve(__dirname, 'src/images'),
                                  to: path.resolve(__dirname, 'dist/images'),
                                  noErrorOnMissing: true
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
                                noErrorOnMissing: true
                            }
                          ]
                      })
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
            hot: true,
            liveReload: false,
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
                writeToDisk: true
            }
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
                        format: {
                            comments: false,
                        },
                    },
                    extractComments: false,
                }),
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