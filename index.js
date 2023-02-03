#!/usr/bin/env node
const path = require("path");
const basePath = process.cwd();
const fs = require("fs");
const child_process = require("child_process");
const { getFileList, getActionAndParmas, getVersion } = require("./lib/utils");

class PackKit {
  constructor() {
    // 获取用户输入的配置
    const { action, params } = getActionAndParmas();
    // 获取文件路径
    const { manifest, mpConfig, pages } = getFileList(
      path.resolve(basePath, "src")
    );
    this.action = action;
    this.params = params;
    this.manifest = manifest;
    this.mpConfig = mpConfig;
    this.pages = pages;

    this.params.env = this.params.env ? this.params.env : "dev";

    this[this.action]();
  }

  // 生成文件
  make() {
    this.makePage();
    this.makeManifest();
    this.makeMpConfig();
  }

  // 本地开发,跑h
  h5() {
    this.make();
    const ls = child_process.exec("npm run serve");
    ls.stdout.on("data", (data) => {
      console.log(`${data}`);
    });

    ls.stderr.on("data", (data) => {
      console.error(`${data}`);
    });

    ls.on("close", (code) => {
      console.log(`运行结束`);
    });
  }

  // 打包h5
  build() {
    this.make();
    const ls = child_process.exec("npm run build:h5");
    ls.stdout.on("data", (data) => {
      console.log(`${data}`);
    });

    ls.stderr.on("data", (data) => {
      console.error(`${data}`);
    });

    ls.on("close", (code) => {
      console.log(`运行结束`);
    });
  }

  // 打包uni小程序
  wgt() {
    this.make();
    const ls = child_process.exec("cd src && npm run build-wgt");
    ls.stdout.on("data", (data) => {
      console.log(`${data}`);
    });

    ls.stderr.on("data", (data) => {
      console.error(`${data}`);
    });

    ls.on("close", (code) => {
      console.log(`运行结束`);
    });
  }

  makeMpConfig() {
    // 根据env 生成 mp.config.js
    // 存在对应的文件,就直接替换
    const targetFile = this.mpConfig.find((i) =>
      i.endsWith(`mp.config.${this.params.env}.js`)
    );
    const mpConfigJs = this.mpConfig.find((i) => i.endsWith(`mp.config.js`));

    const envFile = targetFile ? targetFile : mpConfigJs;
    const config = require(envFile);
    const evnList = Object.keys(config.server);

    //检测对应的环境有没有
    if (!evnList.includes(this.params.env)) {
      console.log(`${envFile}没有配置${this.params.env}环境`);
      throw new Error(`${envFile}没有配置${this.params.env}环境`);
    }

    // 没有对应环境的mp.config 文件, 则要更改env的值
    if (!targetFile) {
      config._config_.env = this.params.env;
      const configKeys = Object.keys(config._config_);

      // 默认值, 把所有值为布尔值设为false
      configKeys.forEach((key) => {
        if (typeof config._config_[key] === "boolean") {
          config._config_[key] = false;
        }
      });

      // 本地开发h5环境, 默认 模拟登录
      if (this.action === "h5" || ["dev", "local"].includes(this.params.env)) {
        config._config_["mockLogin"] = true;
      }

      // 非生成环境, 非本地开发(打包成的h5, wgt) 开启 vconsole
      if (!["prod", "prd", "production"].includes(this.params.env)) {
        if (this.action === "build") {
          config._config_["vconsoleH5"] = true;
        }
        if (this.action === "wgt") {
          config._config_["vconsole"] = true;
        }
      }

      // 用户输入的值 替代默认的
      configKeys.forEach((key) => {
        if (this.params.hasOwnProperty(key)) {
          config._config_[key] = this.params[key];
        }
      });
    }

    // 生产环境,所有通过 布尔值控制的功能 默认 false
    if (["prod", "prd", "production"].includes(this.params.env)) {
      config._config_["vconsole"] = false;
      config._config_["vconsoleH5"] = false;
      config._config_["mockLogin"] = false;
    }

    fs.writeFileSync(
      mpConfigJs,
      `module.exports = ${JSON.stringify(config, null, 2)}`
    );
    console.log("生成mp.config.js成功");
    console.log("============= _config_ ================");
    console.log(config._config_);
  }

  makePage() {
    // 根据 module 生成 page.json
    // 存在对应的文件,就直接替换
    const targetFile = this.pages.find((i) =>
      i.endsWith(`pages.${this.params.module}.json`)
    );
    const page = this.pages.find((i) => i.endsWith(`pages.json`));

    const pageFile = targetFile ? targetFile : page;

    // 读取内容 并过滤掉注释
    const content = fs.readFileSync(pageFile, { encoding: "utf-8" }).toString();
    const temp = content.replace(/\/\/[\s\S]*?\n/gi, "");
    const newContent = temp.replace(/\/\*[\s\S]*?\*\//gi, "");
    fs.writeFileSync(
      page,
      `${JSON.stringify(JSON.parse(newContent), null, 2)}`
    );
    console.log("生成page.json成功");
  }

  makeManifest() {
    // 根据 module 生成 manifest.json
    // 存在对应的文件,就直接替换
    const targetFile = this.manifest.find((i) =>
      i.endsWith(`manifest.${this.params.module}.json`)
    );
    const manifest = this.manifest.find((i) => i.endsWith(`manifest.json`));

    const manifestFile = targetFile ? targetFile : manifest;

    // 读取内容
    const content = require(manifestFile);
    if (this.params.module) {
      content.appid = `${content.appid.slice(0, 14)}__${this.params.module}`;
    } else {
      content.appid = `${content.appid.slice(0, 14)}`;
    }
    if (this.params.version) {
      // 框架默认+1   把用户输入的版本号先减1
      content.versionName = `${getVersion(this.params.version, -1)}`;
    } else {
      content.versionName = `${getVersion()}`;
    }

    fs.writeFileSync(manifest, `${JSON.stringify(content, null, 2)}`);
    console.log("生成manifest.json成功");
  }
}

const p = new PackKit();
