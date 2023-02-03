const fs = require("fs");
const path = require("path");

// 获取用户输入的配置
function getActionAndParmas() {
  const actionList = ["h5", "build", "wgt", "make"];
  const params = {};
  const argvArr = process.argv.filter((i) => i.includes("="));
  const action = process.argv[2];

  if (!actionList.includes(action)) {
    throw new Error("请输入正确的action, 如:h5, build, wgt, make");
  }

  argvArr.forEach((i) => {
    const arr = i.split("=");
    // if (keys.includes(arr[0])) {
    //   arr[1] = arr[1] === "true" ? true : false;
    // }
    const key = arr[0];
    const value =
      arr[1] === "true" ? true : arr[1] === "false" ? false : arr[1];
    if (value !== "") {
      params[key] = value;
    }
  });
  return {
    action,
    params,
  };
}

// 获取 src 下的文件列表
function _listFileOfDir(dir, r = true, list = []) {
  const arr = fs.readdirSync(dir);
  arr.forEach((item) => {
    const fullpath = path.join(dir, item);
    const stats = fs.statSync(fullpath);

    if (r && stats.isDirectory()) {
      _listFileOfDir(fullpath, list);
    } else {
      list.push(fullpath);
    }
  });
  return list;
}

// 筛选出 manifest  mp.config pages
function getFileList(target) {
  const fileList = _listFileOfDir(target, false);

  const manifest = fileList.filter((i) => /manifest\..*\.?json$/.test(i));
  const mpConfig = fileList.filter((i) => /mp\.config\..*\.?js$/.test(i));
  const pages = fileList.filter((i) => /pages\..*\.?json$/.test(i));

  const common = mpConfig.find((i) => i.endsWith("mp.config.common.js"));

  if (common) {
    throw new Error("请输不要设置mp.config.common.js");
  }
  if (manifest.length === 0) {
    throw new Error("缺少manifest文件");
  }
  if (mpConfig.length === 0) {
    throw new Error("缺少mpConfig文件");
  }
  if (pages.length === 0) {
    throw new Error("缺少pages文件");
  }
  return {
    manifest,
    mpConfig,
    pages,
  };
}

// 版本号 加减

const getVersion = (version, num) => {
  if (!version) {
    const dd = new Date();
    let temp = dd
      .toISOString()
      .slice(0, 19)
      .replace(/-/gi, "")
      .replace(/T/gi, "")
      .replace(/:/gi, "");

    return temp - 1;
  }
  const numArr = version.split(".");
  numArr[numArr.length - 1] = numArr[numArr.length - 1] / 1 + num;
  const newVersion = numArr.join(".");
  return newVersion;
};

module.exports = {
  getFileList,
  getActionAndParmas,
  getVersion,
};
