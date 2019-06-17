const https = require('https');
const zlib = require('zlib');
const gunzip = zlib.createGunzip();
const querystring = require('querystring');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { getBrowserDownloadPath, unzipAndCopy } = require('./util');

function getZipRequestPath(iconData) {
    if (iconData.data && iconData.data.icons && iconData.data.icons.length) {
        const ids = iconData.data.icons.map((icon) => {
            return `${icon.id}|${icon.projectId}`
        }).join(',');

        return '/api/project/download.zip?' + querystring.stringify({
            ids,
            ctoken: global.skk_config.httpOptions.ctoken
        })
    }
}

function getDownloadZip() {
    const downloadPath = path.join(getBrowserDownloadPath(), 'download.zip');
    fs.removeSync(downloadPath);
    const zipWriteStream = fs.createWriteStream(downloadPath);
    const getJsonOpts = {
        hostname: 'www.iconfont.cn',
        port: 443,
        path: '/api/project/detail.json?' + querystring.stringify(global.skk_config.httpOptions),
        headers: {
            'Cookie': global.skk_config.cookie,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7'
        }
    };
    console.log(chalk.yellow('正在获取icon列表...'));
    const getJsonClient = https.get(getJsonOpts, (res) => {
        res.on('error', (err) => {
            console.log(chalk.red('getJsonClient响应错误: ' + err));
        })
        console.log(chalk.green('成功获取到icon列表'));
        console.log(chalk.yellow('开始解析icon列表...'));
        let buf = Buffer.alloc(0);
        res.pipe(gunzip);
        gunzip.on('data', (data) => {
            buf = Buffer.concat([buf, data]);
        });
        gunzip.on('end', () => {
            console.log(chalk.green('解析icon完毕'));
            const iconData = JSON.parse(buf.toString());
            const zipRequestPath = getZipRequestPath(iconData);
            if (!zipRequestPath) {
                console.log(chalk.red('获取压缩包下载地址出错'));
                return;
            }
            const zipOpts = {
                hostname: 'www.iconfont.cn',
                port: 443,
                path: zipRequestPath,
                headers: {
                    'Cookie': global.skk_config.cookie,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7'
                }
            }
            console.log(chalk.yellow('开始下载icon压缩包...'));
            const zipClient = https.get(zipOpts, (res) => {
                res.on('error', (err) => {
                    console.log(chalk.red('zipClient响应错误：' + err));
                })
                res.on('data', (data) => {
                    zipWriteStream.write(data);
                })
                res.on('end', () => {
                    zipWriteStream.end();
                    console.log(chalk.green('icon压缩包下载完毕'));
                    setTimeout(() => {
                        unzipAndCopy();
                    }, 500)
                })
            })
            zipClient.on('error', (err) => {
                console.log(chalk.red('zipClient请求错误：' + err));
            })
        })
    });
    getJsonClient.on('error', (err) => {
        console.log(chalk.red('getJsonClient请求错误: ' + err));
    });
}

module.exports = {
    getDownloadZip
}