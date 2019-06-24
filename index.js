#!/usr/bin/env node

const chalk = require('chalk');
const commander = require('commander');
const { getConfig, generateTempConfigFile, unzipAndCopy, watchDownloadDirectory, openDownloadLinkInBrowser, openTempConfigFile} = require('./util/util');
const { getDownloadZip } = require('./util/http');
process.on('uncaughtException', (err) => {
    console.log(chalk.red(err));
});

global.skk_config = getConfig();
const program = new commander.Command();

program.version('1.3.2');


program
    .option('-p, --project <type>', '设置需要下载项目名字', (value) => {
        global.skk_config.defaultProject = value;
    })
    .option('-o, --open', '在浏览器中打开下载iconfont页面')
    .option('-a, --auto-download [type]', '自动下载压缩包，然后解压复制到目标文件夹')
    .option('-u, --unzip', '直接解压已有的压缩包')
    .option('-w, --watch', '自动监听下载目录')
    .option('-c, --config', '查看配置文件')
    .option('-g, --generate-config', '重新生成配置文件配置文件')
    .option('-d, --download', '在浏览器中打开下载iconfont页面，并监听下载目录')
program.parse(process.argv);
if (program.open === true) {
    openDownloadLinkInBrowser();
}
if (program['autoDownload']) {
    if(typeof program['autoDownload'] === 'string') {
        global.skk_config.defaultProject = program['autoDownload'];
    }
    getDownloadZip();
}
if (program.unzip === true) {
    unzipAndCopy();
}
if (program.watch === true) {
    watchDownloadDirectory();
}
if (program.config === true) {
    openTempConfigFile();
}
if (program['generateConfig'] === true) {
    generateTempConfigFile();
}
if (program.download === true) {
    openDownloadLinkInBrowser();
    watchDownloadDirectory();
}
