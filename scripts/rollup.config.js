// rollup.config.js
import path from "path";
import fs from 'fs-extra';
import crypto from 'crypto';
import terserApi from "terser";
import * as postcss from 'postcss';
import vue from 'rollup-plugin-vue';
import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import {terser} from 'rollup-plugin-terser';
import resolveAppConfig from './make/config';
import Configure from './../app/config';


// 源文件目录 / 生成目录 / 是否压缩代码 (rollup 编译结果有一定的可读性, 可以不压缩 review 一下编译结果)
const srcPath = 'src';
const distPath = 'dist';
const compressCode = false;
const rollupConfig = [];


/* ====================================================================================================
公用 编译函数 (生成 app.js 和 page component 公用函数)
======================================================================================================*/
const STEP = 'BUILD_STEP' in process.env ? process.env.BUILD_STEP * 1 : 4;
const scriptPath = __dirname;
const scriptPathName = scriptPath.split('/').pop();
const projectPath = path.resolve(scriptPath, './../');
const inputPath = path.resolve(projectPath, srcPath);
const outputPath = path.resolve(projectPath, distPath);

// 页面组件生成目录, 一般无需修改 (页面js目录/css引用资源目录/template引用资源目录)
const jsOutput = 'view';
const assetOutput = 'asset';
const staticOutput = 'static';

// 需要从模板中提取的静态资源类型 /  hash 计算函数
const filterAsset = /^\.(svg|png|jpg|jpeg|gif|mp3|mp4)$/;
const getHashDigest = file => {
  const hash = crypto.createHash('md5');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex').substr(0, 8);
};

// 通用 JS 路径及变量名 (在 app.js 中的变量名, 不要改)
const globalVar = {
  url: 'vue.utils',
  baseUrl: 'm',
  normalizer: 'n',
  styleInjector: 's',
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

// 处理 css 中静态资源的 postcss 插件
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
          const finalUrl = fileName ?  assetOutput + '/' + fileName : url;
          return before + finalUrl + after;
        });
    });
  }
});

// 处理 template 中静态资源的 rollup 插件
const templateStaticResove = {
  name: 'vue-resolve',
  // rollup vue plugin 会将引用资源以 import 形式进行处理, 该函数来修改引用路径
  // @see https://rollup-plugin-vue.vuejs.org/options.html#template-transformasseturls
  resolveId (source, importer) {
    return getAssetFinalPath(source, importer, false);
  },
  // rollup 接口, 当 import 时, 这里先进行处理, 此处处理静态资源
  load(id) {
    if (!(id in staticCache)) {
      const fileExt = path.extname(id);
      if (fileExt === "" || !filterAsset.test(fileExt)) {
        return null;
      }
      const fileName = path.basename(id, fileExt) + '.' + getHashDigest(id) + fileExt;
      staticCache[id] = fileName;
    }
    return `export default ${globalVar.baseUrl} + "${staticOutput}/${staticCache[id]}";`;
  },
  // 编译后, 拷贝静态资源
  async generateBundle({ file, dir }) {
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
  }
}




/* ====================================================================================================
编译 app.js , 生成 requirejs 加载的 data-main 
<script src="require.js" data-main="src/app" defer async="true"></script>

分为三种情况
  make:1. 生成 app.js 到 src 中, 运行时加载 app 目录下的约定文件; load .vue sfc 组件, 方便测试
  make:2. 生成 app.js 到 src 中, 打包 app 目录下的约定文件到 app.js 中了, 但仍可 load .vue sfc 来测试
  make:3. 生成 app.js 到 dist 目录中, 这个是 runtime 的, 用于生产环境, 只能 load 编译过的组件
======================================================================================================*/
if (STEP < 4) {
  //提取要编译到 app.js 的全局 lib, 首字母大写的认为是中间组件, 不编译
  const commonFile = scriptPath + '/libs/_generate_.js';
  const commonLibs = [];
  require('fs').readdirSync(scriptPath + '/libs').forEach(file => {
    if (!file.endsWith('.vue') || file[0] === '_' || file[0] === file[0].toUpperCase()) {
      return;
    }
    commonLibs.push(`import lib${commonLibs.length} from "./${file}";`);
  });
  const commonGen = [];
  commonGen.push('export default (Vue) => {');
  commonLibs.forEach((item, index) => {
      commonGen.push(`Vue.component(lib${index}.name, lib${index});`);
  });
  commonGen.push('}');
  const commonCode = commonLibs.join("\n") + "\n\n" + commonGen.join("\n");
  fs.outputFileSync(commonFile, commonCode);


  //设置编译变量
  const runtime = STEP === 3;
  const appConfig = resolveAppConfig(Configure, runtime);
  const libPath = appConfig.localLib;
  const envConfig = {};
  Object.entries(appConfig).forEach(([key, value]) => {
    envConfig['process.env.app_' + key] = JSON.stringify(value);
  });
  envConfig["process.env.app_jsOutput"] = jsOutput;
  envConfig["process.env.BUILD_STEP"] = STEP;
  envConfig["process.env.NODE_ENV"] = runtime ? 'production' : 'development';
  const appOutputFilePath = runtime ? distPath + '/app.js' : srcPath + '/'+(STEP === 1 ? 'dev' : 'app')+'.js';

  // 处理生成格式, 使之可以用在 requireJs 的 main-data
  const mainDataResolve = () => {
    return {
      name: 'vue-appResolve',
      resolveId (source, importer) {
        if (source === '@libs') {
          return commonFile;
        } else if (source === '@appMake') {
          return scriptPath + '/make/appMake' + STEP + '.js';
        }
        if (source.startsWith('@app')) {
          return projectPath + '/app' + source.substr(4)
        }
        return null;
      },
      async writeBundle(bundle) {
        const key = Object.keys(bundle)[0];
        let code = bundle[key].code;
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

        // 不能使用 rollup-plugin-terser 压缩了, 在这里压缩
        let finalCode = "(function(){\n" + code + "\n})()";
        if (compressCode) {
          finalCode = terserApi.minify(finalCode).code;
        }
        await fs.outputFile(appOutputFilePath, finalCode);

        // 删除临时 Libs 汇总文件
        await fs.remove(commonFile);
      }
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

      // vue 解析
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
        },
        style: {
          postcssPlugins:[
            cssAssetResolve()
          ]
        }
      }),

      // es6->es5
      buble({
        objectAssign: 'Object.assign',
      }),

      mainDataResolve(),
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
这样只需把组件通用函数提取到外部即可, 每个组件的编译结果中将不再包含这些函数, 按照 rollup 的使用方法

  1. external : 定义全局库, 这样编译过程中 rollup 就不会真的寻找 VueUtils 文件了
  2. output.paths : 定义 VueUtils 的加载路径
  3. plugins.vue() : 定义 normalizer/styleInjector 函数名, 不让 vue 内联注入相关函数
  4. plugins.vueResolve: 虽然已避免了 vue rutime 函数的注入, 但组件中并没有使用过, 所以需强行加一行引用代码 (参考上面 vueResolve.transform)

vueResolve (这其实就是一个 rollup 插件了, 由于太简单且不是通用性的, 直接写在这)

  1. 实现上面的 runtime 函数剥离
  2. 处理 template/css 中引用的静态资源

参考代码:  
@see https://rollupjs.org/guide/en#plugins
@see https://github.com/rollup/rollup-plugin-url/blob/master/src/index.js
@see https://github.com/sebastian-software/rollup-plugin-rebase/blob/master/src/index.js
@see https://github.com/webpack/loader-utils/blob/master/lib/getHashDigest.js
======================================================================================================*/
if (STEP === 4) {
  // 处理模板中的静态资源
  const vueResolve = () => {
    return {
      ...templateStaticResove,
      transform(code) {
        return `import {${globalVar.baseUrl}, ${globalVar.normalizer}, ${globalVar.styleInjector}} from 'VueUtils';` + code;
      }
    }
  };

  // rollup 配置项
  const external = ['VueUtils'];
  const output = {
      compact: true,
      file: 'dist/index.js',
      format: 'amd',
      paths: {
        VueUtils: globalVar.url
      }
  };

  // rollup 插件
  const plugins = [
    // 设置为生产环境
    replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
    }),

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

    // import * from './index' 这样子形式自动查找后缀
    commonjs({
        extensions: [ '.js', '.vue']
    }),

    // vue 相关处理
    vueResolve(),

    // es6->es5
    buble({
      objectAssign: 'Object.assign',
    }),
  ];
  if (compressCode) {
    plugins.push(terser({
      output: {
        ecma: 6,
      },
    }))
  }

  // 编译 src 目录下所有 .vue 组件, 首字母大写的认为是中间组件, 不编译
  require('fs').readdirSync(inputPath).forEach(file => {
    if (!file.endsWith('.vue') || file[0] === file[0].toUpperCase()) {
      return;
    }
    rollupConfig.push({
      input: srcPath + '/' + file,
      output: {...output, file: path.join(distPath + '/' + jsOutput, file.slice(0,-4)+'.js')},
      external, plugins
    });
  });
}

export default rollupConfig;