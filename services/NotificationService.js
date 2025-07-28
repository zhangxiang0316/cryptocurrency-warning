/**
 * 通知服务类
 * 负责处理各种类型的通知发送
 */

const https = require('https');
const config = require('../config');

class NotificationService {
  constructor() {
    this.sentAlerts = new Map();
    this.startCleanupTask();
  }

  /**
   * 发送微信预警消息
   * @param {string} content - 消息内容
   * @param {string} alertKey - 预警键值，用于防重复
   * @returns {Promise<boolean>} 发送是否成功
   */
  async sendWechatAlert(content, alertKey = null) {
    // 检查是否需要防重复
    if (alertKey && this.sentAlerts.has(alertKey)) {
      console.log(`预警已发送，跳过重复消息: ${alertKey}`);
      return false;
    }

    try {
      const success = await this._sendToWechat(content);

      if (success && alertKey) {
        // 记录已发送的预警
        this.sentAlerts.set(alertKey, Date.now());

        // 设置冷却期
        setTimeout(() => {
          this.sentAlerts.delete(alertKey);
        }, config.alerts.cooldownPeriod);
      }

      return success;
    } catch (error) {
      console.error('发送微信预警失败:', error.message);
      return false;
    }
  }

  /**
   * 实际发送微信消息的私有方法
   * @param {string} content - 消息内容
   * @returns {Promise<boolean>}
   */
  _sendToWechat(content) {
    return new Promise((resolve) => {
      const webhookUrl = `${config.wechat.apiUrl}?key=${config.wechat.webhookKey}`;
      const postData = JSON.stringify({
        msgtype: 'text',
        text: { content }
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(webhookUrl, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.errcode === 0) {
              console.log(`✅ 微信预警发送成功: ${new Date().toLocaleString()}`);
              resolve(true);
            } else {
              console.error(`❌ 微信预警发送失败: ${response.errmsg}`);
              resolve(false);
            }
          } catch (error) {
            console.error('解析微信响应失败:', error.message);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`发送微信预警网络错误: ${error.message}`);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 启动清理任务，定期清理过期的预警记录
   */
  startCleanupTask() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      this.sentAlerts.forEach((timestamp, key) => {
        if (now - timestamp > config.alerts.maxAlertAge) {
          this.sentAlerts.delete(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 清理了 ${cleanedCount} 条过期预警记录`);
      }
    }, config.alerts.cleanupInterval);
  }

  /**
   * 获取当前活跃的预警数量
   * @returns {number}
   */
  getActiveAlertsCount() {
    return this.sentAlerts.size;
  }

  /**
   * 清除所有预警记录
   */
  clearAllAlerts() {
    this.sentAlerts.clear();
    console.log('🗑️ 已清除所有预警记录');
  }
}

module.exports = NotificationService;