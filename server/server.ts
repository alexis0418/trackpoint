import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 定义 IP 接口响应的数据结构
interface IpApiResponse {
  rs: number;
  code: number;
  address: string;
  ip: string;
  isDomain: number;
}

// 定义事件参数结构
interface EventParams {
  [key: string]: any;
}

// 定义 MongoDB 中事件文档的结构
interface EventDocument extends mongoose.Document {
  project_id: string;
  event_name: string;
  event_params: EventParams;
  timestamp: Date;
  os: string;
  browser: string;
  uid: string;
  ip: string;
  user_agent: string;
  referrer: string;
  screen_resolution: string;
  language: string;
  country: string;
  region: string;
  city: string;
  white_screen_duration?: number;
  error_message?: string;
  error_stack?: string;
  error_source?: string;
  error_lineno?: number;
  error_colno?: number;
  page_url: string;
  page_stay_time?: number;
  load_time?: number;
  first_screen_time?: number;
  style_loss?: string;
  description?: string;
}

// 定义事件的 Mongoose 模型
const EventSchema = new mongoose.Schema({
  project_id: String,
  event_name: String,
  event_params: mongoose.Schema.Types.Mixed,
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

const Event = mongoose.model<EventDocument>('Event', EventSchema);

// 连接 MongoDB 数据库
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trackpoint')
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Failed to connect to MongoDB:', error));

const app = express();
app.use(express.json()); // 使用 JSON 中间件
app.use(cors()); // 允许跨域请求

// 代理 IP 接口：获取 IP 地址及地理位置信息
app.get('/proxy/ip', async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://www.ip.cn/api/index?ip=&type=0');
    const data = await response.json() as IpApiResponse;

    // 解析地址信息，提取国家、区域和城市
    const addressParts = data.address?.split('  ') || []; // 示例：["中国", "河北省 唐山市 联通"]
    const country = addressParts[0] || 'Unknown';
    const remainingParts = addressParts[1]?.split(' ') || [];
    const region = remainingParts[0] || 'Unknown';
    const city = remainingParts[1] || 'Unknown';

    res.json({
      ip: data.ip || '127.0.0.1',
      country,
      region,
      city
    });
  } catch (error) {
    console.error('Failed to fetch IP from proxy:', error);
    res.status(500).json({ error: 'Failed to fetch IP address' });
  }
});

// 埋点事件接收接口
app.post('/track-point', async (req: Request, res: Response) => {
  const events = req.body.events;
  try {
    // 处理事件数据，将其提升为 EventDocument 格式
    const processedEvents = events.map((event: any) => {
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
    await Event.insertMany(processedEvents);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to insert events:', error);
    res.status(500).json({ success: false, error: 'Failed to insert events' });
  }
});

// 新增单个事件接口
app.post('/events', async (req: Request, res: Response) => {
  const event = req.body;
  try {
    // 创建新的事件文档并保存到数据库
    const newEvent = new Event(event);
    await newEvent.save();
    res.status(201).json({ success: true, message: '事件新增成功', data: newEvent });
  } catch (error) {
    console.error('Failed to insert event:', error);
    res.status(500).json({ success: false, error: 'Failed to insert event' });
  }
});

// 查询事件接口（支持分页和条件筛选）
app.get('/events', async (req: Request, res: Response) => {
  // 构建查询条件
  const query: any = {};
  if (req.query.project_id) query.project_id = req.query.project_id;
  if (req.query.event_name) query.event_name = req.query.event_name;
  if (req.query.uid) query.uid = req.query.uid;

  const startTime = req.query.start_time;
  const endTime = req.query.end_time;

  if (startTime && endTime) {
    query.timestamp = {
      $gte: new Date(startTime as string),
      $lte: new Date(endTime as string),
    };
  }

  try {
    // 执行查询并返回结果
    const events = await Event.find(query)
      .sort({ timestamp: -1 }) // 按时间倒序排序
      .skip((Number(req.query.page) - 1) * Number(req.query.limit)) // 分页
      .limit(Number(req.query.limit));
    const total = await Event.countDocuments(query); // 获取总记录数
    res.status(200).json({ success: true, data: events, total });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// 统计 PV/UV 接口
app.get('/stats/pv-uv', async (req: Request, res: Response) => {
  // 构建查询条件
  const query: any = {};
  if (req.query.project_id) query.project_id = req.query.project_id;
  if (req.query.event_name) query.event_name = req.query.event_name;

  const startTime = req.query.start_time;
  const endTime = req.query.end_time;

  if (startTime && endTime) {
    query.timestamp = {
      $gte: new Date(startTime as string),
      $lte: new Date(endTime as string),
    };
  }

  try {
    // 统计 PV 和 UV
    const pv = await Event.countDocuments(query);
    const uv = await Event.distinct('uid', query).then((ids) => ids.length);
    res.status(200).json({ success: true, pv, uv });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// 获取所有事件名称列表接口
app.get('/event', async (req: Request, res: Response) => {
  try {
    // 获取所有事件名称
    const eventNames = await Event.distinct('event_name').exec();
    // 格式化为 API 响应
    const formattedData = eventNames.map((name: string) => ({ event_name: name }));
    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Failed to fetch event definitions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event definitions' });
  }
});

// 删除事件接口
app.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 删除指定 ID 的事件
    const result = await Event.findByIdAndDelete(id);
    if (result) {
      res.status(200).json({ success: true, message: '事件删除成功' });
    } else {
      res.status(404).json({ success: false, error: '事件未找到' });
    }
  } catch (error) {
    console.error('Failed to delete event:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// 修改事件接口
app.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedEvent = req.body;
    // 更新指定 ID 的事件
    const result = await Event.findByIdAndUpdate(id, updatedEvent, { new: true });
    if (result) {
      res.status(200).json({ success: true, message: '事件更新成功' });
    } else {
      res.status(404).json({ success: false, error: '事件未找到' });
    }
  } catch (error) {
    console.error('Failed to update event:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});