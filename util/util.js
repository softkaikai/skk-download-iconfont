const fs = require('fs');
const path = require('path');
const unzip = require('unzip');
const os = require('os');
const open = require('open');
const chalk = require('chalk');


function openDownloadLinkInBrowser() {
    open(global.skk_config.downloadLink, {app: 'chrome'})
}
function openTempConfigFile() {
    open(getTempConfigPath(), {app: 'chrome'})
}
function generateTempConfigFile() {
    const tempConfigPath = getTempConfigPath();
    const defaultConfigPath = path.resolve(__dirname, '../config.json');
    fs.copyFile(defaultConfigPath, tempConfigPath, () => {
        console.log('生成了临时配置文件，路径为：' + tempConfigPath);
    });
}
function getBrowserDownloadPath() {
    return path.normalize(global.skk_config.browserDownloadPath);
}
function getBrowserDownloadUnzipPath() {
    return path.normalize(global.skk_config.browserDownloadUnzipPath);
}
function getTempConfigPath() {
    return path.resolve(os.tmpdir(), './iconfont_config.json');
}
// 获取配置文件信息
function getConfig() {
    const tempConfigPath = getTempConfigPath();
    const defaultConfigPath = path.resolve(__dirname, '../config.json');
    let fileData = '';
    if (fs.existsSync(tempConfigPath)) {
        fileData = fs.readFileSync(tempConfigPath, 'utf8');
    } else {
        fileData = fs.readFileSync(defaultConfigPath, 'utf8');
        generateTempConfigFile();
    }

    return JSON.parse(fileData);
};

// 获取解压过后的文件所放的文件夹
function getUnzipDirectory() {
    return new Promise((resolve, reject) => {
        if (!global.skk_config) return reject('获取配置文件出错');
        const browserDownloadUnzipPath = getBrowserDownloadUnzipPath();
        fs.readdir(browserDownloadUnzipPath, (err, directories) => {
            if (err) {
                reject('读取压缩文件夹出错');
            }
            if (directories && directories.length) {
                Promise.all(
                    directories.map(directory => {
                        return new Promise((resolve, reject) => {
                            const unzipPath = path.join(browserDownloadUnzipPath, directory);
                            fs.stat(unzipPath, (err, stat) => {
                                if (err) reject(err);

                                resolve({
                                    path: unzipPath,
                                    ctime: stat.ctime.getTime()
                                });
                            })
                        })
                    })
                ).catch(() => {
                    reject('读取压缩文件出错');
                }).then(stats => {
                    stats.sort((a, b) => {
                        return b.ctime - a.ctime;
                    });
                    resolve(stats[0].path);
                }).catch(() => {
                    reject('操作stat出错')
                })
            } else {
                reject('没有最新解压的压缩包')
            }
        })
    })
};

// 拷贝iconfont到项目中去
function copyFilesToProject(source) {
    let destPath = global.skk_config.projectIconfontPath[global.skk_config.defaultProject];
    destPath = path.normalize(destPath);

    console.log(chalk.blue('开始拷贝文件到指定文件夹中...'));
    return new Promise((resolve, reject) => {
        fs.readdir(source, (err, files) => {
            if (err) reject('拷贝文件夹读取出错');
            files = files.filter((file) => {return file.includes('iconfont')});
            Promise.all(
                files.map(file => {
                    return new Promise((resolve, reject) => {
                        fs.copyFile(path.join(source, file), path.join(destPath, file), (err) => {
                            if (err) return reject('拷贝文件到项目出错');
                            resolve();
                        })
                    })
                })
            ).catch((err) => {
                reject(err)
            }).then(() => {
                console.log(chalk.blue('文件拷贝完毕'));
                resolve();
            })
        })
    })
};

// 获取最新下载的压缩包路径
function getLatestZipPath() {
    const browserDownloadPath = getBrowserDownloadPath();

    return new Promise((resolve, reject) => {
        fs.readdir(browserDownloadPath, (err, files) => {
            if (err) reject('获取压缩包路径出错');
            const regExpDownLoadFile = /^download.*(zip)$/;
            files = files.filter(file => {
                return regExpDownLoadFile.test(file)
            });
            if (files && files.length) {
                Promise.all(
                    files.map(file => {
                        return new Promise((resolve, reject) => {
                            const unzipPath = path.join(browserDownloadPath, file);
                            fs.stat(unzipPath, (err, stat) => {
                                if (err) reject(err);

                                resolve({
                                    path: unzipPath,
                                    ctime: stat.ctime.getTime()
                                });
                            })
                        })
                    })
                ).catch(() => {
                    reject('读取压缩包出错');
                }).then(stats => {
                    stats.sort((a, b) => {
                        return b.ctime - a.ctime;
                    });
                    resolve(stats[0].path);
                }).catch(() => {
                    reject('操作压缩包stat出错')
                })
            } else {
                reject('没有最新下载的iconfont压缩包');
            }

        })
    })
}

// 解压压缩包
function unzipDownload() {
    return new Promise((resolve, reject) => {
        getLatestZipPath().then((zipPath) => {
            console.log(chalk.blue('开始解压压缩包...'));
            const browserDownloadUnzipPath = getBrowserDownloadUnzipPath();
            const readStream = fs.createReadStream(zipPath);
            const writeStream = unzip.Extract({path: browserDownloadUnzipPath});
            writeStream.on('finish', () => {
                // 确保数据已经写完了
                setTimeout(() => {
                    console.log(chalk.blue('解压完毕'));
                    resolve('解压完毕');
                }, 500)
            });
            writeStream.on('error', () => {
                reject('解压失败');
            });
            readStream.pipe(writeStream);
        }).catch(err => {
            reject(err);
        })
    })
}

function unzipAndCopy() {
    unzipDownload().then(() => {
        getUnzipDirectory().then((path) => {
            copyFilesToProject(path).then(() => {
                console.log(chalk.green('完成'));
            })
        })
    }).catch(err => {
        console.log(chalk.red(err));
    })
}

// 监听下载文件夹
function watchDownloadDirectory() {
    console.log(chalk.yellow('正在监听下载文件夹...'));
    let isEnter = false;
    const watcher = fs.watch(getBrowserDownloadPath(), (eventType, filename) => {
        if (!isEnter) {
            console.log(chalk.cyan('文件正在下载中...'));
            isEnter = true;
        }
        const regExpDownLoadFile = /^download.*(zip)$/;
        if (eventType === 'change' && regExpDownLoadFile.test(filename)) {
            watcher.close();
            // 等待半秒，让数据填充完毕
            setTimeout(() => {
                console.log(chalk.blue('文件下载完毕'));
                unzipAndCopy();
            }, 500);
        }
    });
}

module.exports = {
    getBrowserDownloadPath,
    getBrowserDownloadUnzipPath,
    getTempConfigPath,
    generateTempConfigFile,
    openTempConfigFile,
    openDownloadLinkInBrowser,
    getConfig,
    getUnzipDirectory,
    copyFilesToProject,
    getLatestZipPath,
    unzipDownload,
    unzipAndCopy,
    watchDownloadDirectory,
};

