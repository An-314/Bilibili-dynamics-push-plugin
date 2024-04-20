import common from '../../lib/common/common.js'
import puppeteer from 'puppeteer'
import crypto from 'crypto'

/**
 * 作者：AnZreww 
 * Github：An-314
 * 
 * 本插件均遵循 GPL3.0 开源协议
 * 
 * 请勿使用本插件进行盈利等商业活动行为
 * 
 * 在使用时修改下面的配置即可
 */

// 要推送的群 格式 [xxxxxxxxx, xxxxxxxxx]
let pushGroups = [xxxxxxxxx]
// 要推送的Botqq
let Botqq = xxxxxxxxx
// 推送时间：cron表达式
let pushtime = `0 1 * * *`
// 是否启用无头模式
let isheadless = true
// 输入log
let islog = true

export class dynamics_push extends plugin {
    constructor() {
        super({
            name: 'B站动态推送',
            dsc: 'B站动态推送',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#B站动态推送$',
                    fnc: 'DynamicsPush',
                    permission: 'master'
                }
            ]
        });
        this.task = {
            cron: pushtime,
            name: 'DynamicsPush',
            fnc: this.DynamicsPush.bind(this)
        }
    }
    async DynamicsPush() {
        logger.mark(`[B站动态推送]:开始B站动态推送`)
        let gs_dynamics = await this.scrapeDynamics('401742377'); // 原神
        let rs_dynamics = await this.scrapeDynamics('1340190821'); // 崩铁
        // 在这里添加更多用户的UID
        let dynamics = gs_dynamics.concat(rs_dynamics);
        await this.pushDynamics(dynamics);
    }

    /**
     * 获取指定B站用户的动态信息。
     * 此函数启动一个无头浏览器，导航到指定的B站用户动态页面，提取最新的动态信息，包括标题、链接、视频封面和图片。
     * 函数处理包括等待动态加载、点击图片预览以获取全部图片URL，并清理URL格式。
     * 
     * @param {string} uid - B站用户的唯一标识符（UID）。
     * @return {Promise<Array>} 返回一个包含动态信息的数组，每个元素是一个对象，包含动态的标题、链接、视频封面和图片列表。
     * 每个动态对象包括：
     * - title: 动态的标题文本。
     * - link: 指向动态详细页的链接。
     * - video_cover: 如果动态包含视频，则提供视频封面的URL。
     * - images: 动态包含的所有图片的URL数组。
     * 
     * @throws {Error} 如果在获取动态过程中发生错误，会记录错误并抛出异常。
     * 
     * 示例返回值:
     * [{
     *   title: "最新动态标题",
     *   link: "https://www.bilibili.com/some/link",
     *   video_cover: "https://example.com/path/to/video_cover.jpg",
     *   images: ["https://example.com/path/to/image1.jpg", "https://example.com/path/to/image2.jpg"]
     * }]
     */
    async scrapeDynamics(uid) {
        // 启动浏览器
        const browser = await puppeteer.launch({ headless: isheadless });
        const page = await browser.newPage();

        // 构建目标URL
        const url = `https://space.bilibili.com/${uid}/dynamic`;

        try {
            logger.mark("[获取B站动态]开始获取B站动态");
            // 导航到目标页面
            await page.goto(url, { waitUntil: 'networkidle0' });
            // 等待动态内容加载
            await page.waitForSelector('.bili-dyn-item__main');
            // 从页面中提取动态信息
            const dynamics = await page.evaluate(async () => {
                const clickAndExtractImages = async (preImages, card) => {
                    const allImagesSrc = [];
                    for (const preview of preImages) {
                        preview.click();
                        await new Promise(r => setTimeout(r, 500));
                        const images = Array.from(card.querySelectorAll('.bili-album__watch__content img'));
                        images.forEach(img => img.src = img.src.replace(/@.*$/, '')); // 移除URL中的分辨率参数
                        allImagesSrc.push(...images.map(img => img.src));
                    }
                    return allImagesSrc;
                };
                const cards = Array.from(document.querySelectorAll('.bili-dyn-item__main')).slice(0, 5);
                return Promise.all(cards.map(async card => {
                    const previewElement = card.querySelector('.bili-album__preview');
                    let images = [];
                    if (previewElement) {
                        pre_images = Array.from(card.querySelectorAll('.bili-album__preview__picture'))
                        images = await clickAndExtractImages(pre_images, card);
                    }
                    return {
                        title: card.querySelector('.bili-rich-text')?.innerText,
                        link: card.querySelector('a')?.href,
                        video_cover: card.querySelector('.bili-dyn-card-video__cover .b-img .b-img__inner img')?.src.replace(/@.*$/, ''),
                        images: images
                    };
                }));
            });
            await browser.close();
            if (islog) logger.mark(dynamics);
            return dynamics;
        } catch (error) {
            logger.error('Error fetching dynamics:', error);
        }
        // 关闭浏览器
        await browser.close();
    }

    /**
     * 推送新的B站动态到指定的群组。
     * 此函数首先计算传入动态的哈希值，比较数据库中存储的哈希值来确定哪些动态是新的。之后，将这些新动态格式化为消息，并发送到配置的群组中。
     * 函数处理包括哈希计算、数据库读写操作和通过机器人API发送消息。
     *
     * @param {Array} dynamics - 包含动态对象的数组，每个对象包含标题、链接、视频封面和图片列表。
     * @return {Promise<void>} 无返回值，但函数执行中可能会抛出异常。
     *
     * 动态对象示例:
     * {
     *   title: "动态标题",
     *   link: "https://example.com/dynamic",
     *   video_cover: "https://example.com/video.jpg",
     *   images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
     * }
     *
     * @throws {Error} 如果在推送过程中遇到任何错误，例如网络请求失败或数据库操作出错，将记录并抛出异常。
     */
    async pushDynamics(dynamics) {
        logger.mark('[B站动态推送]:开始推送动态');

        // 使用 dynamics 的 title 属性计算哈希
        let new_dynamic_hash = dynamics.map(item => this.hash(item.title));
        // 从数据库中获取已有动态的哈希
        let dynamics_hash = await redis.get('bilibili_dynamics');
        logger.mark('[B站动态推送]:原有动态哈希', dynamics_hash);
        dynamics_hash = dynamics_hash ? JSON.parse(dynamics_hash) : [];
        // 筛选出新动态
        const unique_dynamics = dynamics.filter((item, index) => !dynamics_hash.includes(new_dynamic_hash[index]));
        // 使用所有新的哈希码替代旧的哈希码存储到数据库
        await redis.set('bilibili_dynamics', JSON.stringify(new_dynamic_hash));

        logger.mark(`[B站动态推送]:共${unique_dynamics.length}条新动态`)
        for (let item of unique_dynamics) {
            let msgList = [
                `【布布喵喵提醒您：B站动态推送】`,
                `\n${item.title}`,
            ]
            if (item.video_cover) {
                msgList.push(segment.image(item.video_cover))
            }
            if (item.link) {
                msgList.push(`\n${item.link}`);
            }
            for (let img of item.images) {
                msgList.push(segment.image(img))
            }
            for (let items of pushGroups) {
                Bot[Botqq].pickGroup(items).sendMsg(msgList)
                    .then(() => logger.mark(`[B站动态推送]:群${items}推送完成`))
                    .catch((err) => logger.error(`[B站动态推送]:群${items}推送失败\n错误码:${err.code}\n错误信息:${err.message}`))
                await common.sleep(10000)
            }
        }
    }

    /**
     * 使用 MD5 算法对给定字符串进行哈希计算。
     * 此函数接受一个字符串作为输入，并返回该字符串的 MD5 哈希值。通常用于数据完整性验证或在将数据存储到数据库前进行哈希处理。
     *
     * @param {string} str - 需要进行哈希处理的字符串。
     * @return {string} 返回计算后的MD5哈希值，格式为32个字符的十六进制数。
     */
    hash(str) {
        return crypto.createHash('md5').update(str).digest('hex');
    }
}
