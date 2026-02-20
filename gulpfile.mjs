import { src, dest, watch } from 'gulp';
import * as sass from 'sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cleanCSS from 'gulp-clean-css';
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';
import through2 from 'through2';
import sharp from 'sharp';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import { rm, mkdir, readdir, readFile, writeFile, rename as movePath } from 'fs/promises';
import fs from 'fs';
import { createServer as createHttpServer } from 'http';
import { join, dirname, extname, resolve as resolvePath, relative as relativePath } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createServer as createNetServer } from 'net';
import { spawn } from 'child_process';
import livereload from 'gulp-livereload';

const __dirname = dirname(fileURLToPath(import.meta.url));
const requireFromHere = createRequire(import.meta.url);
const AGENCY_CONFIG_FILE = join(__dirname, 'agency.config.json');
const DASHBOARD_FILE = join(__dirname, 'dist', 'index.html');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const DEFAULT_AGENCY_CONFIG = {
  projectsDir: 'projects',
  distDir: 'dist/projects',
  activeProject: '',
  dev: {
    mode: 'single',
    livereloadPort: 35729,
    maxPortAttempts: 20
  },
  server: {
    host: '127.0.0.1',
    startPort: 5173,
    maxPortAttempts: 50,
    indexFile: 'index.html',
    spaFallback: true,
    autoGenerateManifest: true,
    manifestDir: '.agency/dev-servers'
  },
  scaffold: {
    enabled: true,
    templateDir: 'templates/project',
    migrateLegacyLayout: true
  },
  build: {
    minify: true,
    sourcemaps: true
  },
  styles: {
    entries: ['src/scss/main.scss'],
    loadPaths: ['src/scss']
  },
  scripts: {
    engine: 'esbuild',
    mode: 'dual',
    entries: ['src/js/main.js'],
    legacyEntries: ['src/js/**/*.js', 'src/js/**/*.mjs'],
    legacyOutputName: 'main.js',
    target: 'es2018',
    format: 'iife',
    platform: 'browser'
  },
  watch: {
    project: ['**/*'],
    debounceMs: 200
  },
  images: {
    pattern: 'src/images/**/*',
    jpgQuality: 80,
    webpQuality: 80,
    pngCompressionLevel: 9
  },
  static: {
    html: 'src/**/*.html',
    fonts: 'src/fonts/**/*',
    docs: 'src/docs/**/*',
    misc: 'src/static/**/*'
  },
  vendor: {
    scripts: [
      'node_modules/gsap/dist/gsap.min.js',
      'node_modules/gsap/dist/ScrollTrigger.min.js',
      'node_modules/gsap/dist/ScrollSmoother.min.js'
    ]
  },
  projectDefaults: {
    styles: {
      entries: ['src/scss/main.scss']
    },
    scripts: {
      engine: 'esbuild',
      entries: ['src/js/main.js'],
      legacyEntries: ['src/js/**/*.js', 'src/js/**/*.mjs']
    },
    watch: {
      extra: []
    },
    vendor: {
      scripts: []
    }
  }
};

const REQUIRED_SOURCE_DIRS = [
  'src',
  'src/scss',
  'src/js',
  'src/images',
  'src/fonts',
  'src/docs',
  'src/static'
];

const LEGACY_DIR_MIGRATION = {
  scss: 'src/scss',
  js: 'src/js',
  images: 'src/images',
  fonts: 'src/fonts',
  docs: 'src/docs',
  favicons: 'src/images/favicons'
};

let warnedUnsupportedImageFormat = false;
let liveReloadStarted = false;
let esbuildModulePromise = null;
let esbuildCliPath = null;
let esbuildApiBlockedByPolicy = false;
let esbuildCliFallbackNotified = false;
const preferEsbuildCliShim =
  process.platform === 'win32' && String(process.env.AGENCY_ESBUILD_PREFER_API || '').toLowerCase() !== '1';
const activeHttpServers = [];

function toPosixPath(value) {
  return String(value).replace(/\\/g, '/');
}

function exists(pathValue) {
  return fs.existsSync(pathValue);
}

async function ensureDir(pathValue) {
  await mkdir(pathValue, { recursive: true });
}

function getMimeType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function isFilePath(pathValue) {
  try {
    return fs.statSync(pathValue).isFile();
  } catch {
    return false;
  }
}

function isDirectoryPath(pathValue) {
  try {
    return fs.statSync(pathValue).isDirectory();
  } catch {
    return false;
  }
}

function isPathInside(parentPath, childPath) {
  const relative = relativePath(resolvePath(parentPath), resolvePath(childPath));
  return relative === '' || (!relative.startsWith('..') && !relative.includes(':'));
}

function resolveServedFile(rootDir, pathname, indexFile, spaFallback) {
  const requestedPath = resolvePath(rootDir, pathname.replace(/^\/+/, ''));
  if (!isPathInside(rootDir, requestedPath)) return '';

  let candidate = requestedPath;
  if (isDirectoryPath(candidate)) {
    candidate = join(candidate, indexFile);
  }

  if (isFilePath(candidate)) return candidate;

  if (spaFallback) {
    const fallbackPath = join(rootDir, indexFile);
    if (isFilePath(fallbackPath)) return fallbackPath;
  }

  return '';
}

async function writeDevServerManifest(agencyConfig, payload) {
  if (!agencyConfig.server.autoGenerateManifest) return;

  const manifestDir = join(__dirname, agencyConfig.server.manifestDir || '.agency/dev-servers');
  await ensureDir(manifestDir);
  const manifestFile = join(manifestDir, `${payload.id}.json`);
  await writeFile(
    manifestFile,
    `${JSON.stringify({ ...payload, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  );
}

async function startStaticDevServer(agencyConfig, options) {
  const host = String(agencyConfig.server.host || '127.0.0.1');
  const requestedPort =
    Number(options.port) ||
    Number(getCliArg('port')) ||
    Number(process.env.DEV_PORT) ||
    Number(agencyConfig.server.startPort) ||
    5173;
  const maxAttempts = Number(agencyConfig.server.maxPortAttempts) || 50;
  const indexFile = String(agencyConfig.server.indexFile || 'index.html');
  const spaFallback = Boolean(agencyConfig.server.spaFallback);
  const port = await findOpenPort(requestedPort, maxAttempts, host);

  if (port === null) {
    throw new Error(`No open port available from ${requestedPort} to ${requestedPort + maxAttempts - 1}`);
  }

  const rootDir = options.rootDir;
  const server = createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const filePath = resolveServedFile(rootDir, decodeURIComponent(url.pathname), indexFile, spaFallback);
      if (!filePath) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not Found');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', getMimeType(filePath));
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(filePath).on('error', () => {
        res.statusCode = 500;
        res.end('Server Error');
      }).pipe(res);
    } catch {
      res.statusCode = 400;
      res.end('Bad Request');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  const publicUrl = `http://${displayHost}:${port}/`;
  activeHttpServers.push(server);

  await writeDevServerManifest(agencyConfig, {
    id: options.id,
    mode: options.mode,
    project: options.project || '',
    rootDir: toPosixPath(rootDir),
    host,
    port,
    url: publicUrl
  });

  console.log(`[agency] dev server (${options.mode}) -> ${publicUrl}`);
  return { server, port, url: publicUrl };
}

function getCliArg(name) {
  const flag = `--${name}`;
  const index = process.argv.findIndex((arg) => arg === flag || arg.startsWith(`${flag}=`));
  if (index === -1) return '';

  const matched = process.argv[index];
  if (matched.startsWith(`${flag}=`)) {
    return matched.slice(flag.length + 1).trim();
  }

  const nextArg = process.argv[index + 1];
  if (!nextArg || nextArg.startsWith('--')) return '';
  return nextArg.trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim() !== '');
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value.trim()];
  }
  return [];
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    const cloned = {};
    for (const [key, item] of Object.entries(value)) {
      cloned[key] = cloneValue(item);
    }
    return cloned;
  }
  return value;
}

function deepMerge(base, override) {
  const output = cloneValue(base || {});
  if (!override || typeof override !== 'object') return output;

  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      output[key] = [...value];
      continue;
    }

    if (value && typeof value === 'object') {
      const baseValue = output[key];
      output[key] = deepMerge(
        baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue) ? baseValue : {},
        value
      );
      continue;
    }

    output[key] = value;
  }

  return output;
}

function slugify(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

async function readJsonIfExists(pathValue) {
  if (!exists(pathValue)) return null;
  try {
    const raw = await readFile(pathValue, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[agency] Failed to parse JSON: ${toPosixPath(pathValue)} (${error.message})`);
    return null;
  }
}

async function loadAgencyConfig() {
  const fileConfig = await readJsonIfExists(AGENCY_CONFIG_FILE);
  return deepMerge(DEFAULT_AGENCY_CONFIG, fileConfig || {});
}

function renderTemplate(content, replacements) {
  let rendered = content;
  for (const [token, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(token, value);
  }
  return rendered;
}

function makeDefaultProjectConfig(projectName, agencyConfig) {
  return {
    title: projectName,
    slug: slugify(projectName),
    styles: {
      entries: normalizeArray(agencyConfig.styles.entries),
      loadPaths: normalizeArray(agencyConfig.styles.loadPaths)
    },
    scripts: {
      engine: agencyConfig.scripts.engine || 'esbuild',
      entries: normalizeArray(agencyConfig.scripts.entries),
      legacyEntries: normalizeArray(agencyConfig.scripts.legacyEntries),
      legacyOutputName: agencyConfig.scripts.legacyOutputName || 'main.js',
      target: agencyConfig.scripts.target || 'es2018',
      format: agencyConfig.scripts.format || 'iife',
      platform: agencyConfig.scripts.platform || 'browser'
    },
    images: {
      pattern: agencyConfig.images.pattern || 'src/images/**/*'
    },
    static: {
      html: normalizeArray(agencyConfig.static.html),
      fonts: normalizeArray(agencyConfig.static.fonts),
      docs: normalizeArray(agencyConfig.static.docs),
      misc: normalizeArray(agencyConfig.static.misc)
    },
    watch: {
      project: normalizeArray(agencyConfig.watch.project),
      extra: []
    },
    vendor: {
      scripts: normalizeArray(agencyConfig.vendor.scripts)
    }
  };
}

async function writeTemplateIfMissing(templatePath, destinationPath, replacements, fallbackContent) {
  if (exists(destinationPath)) return false;

  let content = fallbackContent;
  if (exists(templatePath)) {
    const template = await readFile(templatePath, 'utf8');
    content = renderTemplate(template, replacements);
  }

  await ensureDir(dirname(destinationPath));
  await writeFile(destinationPath, content, 'utf8');
  return true;
}

async function migrateLegacyLayout(projectName, projectDir, agencyConfig) {
  if (!agencyConfig.scaffold.migrateLegacyLayout) return;

  for (const [legacyDirName, targetRelativePath] of Object.entries(LEGACY_DIR_MIGRATION)) {
    const legacyPath = join(projectDir, legacyDirName);
    const targetPath = join(projectDir, targetRelativePath);

    if (!exists(legacyPath)) continue;

    if (!exists(targetPath)) {
      await ensureDir(dirname(targetPath));
      await movePath(legacyPath, targetPath);
      console.log(
        `[agency:${projectName}] migrated ${toPosixPath(legacyDirName)} -> ${toPosixPath(targetRelativePath)}`
      );
      continue;
    }

    console.warn(
      `[agency:${projectName}] skipped legacy folder ${toPosixPath(
        legacyDirName
      )} because ${toPosixPath(targetRelativePath)} already exists`
    );
  }
}

async function ensureProjectScaffold(projectName, projectDir, agencyConfig) {
  if (!agencyConfig.scaffold.enabled) return;

  await migrateLegacyLayout(projectName, projectDir, agencyConfig);

  for (const relativeDir of REQUIRED_SOURCE_DIRS) {
    await ensureDir(join(projectDir, relativeDir));
  }

  const templateRoot = join(__dirname, agencyConfig.scaffold.templateDir);
  const projectSlug = slugify(projectName);
  const replacements = {
    __PROJECT_NAME__: projectName,
    __PROJECT_SLUG__: projectSlug
  };

  const defaultProjectConfig = makeDefaultProjectConfig(projectName, agencyConfig);

  await writeTemplateIfMissing(
    join(templateRoot, 'project.config.json'),
    join(projectDir, 'project.config.json'),
    replacements,
    `${JSON.stringify(defaultProjectConfig, null, 2)}\n`
  );

  await writeTemplateIfMissing(
    join(templateRoot, 'src', 'scss', 'main.scss'),
    join(projectDir, 'src', 'scss', 'main.scss'),
    replacements,
    `:root {\n  --project-name: "${projectName}";\n}\n\nbody {\n  margin: 0;\n  font-family: Arial, sans-serif;\n}\n`
  );

  await writeTemplateIfMissing(
    join(templateRoot, 'src', 'js', 'main.js'),
    join(projectDir, 'src', 'js', 'main.js'),
    replacements,
    `console.log('[agency] ${projectName} ready');\n`
  );

  await writeTemplateIfMissing(
    join(templateRoot, 'src', 'index.html'),
    join(projectDir, 'src', 'index.html'),
    replacements,
    `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>${projectName}</title>\n  <link rel="stylesheet" href="./css/main.min.css" />\n</head>\n<body>\n  <h1>${projectName}</h1>\n  <script src="./js/main.min.js"></script>\n</body>\n</html>\n`
  );
}

async function loadProjectConfig(projectName, projectDir, agencyConfig) {
  const fileConfig = (await readJsonIfExists(join(projectDir, 'project.config.json'))) || {};
  const merged = deepMerge(makeDefaultProjectConfig(projectName, agencyConfig), fileConfig);

  merged.title = merged.title || projectName;
  merged.slug = slugify(merged.slug || projectName);
  merged.styles = merged.styles || {};
  merged.styles.entries = normalizeArray(merged.styles.entries);
  merged.styles.loadPaths = normalizeArray(merged.styles.loadPaths);

  merged.scripts = merged.scripts || {};
  merged.scripts.engine = String(merged.scripts.engine || agencyConfig.scripts.engine || 'legacy').toLowerCase();
  merged.scripts.entries = normalizeArray(merged.scripts.entries);
  merged.scripts.legacyEntries = normalizeArray(merged.scripts.legacyEntries);
  merged.scripts.legacyOutputName = merged.scripts.legacyOutputName || agencyConfig.scripts.legacyOutputName || 'main.js';
  merged.scripts.target = merged.scripts.target || agencyConfig.scripts.target || 'es2018';
  merged.scripts.format = merged.scripts.format || agencyConfig.scripts.format || 'iife';
  merged.scripts.platform = merged.scripts.platform || agencyConfig.scripts.platform || 'browser';

  merged.images = merged.images || {};
  merged.images.pattern = merged.images.pattern || agencyConfig.images.pattern || 'src/images/**/*';

  merged.static = merged.static || {};
  merged.static.html = normalizeArray(merged.static.html);
  merged.static.fonts = normalizeArray(merged.static.fonts);
  merged.static.docs = normalizeArray(merged.static.docs);
  merged.static.misc = normalizeArray(merged.static.misc);

  merged.watch = merged.watch || {};
  merged.watch.project = normalizeArray(merged.watch.project);
  merged.watch.extra = normalizeArray(merged.watch.extra);

  merged.vendor = merged.vendor || {};
  merged.vendor.scripts = normalizeArray(merged.vendor.scripts);

  return merged;
}

async function discoverProjectFolders(agencyConfig) {
  const projectsRoot = join(__dirname, agencyConfig.projectsDir);
  await ensureDir(projectsRoot);

  const entries = await readdir(projectsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      dir: join(projectsRoot, entry.name)
    }));
}

function createProjectContext(projectName, projectDir, agencyConfig, projectConfig) {
  return {
    name: projectName,
    slug: slugify(projectConfig.slug || projectName),
    rootDir: projectDir,
    srcDir: join(projectDir, 'src'),
    distDir: join(__dirname, agencyConfig.distDir, slugify(projectConfig.slug || projectName)),
    config: projectConfig,
    agency: agencyConfig
  };
}

async function prepareProjectContext(projectName, projectDir, agencyConfig) {
  await ensureProjectScaffold(projectName, projectDir, agencyConfig);
  const projectConfig = await loadProjectConfig(projectName, projectDir, agencyConfig);
  return createProjectContext(projectName, projectDir, agencyConfig, projectConfig);
}

async function getProjectState() {
  const agencyConfig = await loadAgencyConfig();
  const folders = await discoverProjectFolders(agencyConfig);
  const contexts = [];

  for (const folder of folders) {
    const context = await prepareProjectContext(folder.name, folder.dir, agencyConfig);
    contexts.push(context);
  }

  return { agencyConfig, contexts };
}

function findProjectContext(contexts, identifier) {
  const query = String(identifier || '').trim().toLowerCase();
  if (!query) return null;
  return contexts.find(
    (project) => project.name.toLowerCase() === query || project.slug.toLowerCase() === query
  );
}

function resolveRequestedProject(agencyConfig) {
  return (
    getCliArg('project') ||
    process.env.PROJECT ||
    agencyConfig.activeProject ||
    ''
  );
}

function selectActiveProject(contexts, agencyConfig) {
  if (!contexts.length) return null;
  const requested = resolveRequestedProject(agencyConfig);
  if (!requested) return contexts[0];

  const match = findProjectContext(contexts, requested);
  if (match) return match;

  console.warn(`[agency] Requested project "${requested}" not found; defaulting to "${contexts[0].name}".`);
  return contexts[0];
}

function runStream(stream) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler) => {
      if (settled) return;
      settled = true;
      handler();
    };

    stream.on('error', (error) => finish(() => reject(error)));
    stream.on('finish', () => finish(resolve));
    stream.on('end', () => finish(resolve));
  });
}

function resolvePatterns(project, patterns) {
  return normalizeArray(patterns).map((pattern) => toPosixPath(join(project.rootDir, pattern)));
}

function getStyleLoadPaths(project) {
  const mergedLoadPaths = new Set([
    ...normalizeArray(project.agency.styles.loadPaths),
    ...normalizeArray(project.config.styles.loadPaths)
  ]);

  if (!mergedLoadPaths.size) {
    mergedLoadPaths.add('src/scss');
  }

  return [...mergedLoadPaths].map((value) => join(project.rootDir, value));
}

async function buildStylesForProject(project) {
  const entries = resolvePatterns(project, project.config.styles.entries);
  if (!entries.length) return;

  await ensureDir(join(project.distDir, 'css'));

  const stream = src(entries, { allowEmpty: true })
    .pipe(plumber())
    .pipe(
      through2.obj(function compileSass(file, _enc, cb) {
        if (!file.isBuffer()) {
          cb(null, file);
          return;
        }

        try {
          const result = sass.compile(file.path, {
            style: 'expanded',
            loadPaths: getStyleLoadPaths(project)
          });
          file.contents = Buffer.from(result.css);
          cb(null, file);
        } catch (error) {
          cb(error);
        }
      })
    )
    .pipe(postcss([autoprefixer()]))
    .pipe(cleanCSS())
    .pipe(rename({ suffix: '.min', extname: '.css' }))
    .pipe(dest(toPosixPath(join(project.distDir, 'css'))))
    .pipe(livereload());

  await runStream(stream);
}

async function getEsbuildModule() {
  if (esbuildModulePromise !== null) return esbuildModulePromise;

  esbuildModulePromise = import('esbuild')
    .then((module) => module)
    .catch(() => null);

  return esbuildModulePromise;
}

function isSpawnEpermError(error) {
  if (String(error?.code || '').toUpperCase() === 'EPERM') return true;
  return /spawn\s+eperm/i.test(String(error?.message || error || ''));
}

function getEsbuildCliPath() {
  if (esbuildCliPath !== null) return esbuildCliPath;
  try {
    esbuildCliPath = requireFromHere.resolve('esbuild/bin/esbuild');
  } catch {
    esbuildCliPath = '';
  }
  return esbuildCliPath;
}

async function runCommandWithInheritedStdio(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code ?? 'null'}${signal ? `, signal ${signal}` : ''})`));
    });
  });
}

async function buildEsbuildScriptsViaCli(project, entries) {
  const cliPath = getEsbuildCliPath();
  if (!cliPath) return false;

  const args = [
    cliPath,
    ...entries,
    '--bundle',
    `--outdir=${join(project.distDir, 'js')}`,
    `--target=${project.config.scripts.target || 'es2018'}`,
    `--format=${project.config.scripts.format || 'iife'}`,
    `--platform=${project.config.scripts.platform || 'browser'}`,
    '--entry-names=[name].min',
    '--log-level=warning'
  ];

  if (Boolean(project.agency.build.minify)) args.push('--minify');
  if (Boolean(project.agency.build.sourcemaps)) args.push('--sourcemap');

  await runCommandWithInheritedStdio(process.execPath, args, process.cwd());
  livereload.reload();
  return true;
}

async function tryEsbuildCliShimWithFallback(project, entries, apiErrorMessage = '') {
  try {
    const usedCliShim = await buildEsbuildScriptsViaCli(project, entries);
    if (usedCliShim && apiErrorMessage && !esbuildCliFallbackNotified) {
      console.log(
        `[agency:${project.slug}] esbuild API is blocked (${apiErrorMessage}); using CLI path for this session.`
      );
      esbuildCliFallbackNotified = true;
    }
    return usedCliShim;
  } catch (cliError) {
    if (String(project.agency.scripts.mode || '').toLowerCase() === 'dual') {
      const reason = apiErrorMessage
        ? `esbuild API failed (${apiErrorMessage}) and CLI shim failed (${cliError.message}); falling back to legacy scripts.`
        : `esbuild CLI shim failed (${cliError.message}); falling back to legacy scripts.`;
      console.warn(`[agency:${project.slug}] ${reason}`);
      await buildLegacyScriptsForProject(project);
      return true;
    }
    throw cliError;
  }
}

async function buildLegacyScriptsForProject(project) {
  const patterns = resolvePatterns(project, project.config.scripts.legacyEntries);
  if (!patterns.length) return;

  await ensureDir(join(project.distDir, 'js'));

  const stream = src(patterns, { allowEmpty: true })
    .pipe(plumber())
    .pipe(concat(project.config.scripts.legacyOutputName || 'main.js'))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(toPosixPath(join(project.distDir, 'js'))))
    .pipe(livereload());

  await runStream(stream);
}

async function buildEsbuildScriptsForProject(project) {
  const entries = project.config.scripts.entries
    .map((entry) => join(project.rootDir, entry))
    .filter((entry) => exists(entry));

  if (!entries.length) return;

  const esbuildModule = await getEsbuildModule();
  if (!esbuildModule) {
    console.warn(`[agency:${project.slug}] esbuild is unavailable; falling back to legacy scripts.`);
    await buildLegacyScriptsForProject(project);
    return;
  }

  await ensureDir(join(project.distDir, 'js'));

  if (preferEsbuildCliShim || esbuildApiBlockedByPolicy) {
    const usedCliShim = await tryEsbuildCliShimWithFallback(project, entries);
    if (usedCliShim) return;
  }

  try {
    await esbuildModule.build({
      entryPoints: entries,
      outdir: join(project.distDir, 'js'),
      bundle: true,
      minify: Boolean(project.agency.build.minify),
      sourcemap: Boolean(project.agency.build.sourcemaps),
      target: project.config.scripts.target || 'es2018',
      format: project.config.scripts.format || 'iife',
      platform: project.config.scripts.platform || 'browser',
      entryNames: '[name].min',
      logLevel: 'silent'
    });
    livereload.reload();
  } catch (error) {
    if (isSpawnEpermError(error)) {
      esbuildApiBlockedByPolicy = true;
      const usedCliShim = await tryEsbuildCliShimWithFallback(project, entries, error.message);
      if (usedCliShim) return;
    }

    if (String(project.agency.scripts.mode || '').toLowerCase() === 'dual') {
      console.warn(
        `[agency:${project.slug}] esbuild failed (${error.message}); falling back to legacy scripts.`
      );
      await buildLegacyScriptsForProject(project);
      return;
    }
    throw error;
  }
}

async function buildScriptsForProject(project) {
  const engine = String(project.config.scripts.engine || 'legacy').toLowerCase();
  if (engine === 'legacy') {
    await buildLegacyScriptsForProject(project);
    return;
  }
  await buildEsbuildScriptsForProject(project);
}

function isUnsupportedImageError(error) {
  return Boolean(
    error &&
    typeof error.message === 'string' &&
    /unsupported image format/i.test(error.message)
  );
}

async function buildImagesForProject(project) {
  const imagePatterns = resolvePatterns(project, [project.config.images.pattern]);
  if (!imagePatterns.length) return;

  const imagesRoot = join(project.rootDir, 'src', 'images');
  if (!exists(imagesRoot)) return;

  await ensureDir(join(project.distDir, 'images'));

  const stream = src(imagePatterns, { allowEmpty: true, base: toPosixPath(imagesRoot) })
    .pipe(plumber())
    .pipe(
      through2.obj(async function optimizeImages(file, _enc, cb) {
        if (!file.isBuffer()) {
          cb(null, file);
          return;
        }

        const ext = extname(file.path).toLowerCase();
        try {
          if (ext === '.jpg' || ext === '.jpeg') {
            file.contents = await sharp(file.contents)
              .jpeg({
                quality: Number(project.agency.images.jpgQuality) || 80,
                progressive: true
              })
              .toBuffer();
          } else if (ext === '.png') {
            file.contents = await sharp(file.contents)
              .png({
                compressionLevel: Number(project.agency.images.pngCompressionLevel) || 9
              })
              .toBuffer();
          } else if (ext === '.webp') {
            file.contents = await sharp(file.contents)
              .webp({
                quality: Number(project.agency.images.webpQuality) || 80
              })
              .toBuffer();
          }
          cb(null, file);
        } catch (error) {
          if (isUnsupportedImageError(error)) {
            if (!warnedUnsupportedImageFormat) {
              warnedUnsupportedImageFormat = true;
              console.warn(
                '[agency] Some images were copied without optimization because sharp does not support their format.'
              );
            }
          } else {
            console.warn(`[agency:${project.slug}] image optimization skipped for ${file.path}: ${error.message}`);
          }
          cb(null, file);
        }
      })
    )
    .pipe(dest(toPosixPath(join(project.distDir, 'images'))))
    .pipe(livereload());

  await runStream(stream);
}

async function copyPatterns(baseDir, patterns, outputDir) {
  if (!exists(baseDir)) return;
  const normalizedPatterns = normalizeArray(patterns);
  if (!normalizedPatterns.length) return;

  const resolvedPatterns = normalizedPatterns.map((pattern) => toPosixPath(join(baseDir, pattern)));
  const stream = src(resolvedPatterns, { allowEmpty: true, base: toPosixPath(baseDir) })
    .pipe(plumber())
    .pipe(dest(toPosixPath(outputDir)))
    .pipe(livereload());

  await runStream(stream);
}

function stripLeadingSrc(pattern) {
  const normalized = String(pattern || '').replace(/\\/g, '/');
  if (normalized.startsWith('src/')) return normalized.slice(4);
  return normalized;
}

async function copyStaticForProject(project) {
  await ensureDir(project.distDir);

  const htmlPatterns = (project.config.static.html.length
    ? project.config.static.html
    : normalizeArray(project.agency.static.html)
  ).map(stripLeadingSrc);

  const fontPatterns = (project.config.static.fonts.length
    ? project.config.static.fonts
    : normalizeArray(project.agency.static.fonts)
  ).map(stripLeadingSrc);

  const docsPatterns = (project.config.static.docs.length
    ? project.config.static.docs
    : normalizeArray(project.agency.static.docs)
  ).map(stripLeadingSrc);

  const miscPatterns = (project.config.static.misc.length
    ? project.config.static.misc
    : normalizeArray(project.agency.static.misc)
  ).map(stripLeadingSrc);

  const uniquePatterns = [...new Set([...htmlPatterns, ...fontPatterns, ...docsPatterns, ...miscPatterns])];
  await copyPatterns(project.srcDir, uniquePatterns, project.distDir);
}

async function copyVendorScriptsForProject(project) {
  const vendorScripts = normalizeArray(project.config.vendor.scripts);
  if (!vendorScripts.length) return;

  const stream = src(vendorScripts.map(toPosixPath), { allowEmpty: true })
    .pipe(plumber())
    .pipe(dest(toPosixPath(join(project.distDir, 'vendor'))))
    .pipe(livereload());

  await runStream(stream);
}

async function buildProject(project, options = {}) {
  if (options.clean) {
    await rm(project.distDir, { recursive: true, force: true }).catch(() => {});
  }

  await ensureDir(project.distDir);
  console.log(
    `[agency:${project.slug}] build -> ${toPosixPath(join(project.agency.distDir, project.slug))}`
  );

  await buildStylesForProject(project);
  await buildScriptsForProject(project);
  await buildImagesForProject(project);
  await copyStaticForProject(project);
  await copyVendorScriptsForProject(project);
}

async function buildAllProjects(contexts, options = {}) {
  if (options.clean) {
    await rm(join(__dirname, 'dist'), { recursive: true, force: true }).catch(() => {});
  }

  for (const project of contexts) {
    await buildProject(project, { clean: false });
  }

  await writeDashboard(contexts);
}

async function writeDashboard(contexts) {
  await ensureDir(dirname(DASHBOARD_FILE));

  const items = contexts
    .map((project) => {
      const href = `./projects/${project.slug}/`;
      return `<li><a href="${href}">${project.config.title}</a><code>${project.slug}</code></li>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Playground Agency</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      min-height: 100vh;
      color: #0f172a;
    }
    .wrap {
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    h1 { margin: 0 0 6px; font-size: clamp(1.7rem, 3vw, 2.25rem); }
    p { margin: 0 0 24px; color: #334155; }
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
    }
    a { color: #0f172a; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    code { color: #475569; font-size: 0.9rem; }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>Playground Agency Dashboard</h1>
    <p>Root-controlled builds are available below.</p>
    <ul>${items}</ul>
  </main>
</body>
</html>
`;

  await writeFile(DASHBOARD_FILE, html, 'utf8');
}

function createRebuildScheduler(task, debounceMs) {
  let timer = null;
  let running = false;
  let rerun = false;

  async function execute() {
    if (running) {
      rerun = true;
      return;
    }

    running = true;
    try {
      await task();
    } catch (error) {
      console.error(`[agency] rebuild error: ${error.message}`);
    } finally {
      running = false;
      if (rerun) {
        rerun = false;
        await execute();
      }
    }
  }

  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      execute().catch((error) => console.error(`[agency] rebuild error: ${error.message}`));
    }, debounceMs);
  };
}

function isPortFree(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findOpenPort(startPort, maxAttempts = 20, host = '0.0.0.0') {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port, host)) {
      return port;
    }
  }
  return null;
}

async function ensureLiveReload(agencyConfig) {
  if (liveReloadStarted) return;

  const preferredPort = Number(agencyConfig.dev.livereloadPort) || 35729;
  const maxAttempts = Number(agencyConfig.dev.maxPortAttempts) || 20;
  const liveReloadPort = await findOpenPort(preferredPort, maxAttempts);

  if (liveReloadPort === null) {
    console.warn(
      `[agency] LiveReload disabled: no open port found from ${preferredPort} to ${preferredPort + maxAttempts - 1}.`
    );
    return;
  }

  livereload.listen({ host: '0.0.0.0', port: liveReloadPort });
  liveReloadStarted = true;

  if (liveReloadPort !== preferredPort) {
    console.warn(`[agency] LiveReload switched from ${preferredPort} to ${liveReloadPort}.`);
  }
}

export async function clean() {
  await rm(join(__dirname, 'dist'), { recursive: true, force: true }).catch(() => {});
  await rm(join(__dirname, '.agency', 'dev-servers'), { recursive: true, force: true }).catch(() => {});
}

export async function scaffold() {
  const { contexts } = await getProjectState();
  if (!contexts.length) {
    console.log('[agency] No projects found under /projects.');
    return;
  }
  console.log(`[agency] Scaffolded ${contexts.length} project(s).`);
}

export async function listProjects() {
  const { contexts } = await getProjectState();
  if (!contexts.length) {
    console.log('[agency] No projects found under /projects.');
    return;
  }

  console.table(
    contexts.map((project) => ({
      name: project.name,
      slug: project.slug,
      jsEngine: project.config.scripts.engine,
      dist: toPosixPath(join(project.agency.distDir, project.slug))
    }))
  );
}

export async function build() {
  const { agencyConfig, contexts } = await getProjectState();
  if (!contexts.length) {
    console.log('[agency] No projects found under /projects.');
    return;
  }

  const project = selectActiveProject(contexts, agencyConfig);
  if (!project) return;

  await buildProject(project, { clean: true });
  await writeDashboard(contexts);
}

export async function buildAll() {
  const { contexts } = await getProjectState();
  if (!contexts.length) {
    console.log('[agency] No projects found under /projects.');
    return;
  }

  await buildAllProjects(contexts, { clean: true });
}

export async function dev() {
  const { agencyConfig, contexts } = await getProjectState();
  if (!contexts.length) {
    console.log('[agency] No projects found under /projects.');
    return;
  }

  const activeProject = selectActiveProject(contexts, agencyConfig);
  if (!activeProject) return;

  await ensureLiveReload(agencyConfig);
  await buildProject(activeProject, { clean: true });
  await writeDashboard(contexts);
  const devServer = await startStaticDevServer(agencyConfig, {
    id: `project-${activeProject.slug}`,
    mode: 'single',
    project: activeProject.slug,
    rootDir: activeProject.distDir
  });

  const watchPatterns = normalizeArray(activeProject.config.watch.project).length
    ? resolvePatterns(activeProject, activeProject.config.watch.project)
    : [toPosixPath(join(activeProject.rootDir, '**/*'))];

  const scheduleRebuild = createRebuildScheduler(async () => {
    const refreshedState = await getProjectState();
    const refreshedProject =
      findProjectContext(refreshedState.contexts, activeProject.slug) ||
      findProjectContext(refreshedState.contexts, activeProject.name);
    if (!refreshedProject) return;

    await buildProject(refreshedProject, { clean: false });
    await writeDashboard(refreshedState.contexts);
  }, Number(agencyConfig.watch.debounceMs) || 200);

  const projectWatcher = watch(watchPatterns, { ignoreInitial: true });
  projectWatcher.on('all', (_event, changedPath) => {
    console.log(`[agency:${activeProject.slug}] changed ${toPosixPath(changedPath)}`);
    scheduleRebuild();
  });

  console.log(
    `[agency] dev mode: active project "${activeProject.name}" -> ${toPosixPath(
      join(activeProject.agency.distDir, activeProject.slug)
    )} (${devServer.url})`
  );
}

export async function devAll() {
  const { agencyConfig, contexts } = await getProjectState();
  if (!contexts.length) {
    console.log('[agency] No projects found under /projects.');
    return;
  }

  await ensureLiveReload(agencyConfig);
  await buildAllProjects(contexts, { clean: true });
  const devServer = await startStaticDevServer(agencyConfig, {
    id: 'all-projects',
    mode: 'all',
    project: 'all',
    rootDir: join(__dirname, 'dist')
  });

  const allProjectsGlob = toPosixPath(join(__dirname, agencyConfig.projectsDir, '**/*'));
  const scheduleRebuild = createRebuildScheduler(async () => {
    const refreshedState = await getProjectState();
    await buildAllProjects(refreshedState.contexts, { clean: false });
  }, Number(agencyConfig.watch.debounceMs) || 200);

  const allWatcher = watch(allProjectsGlob, { ignoreInitial: true });
  allWatcher.on('all', (_event, changedPath) => {
    console.log(`[agency:all] changed ${toPosixPath(changedPath)}`);
    scheduleRebuild();
  });

  console.log(`[agency] dev:all mode is watching every project under /projects. (${devServer.url})`);
}

export default dev;
