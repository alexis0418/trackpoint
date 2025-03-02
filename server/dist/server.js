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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量
dotenv_1.default.config();
// 定义事件的 Mongoose 模型
const EventSchema = new mongoose_1.default.Schema({
    project_id: String,
    event_name: String,
    event_params: mongoose_1.default.Schema.Types.Mixed,
    timestamp: Date,
    os: String,
    browser: String,
    uid: String,
    ip: String,
    user_agent: String,
    referrer: String,
    screen_resolution: String,
    language: String,
    country: String,
    region: String,
    city: String,
    white_screen_duration: Number,
    error_message: String,
    error_stack: String,
    error_source: String,
    error_lineno: Number,
    error_colno: Number,
    page_url: String,
    page_stay_time: Number,
    load_time: Number,
    first_screen_time: Number,
    style_loss: String,
    description: String,
});
const Event = mongoose_1.default.model('Event', EventSchema);
// 连接 MongoDB 数据库
mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trackpoint')
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Failed to connect to MongoDB:', error));
const app = (0, express_1.default)();
app.use(express_1.default.json()); // 使用 JSON 中间件
app.use((0, cors_1.default)()); // 允许跨域请求
// 代理 IP 接口：获取 IP 地址及地理位置信息
app.get('/proxy/ip', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const response = yield (0, node_fetch_1.default)('https://www.ip.cn/api/index?ip=&type=0');
        const data = yield response.json();
        // 解析地址信息，提取国家、区域和城市
        const addressParts = ((_a = data.address) === null || _a === void 0 ? void 0 : _a.split('  ')) || []; // 示例：["中国", "河北省 唐山市 联通"]
        const country = addressParts[0] || 'Unknown';
        const remainingParts = ((_b = addressParts[1]) === null || _b === void 0 ? void 0 : _b.split(' ')) || [];
        const region = remainingParts[0] || 'Unknown';
        const city = remainingParts[1] || 'Unknown';
        res.json({
            ip: data.ip || '127.0.0.1',
            country,
            region,
            city
        });
    }
    catch (error) {
        console.error('Failed to fetch IP from proxy:', error);
        res.status(500).json({ error: 'Failed to fetch IP address' });
    }
}));
// 埋点事件接收接口
app.post('/track-point', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const events = req.body.events;
    try {
        // 处理事件数据，将其提升为 EventDocument 格式
        const processedEvents = events.map((event) => {
            const params = event.event_params;
            return {
                project_id: event.project_id,
                event_name: event.event_name,
                event_params: params,
                // 提升所有必要字段到顶层
                timestamp: new Date(params.client_timestamp || Date.now()),
                os: params.os,
                browser: params.browser,
                uid: params.uid,
                ip: params.ip,
                user_agent: params.user_agent,
                referrer: params.referrer,
                screen_resolution: params.screen_resolution,
                language: params.language,
                country: params.country,
                region: params.region,
                city: params.city,
                // 提升性能相关字段
                page_stay_time: params.page_stay_time || params.duration,
                load_time: params.load_time,
                first_screen_time: params.first_screen_time,
                white_screen_duration: params.duration,
                // 错误相关字段
                error_message: params.message,
                error_stack: params.stack,
                error_source: params.source,
                error_lineno: params.lineno,
                error_colno: params.colno,
                // 其他字段
                page_url: params.page_url,
                style_loss: params.style_loss,
                description: params.description
            };
        });
        // 将事件批量插入到 MongoDB
        yield Event.insertMany(processedEvents);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Failed to insert events:', error);
        res.status(500).json({ success: false, error: 'Failed to insert events' });
    }
}));
// 新增单个事件接口
app.post('/events', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = req.body;
    try {
        // 创建新的事件文档并保存到数据库
        const newEvent = new Event(event);
        yield newEvent.save();
        res.status(201).json({ success: true, message: '事件新增成功', data: newEvent });
    }
    catch (error) {
        console.error('Failed to insert event:', error);
        res.status(500).json({ success: false, error: 'Failed to insert event' });
    }
}));
// 查询事件接口（支持分页和条件筛选）
app.get('/events', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 构建查询条件
    const query = {};
    if (req.query.project_id)
        query.project_id = req.query.project_id;
    if (req.query.event_name)
        query.event_name = req.query.event_name;
    if (req.query.uid)
        query.uid = req.query.uid;
    const startTime = req.query.start_time;
    const endTime = req.query.end_time;
    if (startTime && endTime) {
        query.timestamp = {
            $gte: new Date(startTime),
            $lte: new Date(endTime),
        };
    }
    try {
        // 执行查询并返回结果
        const events = yield Event.find(query)
            .sort({ timestamp: -1 }) // 按时间倒序排序
            .skip((Number(req.query.page) - 1) * Number(req.query.limit)) // 分页
            .limit(Number(req.query.limit));
        const total = yield Event.countDocuments(query); // 获取总记录数
        res.status(200).json({ success: true, data: events, total });
    }
    catch (error) {
        console.error('Failed to fetch events:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
}));
// 统计 PV/UV 接口
app.get('/stats/pv-uv', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 构建查询条件
    const query = {};
    if (req.query.project_id)
        query.project_id = req.query.project_id;
    if (req.query.event_name)
        query.event_name = req.query.event_name;
    const startTime = req.query.start_time;
    const endTime = req.query.end_time;
    if (startTime && endTime) {
        query.timestamp = {
            $gte: new Date(startTime),
            $lte: new Date(endTime),
        };
    }
    try {
        // 统计 PV 和 UV
        const pv = yield Event.countDocuments(query);
        const uv = yield Event.distinct('uid', query).then((ids) => ids.length);
        res.status(200).json({ success: true, pv, uv });
    }
    catch (error) {
        console.error('Failed to fetch stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
}));
// 获取所有事件名称列表接口
app.get('/event', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 获取所有事件名称
        const eventNames = yield Event.distinct('event_name').exec();
        // 格式化为 API 响应
        const formattedData = eventNames.map((name) => ({ event_name: name }));
        res.status(200).json({ success: true, data: formattedData });
    }
    catch (error) {
        console.error('Failed to fetch event definitions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch event definitions' });
    }
}));
// 删除事件接口
app.delete('/events/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // 删除指定 ID 的事件
        const result = yield Event.findByIdAndDelete(id);
        if (result) {
            res.status(200).json({ success: true, message: '事件删除成功' });
        }
        else {
            res.status(404).json({ success: false, error: '事件未找到' });
        }
    }
    catch (error) {
        console.error('Failed to delete event:', error);
        res.status(500).json({ success: false, error: '删除失败' });
    }
}));
// 修改事件接口
app.put('/events/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedEvent = req.body;
        // 更新指定 ID 的事件
        const result = yield Event.findByIdAndUpdate(id, updatedEvent, { new: true });
        if (result) {
            res.status(200).json({ success: true, message: '事件更新成功' });
        }
        else {
            res.status(404).json({ success: false, error: '事件未找到' });
        }
    }
    catch (error) {
        console.error('Failed to update event:', error);
        res.status(500).json({ success: false, error: '更新失败' });
    }
}));
// 启动服务器
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
