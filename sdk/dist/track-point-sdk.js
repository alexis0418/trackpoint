"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// TrackPointSDK 类用于埋点数据收集与上报
class TrackPointSDK {
    constructor(config) {
        this.commonParams = {}; // 公共参数
        this.eventQueue = []; // 事件队列
        this.isSending = false; // 是否正在发送事件
        this.config = config;
        this.initialize()
            .then(() => {
            this.startBatchProcessor(); // 开启批处理处理器
            this.sendEvent('PAGE_VIEW', {
                page_url: window.location.href,
                referrer: document.referrer,
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
            });
        })
            .catch((error) => {
            console.error('TrackPointSDK 初始化失败:', error);
        });
    }
    static getInstance(config) {
        if (!TrackPointSDK.instance) {
            TrackPointSDK.instance = new TrackPointSDK(config);
        }
        return TrackPointSDK.instance;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const userAgent = navigator.userAgent;
            const os = this.getOS(userAgent); // 获取操作系统
            const browser = this.getBrowser(userAgent); // 获取浏览器信息
            const uid = this.generateUID(); // 生成唯一用户ID
            const ipData = yield this.getIP(); // 获取IP信息
            this.addCommonParams({
                os,
                browser,
                uid,
                ip: ipData.ip,
                user_agent: userAgent,
                referrer: document.referrer,
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                country: ipData.country || 'Unknown',
                region: ipData.region || 'Unknown',
                city: ipData.city || 'Unknown',
            });
            this.monitorWhiteScreen(); // 监听白屏事件
            this.setupGlobalErrorHandlers(); // 设置全局错误处理
            this.monitorPageStayTime(); // 监听页面停留时间
            this.monitorPerformance(); // 监听页面性能
            this.monitorStyleLoss(); // 监听样式丢失事件
        });
    }
    getOS(userAgent) {
        if (/Windows/i.test(userAgent))
            return 'Windows';
        if (/Macintosh/i.test(userAgent))
            return 'Mac';
        if (/Linux/i.test(userAgent))
            return 'Linux';
        return 'Unknown';
    }
    getBrowser(userAgent) {
        if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent))
            return 'Chrome';
        if (/Firefox/i.test(userAgent))
            return 'Firefox';
        if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent))
            return 'Safari';
        if (/Edge/i.test(userAgent))
            return 'Edge';
        return 'Unknown';
    }
    generateUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    getIP() {
        return __awaiter(this, void 0, void 0, function* () {
            const backendUrl = this.config.backendUrl || 'http://localhost:3002';
            try {
                const response = yield fetch(`${backendUrl}/proxy/ip`);
                const data = yield response.json();
                return {
                    ip: data.ip || '127.0.0.1',
                    country: data.country || 'Unknown',
                    region: data.region || 'Unknown',
                    city: data.city || 'Unknown'
                };
            }
            catch (error) {
                console.error('获取 IP 地址失败:', error);
                return { ip: '127.0.0.1', country: 'Unknown', region: 'Unknown', city: 'Unknown' };
            }
        });
    }
    addCommonParams(params) {
        this.commonParams = Object.assign(Object.assign({}, this.commonParams), params);
    }
    sendEvent(eventName, params = {}) {
        const clientTimestamp = new Date().toISOString(); // 客户端时间戳
        // 合并公共参数和事件参数
        const fullParams = Object.assign(Object.assign(Object.assign({}, this.commonParams), params), { client_timestamp: clientTimestamp // 客户端时间戳
         });
        this.eventQueue.push({ eventName, params: fullParams }); // 将事件添加到队列
        // 如果达到批处理大小，则触发发送
        if (this.eventQueue.length >= (this.config.batch_size || 10)) {
            this.sendBatch();
        }
    }
    sendBatch() {
        return __awaiter(this, arguments, void 0, function* (retries = 0) {
            if (this.isSending || this.eventQueue.length === 0)
                return;
            this.isSending = true;
            const batch = this.eventQueue.splice(0, this.config.batch_size || 10); // 提取一批事件
            try {
                const backendUrl = this.config.backendUrl || 'http://localhost:3002';
                yield fetch(`${backendUrl}/track-point`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        events: batch.map(event => ({
                            project_id: this.config.project_id,
                            event_name: event.eventName,
                            event_params: event.params
                        }))
                    }),
                });
            }
            catch (error) {
                console.error('事件发送失败:', error);
                if (retries < (this.config.max_retries || 3)) {
                    setTimeout(() => this.sendBatch(retries + 1), 1000); // 重试发送
                }
                else {
                    console.error('超过最大重试次数，放弃本批数据');
                }
            }
            finally {
                this.isSending = false;
            }
        });
    }
    startBatchProcessor() {
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.sendBatch();
            }
        }, this.config.batch_wait_time || 5000);
    }
    monitorWhiteScreen() {
        const startTime = Date.now();
        const whiteScreenThreshold = 5000; // 白屏阈值（5秒）
        const domContentLoadedHandler = () => {
            const duration = Date.now() - startTime;
            if (duration > whiteScreenThreshold) {
                this.sendEvent('WHITE_SCREEN_EVENT', { duration });
            }
        };
        const loadHandler = () => {
            const duration = Date.now() - startTime;
            if (duration > whiteScreenThreshold) {
                this.sendEvent('WHITE_SCREEN_EVENT', { duration });
            }
        };
        const timeoutId = setTimeout(() => {
            this.sendEvent('WHITE_SCREEN_EVENT', { duration: whiteScreenThreshold });
        }, whiteScreenThreshold);
        document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
        window.addEventListener('load', loadHandler);
        const removeListeners = () => {
            clearTimeout(timeoutId);
            document.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
            window.removeEventListener('load', loadHandler);
        };
        document.addEventListener('DOMContentLoaded', removeListeners);
        window.addEventListener('load', removeListeners);
    }
    setupGlobalErrorHandlers() {
        window.onerror = (message, source, lineno, colno, error) => {
            let errorMessage;
            if (typeof message === 'string') {
                errorMessage = message;
            }
            else if (error instanceof Error) {
                errorMessage = error.message;
            }
            else {
                errorMessage = '未知错误';
            }
            this.captureError({
                message: errorMessage,
                stack: error === null || error === void 0 ? void 0 : error.stack,
                source,
                lineno,
                colno,
                page_url: window.location.href,
            });
            return false;
        };
        window.onunhandledrejection = (event) => {
            const reason = event.reason;
            let message = '未处理的 Promise 拒绝';
            let stack = '';
            if (reason) {
                if (typeof reason === 'object' && reason.message) {
                    message = reason.message;
                    stack = reason.stack;
                }
                else if (typeof reason === 'string') {
                    message = reason;
                }
            }
            this.captureError({
                message,
                stack,
                page_url: window.location.href,
            });
            event.preventDefault();
        };
    }
    captureError(error) {
        this.sendEvent('ERROR_EVENT', {
            message: error.message,
            stack: error.stack,
            source: error.source,
            lineno: error.lineno,
            colno: error.colno,
            page_url: error.page_url || window.location.href,
        });
    }
    monitorPageStayTime() {
        const startTime = Date.now();
        const sendStayTime = () => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.sendEvent('PAGE_STAY_TIME', { duration });
        };
        window.addEventListener('beforeunload', sendStayTime);
        window.addEventListener('unload', sendStayTime);
    }
    monitorPerformance() {
        if (window.performance) {
            const performanceData = window.performance.timing;
            const loadTime = performanceData.loadEventEnd - performanceData.navigationStart;
            const firstScreenTime = performanceData.domContentLoadedEventEnd - performanceData.navigationStart;
            this.sendEvent('PERFORMANCE_DATA', {
                load_time: loadTime,
                first_screen_time: firstScreenTime,
            });
        }
    }
    monitorStyleLoss() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' &&
                    mutation.attributeName === 'style' &&
                    mutation.target instanceof Element) {
                    this.sendEvent('STYLE_LOSS', {
                        element: mutation.target.tagName,
                        style: mutation.oldValue || 'N/A',
                    });
                }
            });
        });
        observer.observe(document.body, {
            attributes: true,
            subtree: true,
        });
    }
}
TrackPointSDK.instance = null; // 单例模式实例
// 在全局范围内暴露 TrackPointSDK 实例
window.TrackPointSDK = TrackPointSDK;
