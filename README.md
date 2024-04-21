# Bilibili-dynamics-push-plugin
适用于YunZaibot的B站动态推送插件。

本插件基于`puppeteer`绕过风控获取数据，读取从给定UID的用户的动态，并在指定时间向QQ群内推送。

转发后的动态是文本+图片+链接的消息格式，适配视频投稿、图片文本等等动态形式，避免了常规截图导致的只能有缩略图等信息损失。

## 依赖

本项目依赖于以下主要组件：

- **Node.js**: JavaScript 运行环境。
- **Redis**: 用作存储动态哈希的数据库。
- [**YunZai Bot**](https://github.com/TimeRainStarSky/Yunzai): YunZai 机器人。
- [**Puppeteer**](https://pptr.dev/): 用于自动化控制 Chrome 或 Chromium。
- **Crypto**: 提供加密和哈希功能。

确保你的系统中安装了 Node.js。项目中的其他依赖项将通过 `npm` 安装。

## 使用方法

### 1.下载到本地

```bash
curl -o "./plugins/example/bilibili.js" "https://github.com/An-314/Bilibili-dynamics-push-plugin/bilibili.js"
```
即将该js文件拷贝至`plugins/example`中即可。

### 2. 安装依赖

在项目目录中运行以下命令来安装所有必需的依赖：

```bash
npm install
```

## 使用说明

| 指令 | 功能 | 使用权 |
| --- | --- | ---- |
| `#B站动态推送` | 手动触发一次推送 | 主人 |

参数设置：

```js
// 要推送的群：整数数组
let pushGroups = [614685983]
// 要推送的Botqq ：整数
let Botqq = 3048321462
// 推送时间：cron表达式
let pushtime = `0 1 * * *`
// 是否启用无头模式：bool
let isheadless = true
// 输入log：bool
let islog = true
```

