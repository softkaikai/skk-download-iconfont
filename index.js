#!/usr/bin/env node

const chalk = require('chalk');
const commander = require('commander');
const { getConfig, generateTempConfigFile, unzipAndCopy, watchDownloadDirectory, openDownloadLinkInBrowser, openTempConfigFile} = require('./util/util');

process.on('uncaughtException', (err) => {
    console.log(chalk.red(err));
});

global.skk_config = getConfig();
const program = new commander.Command();

program.version('1.3.2');
program
    .option('-o, --open', '在浏览器中打开下载iconfont页面', openDownloadLinkInBrowser)
    .option('-u, --unzip', '直接解压已有的压缩包', unzipAndCopy)
    .option('-w, --watch', '自动监听下载目录', watchDownloadDirectory)
    .option('-c, --config', '查看配置文件', openTempConfigFile)
    .option('-g, --generate-config', '重新生成配置文件配置文件', generateTempConfigFile)
    .option('-d, --download', '在浏览器中打开下载iconfont页面，并监听下载目录', function() {
        openDownloadLinkInBrowser();
        watchDownloadDirectory();
    })
program.parse(process.argv);
