// rollup.config.js
import path from "path";
import fs from 'fs-extra';
import crypto from 'crypto';
import terser from "terser";
import * as postcss from 'postcss';
import vue from 'rollup-plugin-vue';
import buble from '@rollup/plugin-buble';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import resolveAppConfig from './make/config';
import Configure from './../app/config';

// 源文件目录 / 生成目录 / 组件目录 / 是否压缩代码 (rollup 编译结果有一定的可读性, 可以不压缩 review 一下编译结果)
const srcPath = 'src';
const distPath = 'dist';
const libPath = 'lib';
const compressCode = 1;

// 页面组件生成目录, 一般无需修改 (页面js目录/css引用资源目录/template引用资源目录)
const jsOutput = 'view';
const assetOutput = 'asset';
const staticOutput = 'static';

/* ====================================================================================================
公用 编译函数 (生成 app.js 和 page component 公用函数)
======================================================================================================*/
const STEP = 'BUILD_STEP' in process.env ? process.env.BUILD_STEP * 1 : 4;
const scriptPath = __dirname;
const scriptPathName = scriptPath.split('/').pop();
const projectPath = path.resolve(scriptPath, './../');
const inputPath = path.resolve(projectPath, srcPath);
const rollupConfig = [];


/* ====================================================================================================
编译 app.js , 生成 requirejs 加载的 data-main 
<script src="require.js" data-main="src/app" defer async="true"></script>

分为三种情况：
  make:1. 生成 dev.js 到 src 中, 动态加载 app 目录下的约定文件; load .vue sfc 组件, 方便测试
  make:2. 生成 app.js 到 src 中, 打包 app 目录下的约定文件到 app.js 中了, 但仍可 load .vue sfc 来测试
  make:3. 生成 app.js 到 dist 目录中, 这个是 runtime 的, 用于生产环境, 已打包 app 目录下文件, 且只能 load 编译过的组件

需注意：  
  并未处理静态资源, 所以不要引用静态资源
======================================================================================================*/
if (STEP < 4) {
  //提取要编译到 app.js 的全局 lib, 全局lib在 package.json 定义 plugins:['', '', '']
  const commonFile = scriptPath + '/_generate_.js';
  const vueLibs = require(path.resolve(projectPath, "package.json")).plugins||[];
  const commonLibs = [];
  const commonNames = [];
  vueLibs.forEach(file => {
    if (file.indexOf('/') > -1) {
      file = path.join('./../', file).replace(/\\/g, '/');
    }
    const name = 'lib' + commonLibs.length;
    commonLibs.push(`import ${name} from "${file}";`);
    commonNames.push(name);
  });
  const commonCode = commonLibs.join("\n") + "\n\n" + 
    'export default [' + commonNames.join(",") + '];';
  fs.outputFileSync(commonFile, commonCode);
  

  //设置编译变量 (config 配置注入到环境变量)
  const envConfig = {};
  const runtime = STEP === 3;
  const appConfig = resolveAppConfig(Configure, runtime);
  Object.entries(appConfig).forEach(([key, value]) => {
    envConfig['process.env.app_' + key] = JSON.stringify(value);
  });
  envConfig["process.env.app_jsOutput"] = jsOutput;
  envConfig["process.env.BUILD_STEP"] = STEP;
  envConfig["process.env.NODE_ENV"] = runtime ? 'production' : 'development';
  const appOutputFilePath = runtime ? distPath + '/app.js' : srcPath + '/'+(STEP === 1 ? 'dev' : 'app')+'.js';

  // 处理生成格式, 使之可以用在 requireJs 的 main-data
  const mainDataResolve = {
    name: 'vue-appResolve',
    resolveId (source) {
      let resolveFile = null;
      if (source === '@libs') {
        resolveFile = commonFile;
      } else if (source === '@appMake') {
        resolveFile = scriptPath + '/make/appMake' + STEP + '.js';
      } else if (source.startsWith('@app')) {
        resolveFile = projectPath + '/app' + source.substr(4);
      }
      resolveFile = resolveFile ? path.resolve(resolveFile) : null;
      return resolveFile;
    },
    generateBundle(OutputOptions, bundle) {
      let fileName, chunkInfo;
      for (fileName in bundle) {
        chunkInfo = bundle[fileName];
        if (chunkInfo.type !== 'chunk') {
          continue;
        }
        let code = chunkInfo.code;
        if (STEP !== 3) {
          code = code.replace(/windowImport/g, 'import');
        }
        code = code.replace(/module.exports=(.*)\;$/i, function(m, f) {
            return f + '()';
        }).replace(
          /__4STEP_normalizeComponent__/g, 
          'normalizeComponent'
        ).replace(
          /__4STEP_createInjector__/g, 
          'createInjector'
        );
        code = "(function(){\n" + code + "\n})()";
        if (compressCode) {
          code = terser.minify(code).code;
        }
        chunkInfo.code = code;
      }
    },
    async writeBundle() {
      // 删除临时 Libs 汇总文件
      await fs.remove(commonFile);
    }
  };

  const appRollup = {
    input: scriptPathName + '/make/index.js',
    output: {
        strict: false,
        compact: true,
        file: appOutputFilePath,
        format: 'cjs'
    },
    plugins:[
      replace(envConfig),
      commonjs(),

      // vue scf 解析
      vue({
        css: true,
        compileTemplate: true,
        normalizer: '__4STEP_normalizeComponent__',
        styleInjector: '__4STEP_createInjector__',
        template: {
          isProduction: true,
          compilerOptions:{
            whitespace: 'condense'
          }
        }
      }),

      // es6->es5
      buble({
        objectAssign:true
      }),

      mainDataResolve,
    ]
  }
  rollupConfig.push(appRollup)
}






/* ====================================================================================================
编译页面组件, 最终要实现的编译结果是

  define(['vue.utils'], function(VueUtils) {
    return VueUtils.normalizer(...)
  })

编译结果中不包含 vue 的 utils 内联函数, 而是使用 requerJs 引入外部 vue.utils (该模块中含有 normalizer/styleInjector 函数) 
将内联函数提取出来, 有助于减小页面组件体积, 按照 rollup 的使用方法

  1. external : 定义全局库, 这样编译过程中 rollup 就不会真的寻找 VueUtils 文件了
  2. output.paths : 定义 VueUtils 的加载路径
  3. plugins.vue() : 定义 normalizer/styleInjector 函数名, 不让 vue 内联注入相关函数

静态资源处理  
  1. 使用 cssAssetResolve 和 templateStaticResolve 自动给 css 和 template 中的静态资源添加 url 前缀
  2. 最后通过 replaceAssetPrefix, 引入 require(['moduel']) 获取 js 的 url, 从而计算出静态资源 url 前缀, 并进行替换

参考代码:  
@see https://rollupjs.org/guide/en#plugins
@see https://github.com/rollup/rollup-plugin-url/blob/master/src/index.js
@see https://github.com/sebastian-software/rollup-plugin-rebase/blob/master/src/index.js
@see https://github.com/webpack/loader-utils/blob/master/lib/getHashDigest.js
======================================================================================================*/
if (STEP > 3) {
  // 通用 JS 路径及变量名 (与 app.js 中的变量名对应的, 不要修改)
  const globalVar = {
    url: 'vue.utils',
    normalizer: 'n',
    styleInjector: 'c',
  };

  // 需要从模板中提取的静态资源类型 /  hash 计算函数
  const filterAsset = /^\.(svg|png|jpg|jpeg|gif|mp3|mp4)$/;
  const getHashDigest = file => {
    const hash = crypto.createHash('md5');
    hash.update(fs.readFileSync(file));
    return hash.digest('hex').substr(0, 8);
  };

  // 格式化 template / style 中的静态资源 path, 并缓存结果
  let staticCache = {};
  let assetsCache = {};
  const resolveAssetPath = (source, importer, css) => {
      const firstChar = source[0];
      if (firstChar === '@') {
        return path.join(inputPath, source.substr(1));
      }
      let isModule = false;
      if (firstChar === '~') {
        isModule = true;
        source = source.substr(1);
      } else if (!css) {
        isModule = true;
      }
      if (isModule) {
        return path.join(projectPath + '/node_modules',  source);
      }
      if (!importer) {
        return null;
      }
      return path.resolve(path.dirname(importer), source);
  };
  const getAssetFinalPath = (source, importer, css) => {
    const fileExt = path.extname(source);
    if (!css && (fileExt === "" || !filterAsset.test(fileExt))) {
      return null;
    }
    const filePath = resolveAssetPath(source, importer, css);
    if (!filePath) {
      return null;
    }
    const fileName = path.basename(source, fileExt) + '.' + getHashDigest(filePath) + fileExt;
    if (css) {
      assetsCache[filePath] = fileName;
      return fileName;
    }
    staticCache[filePath] = fileName;
    return filePath;
  }

  // 处理 css 中静态资源的 postcss 插件(复制静态资源并添加前缀)
  // @see https://github.com/postcss/postcss-url
  const ASSET_URL_PATTERNS = [
    /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g,
    /(AlphaImageLoader\(\s*src=['"]?)([^"')]+)(["'])/g
  ];
  const cssAssetResolve = postcss.plugin('asset', () => {
    return function(styles, result) {
      styles.walkDecls((node) => {
          const pattern = ASSET_URL_PATTERNS.find((pattern) => pattern.test(node.value));
          if (!pattern) {
            return;
          }
          const {from, to} = result.opts;
          const importer = to ? to : (from ? from : null);
          node.value = node.value.replace(pattern, (matched, before, url, after) => {
            const fileName = getAssetFinalPath(url, importer, true);
            const finalUrl = fileName ?  '__VSTEP_assetPrefix__' + assetOutput + '/' + fileName : url;
            return before + finalUrl + after;
          });
      });
    }
  });

  // 处理 .vue 文件中 script 中的 unit helper(引入VueUtils) 和 template 中静态资源(复制资源)
  const templateStaticResolve = {
    name: 'vue-resolve',
    // rollup vue plugin 会将引用资源以 import 形式进行处理, 该函数来修改引用路径
    // @see https://rollup-plugin-vue.vuejs.org/options.html#template-transformasseturls
    resolveId (source, importer) {
      if (source === '_currentUrlPrefix_') {
        return source;
      }
      return getAssetFinalPath(source, importer, false);
    },
    // rollup 接口, 当 import 时, 这里先进行处理, 此处处理静态资源
    load(id) {
      // 静态资源前缀由 requireJs module.uri 自动计算
      if (id === '_currentUrlPrefix_') {
        return `import {uri} from 'module';
          let urls = uri.split('/');
          urls = urls.slice(0, urls.length - 2).join('/') + '/';
          export default urls;`
      }
      if (!(id in staticCache)) {
        const fileExt = path.extname(id);
        if (fileExt === "" || !filterAsset.test(fileExt)) {
          return null;
        }
        const fileName = path.basename(id, fileExt) + '.' + getHashDigest(id) + fileExt;
        staticCache[id] = fileName;
      }
      return `export default __VSTEP_staticPrefix__ + "${staticOutput}/${staticCache[id]}";`;
    },
    // 编译后, 拷贝静态资源
    async generateBundle() {
      const outputPath = path.resolve(projectPath, STEP > 4 ? libPath : distPath);
      try {
        await Promise.all(
          Object.keys(assetsCache).map(async (fileSource) => {
            await fs.copy(fileSource, path.join(outputPath + '/' + assetOutput, assetsCache[fileSource]))
          })
        )
        await Promise.all(
          Object.keys(staticCache).map(async (fileSource) => {
            await fs.copy(fileSource, path.join(outputPath + '/' + staticOutput, staticCache[fileSource]))
          })
        )
      } catch (error) {
        throw new Error(`Error while copying files: ${error}`)
      }
      assetsCache = {};
      staticCache = {};
    },
    transform(code, id) {
      // 强制引入 _currentUrlPrefix_(requireJs module模块) 获取静态资源 url 前缀
      if (id !== '_currentUrlPrefix_' && id.endsWith('.vue') && !(id in staticCache)) {
        code = `import __VSTEP_currentPath__ from '_currentUrlPrefix_';
        import {${globalVar.normalizer}, ${globalVar.styleInjector}} from '_VueUtils_';
        __VSTEP_none_exist_method__(__VSTEP_currentPath__);
        ` + code;
      }
      return code;
    }
  };

  // 最终替换 css 和 template 中的资源 url 前缀
  const replaceAssetPrefix = {
    name: 'vue-replaceAssetPrefix',
    generateBundle(OutputOptions, bundle) {
      let fileName, chunkInfo;
      for (fileName in bundle) {
        chunkInfo = bundle[fileName];
        if (chunkInfo.type !== 'chunk') {
          continue;
        }
        chunkInfo.code = chunkInfo.code
          .replace(/__VSTEP_none_exist_method__\(__VSTEP_currentPath__\);/g, '')
          .replace(/__VSTEP_staticPrefix__/g, '__VSTEP_currentPath__')
          .replace(/__VSTEP_assetPrefix__/g, '"+ __VSTEP_currentPath__ +"');
        if (compressCode) {
          chunkInfo.code = terser.minify(chunkInfo.code).code;
        }
      }
    }
  };

  // rollup 配置项
  const external = ['module', '_VueUtils_'];
  const output = {
      compact: true,
      file: 'dist/index.js',
      format: 'amd',
      paths: {
        _VueUtils_: globalVar.url,
      }
  };

  // rollup 插件
  const plugins = [
    // 设置为生产环境
    replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
    }),

    // 允许引用 node_moudels 文件夹下的文件
    resolve(),

    // vue 解析
    vue({
      css: true,
      compileTemplate: true,
      normalizer: globalVar.normalizer,
      styleInjector: globalVar.styleInjector,
      template: {
        isProduction: true,
        compilerOptions:{
          whitespace: 'condense'
        }
      },
      style: {
        postcssPlugins:[
          cssAssetResolve()
        ]
      }
    }),

    // vue template 相关处理
    templateStaticResolve,

    // import * from './index' 这样子形式自动查找后缀
    commonjs({
        extensions: [ '.js', '.vue']
    }),

    // es6->es5
    buble({
      objectAssign:true
    }),

    // 替换资源 URL 前缀
    replaceAssetPrefix,
  ];


  if (STEP > 4) {
    // 编译 vstep lib
    const libList = require(path.resolve(scriptPath, 'lib', 'libs.json'));
    for (let name in libList) {
      rollupConfig.push({
        input: path.resolve(scriptPath, 'lib', libList[name]),
        output: {
          ...output, 
          file: path.join(libPath, name + '.js')
        },
        external, 
        plugins
      });
    }

  } else {
    // 压缩 loader.js
    const loaderJs = path.resolve(inputPath, 'loader.js');
    if (fs.existsSync(loaderJs)) {
      let code = fs.readFileSync(loaderJs, "utf8");
      code = terser.minify(code).code;
      fs.writeFileSync(
        path.join(distPath, 'loader.js'),
        code
      )
    }
    // 编译 src 目录下所有 .vue 组件, 首字母大写的认为是中间组件, 不编译
    require('fs').readdirSync(inputPath).forEach(file => {
      if (!file.endsWith('.vue') || file[0] === file[0].toUpperCase()) {
        return;
      }
      rollupConfig.push({
        input: srcPath + '/' + file,
        output: {
          ...output, 
          file: path.join(distPath + '/' + jsOutput, file.slice(0,-4)+'.js')
        },
        external, 
        plugins
      });
    });
  }
}

export default rollupConfig;