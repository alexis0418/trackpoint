import React, { useEffect, useState, useCallback } from 'react';
import { 
  Table, 
  Button, 
  DatePicker, 
  Select, 
  Input, 
  Card, 
  Row, 
  Col, 
  Modal, 
  Form, 
  message
} from 'antd';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import './styles.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 定义事件数据的接口
interface EventData {
  _id: string; // 事件唯一标识
  event_name: string; // 事件名称
  event_params: Record<string, any>; // 事件参数
  timestamp: string; // 时间戳
  country?: string; // 国家
  region?: string; // 地区
  page_stay_time?: number; // 页面停留时间
}

// 定义事件定义的接口
interface EventDefinition {
  _id: string; // 定义唯一标识
  event_name: string; // 事件名称
  description?: string; // 事件描述
}

// 主组件
const App: React.FC = () => {
  // 状态管理：事件列表、总条数、PV/UV、加载状态等
  const [events, setEvents] = useState<EventData[]>([]); // 存储事件数据
  const [total, setTotal] = useState<number>(0); // 存储总条数
  const [pv, setPv] = useState<number>(0); // 存储PV（页面访问量）
  const [uv, setUv] = useState<number>(0); // 存储UV（独立访客量）
  const [loading, setLoading] = useState<boolean>(false); // 加载状态

  // 状态管理：事件定义列表、加载状态、选中事件、模态框显示状态等
  const [eventsList, setEventsList] = useState<EventDefinition[]>([]); // 存储事件定义列表
  const [eventsLoading, setEventsLoading] = useState<boolean>(true); // 事件定义加载状态
  const [selectedEvent, setSelectedEvent] = useState<string>(''); // 选中事件名称
  const [isModalVisible, setIsModalVisible] = useState(false); // 编辑模态框显示状态
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null); // 编辑中的事件
  const [isAddModalVisible, setIsAddModalVisible] = useState(false); // 新增模态框显示状态
  const [form] = Form.useForm(); // 表单实例

  // 获取事件列表的函数（使用 useCallback 优化性能）
  const fetchEvents = useCallback(async (params: any = {}) => {
    setLoading(true); // 设置加载状态
    try {
      const response = await axios.get('/events', { params });
      setEvents(response.data.data || []); // 更新事件数据
      setTotal(response.data.total || 0); // 更新总条数
    } catch (error) {
      console.error('Failed to fetch events:', error); // 捕获错误
    } finally {
      setLoading(false); // 重置加载状态
    }
  }, []);

  // 获取 PV/UV 数据的函数
  const fetchStats = useCallback(async (params: any = {}) => {
    try {
      const response = await axios.get('/stats/pv-uv', { 
        params: {
          ...params,
          event_name: selectedEvent // 使用选中事件名称作为过滤条件
        }
      });
      setPv(response.data.pv || 0); // 更新PV数据
      setUv(response.data.uv || 0); // 更新UV数据
    } catch (error) {
      console.error('Failed to fetch stats:', error); // 捕获错误
    }
  }, [selectedEvent]);

  // 获取事件定义的函数
  const fetchEventDefinitions = useCallback(async () => {
    setEventsLoading(true); // 设置加载状态
    try {
      const response = await axios.get('/event');
      setEventsList(response.data.data.map((item: any) => ({
        _id: item._id,
        event_name: item.event_name,
        description: item.description
      }))); // 更新事件定义列表
    } catch (error) {
      console.error('Failed to fetch events:', error); // 捕获错误
    } finally {
      setEventsLoading(false); // 重置加载状态
    }
  }, []);

  // 初始化数据加载
  useEffect(() => {
    const init = async () => {
      await fetchEvents({ project_id: 'trackpoint_project_001' }); // 获取初始事件数据
      await fetchStats({ project_id: 'trackpoint_project_001' }); // 获取初始PV/UV数据
      await fetchEventDefinitions(); // 获取事件定义
    };
    init();
  }, [fetchEvents, fetchStats, fetchEventDefinitions]);

  // 处理搜索逻辑
  const handleSearch = (values: any) => {
    const params = {
      project_id: 'trackpoint_project_001', // 项目ID
      event_name: selectedEvent, // 使用选中事件名称作为过滤条件
      ...values, // 拼接其他搜索条件
    };
    fetchEvents(params); // 重新获取事件数据
    fetchStats(params); // 更新PV/UV数据
  };

  // 处理事件编辑
  const handleEditEvent = async () => {
    try {
      if (!editingEvent) return;

      const updatedEventData = form.getFieldsValue(); // 获取表单数据
      const response = await axios.put(`/events/${editingEvent._id}`, {
        ...editingEvent,
        ...updatedEventData
      }); // 发送更新请求

      if (response.data.success) {
        message.success('事件更新成功'); // 显示成功提示
        setIsModalVisible(false); // 关闭模态框
        fetchEvents(); // 刷新事件列表
      } else {
        message.error(response.data.error || '更新失败'); // 显示失败提示
      }
    } catch (error) {
      console.error('Update error:', error); // 捕获错误
      message.error('更新失败'); // 显示失败提示
    }
  };

  // 处理事件删除
  const handleDeleteEvent = async (record: EventData) => {
    try {
      const response = await axios.delete(`/events/${record._id}`); // 发送删除请求
      if (response.data.success) {
        message.success('事件删除成功'); // 显示成功提示
        fetchEvents(); // 刷新事件列表
      } else {
        message.error(response.data.error || '删除失败'); // 显示失败提示
      }
    } catch (error) {
      message.error('删除失败'); // 显示失败提示
    }
  };

  // 处理事件新增
  const handleAddEvent = async () => {
    try {
      const newEventData = form.getFieldsValue(); // 获取表单数据
      const response = await axios.post('/events', {
        ...newEventData,
        project_id: 'trackpoint_project_001', // 固定项目ID
        timestamp: new Date().toISOString() // 更新时间戳
      }); // 发送新增请求

      if (response.data.success) {
        message.success('事件新增成功'); // 显示成功提示
        setIsAddModalVisible(false); // 关闭模态框
        fetchEvents(); // 刷新事件列表
      } else {
        message.error(response.data.error || '新增失败'); // 显示失败提示
      }
    } catch (error) {
      console.error('Add error:', error); // 捕获错误
      message.error('新增失败'); // 显示失败提示
    }
  };

  // 生成事件趋势图表数据
  const getChartData = () => {
    const data = events.reduce((acc: Record<string, number>, event: EventData) => {
      const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++; // 按日期统计事件数量
      return acc;
    }, {} as Record<string, number>);

    return {
      xAxis: {
        type: 'category',
        data: Object.keys(data), // 横坐标数据（日期）
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: Object.values(data), // 纵坐标数据（事件数量）
          type: 'line',
          name: '事件数量',
        },
      ],
    };
  };

  // 生成用户停留时间图表数据
  const getStayTimeChartData = () => {
    const data = events.reduce((acc: Record<string, number>, event: EventData) => {
      const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += event.event_params?.duration || 0; // 按日期累加停留时间
      return acc;
    }, {} as Record<string, number>);

    return {
      xAxis: {
        type: 'category',
        data: Object.keys(data), // 横坐标数据（日期）
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: Object.values(data), // 纵坐标数据（停留时间）
          type: 'line',
          name: '用户停留时间',
        },
      ],
    };
  };

  // 生成页面性能图表数据
  const getPerformanceChartData = () => {
    const loadTimeData = events.reduce((acc: Record<string, number>, event: EventData) => {
      const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += event.event_params?.load_time || 0; // 按日期累加载时间
      return acc;
    }, {} as Record<string, number>);

    const firstScreenTimeData = events.reduce((acc: Record<string, number>, event: EventData) => {
      const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += event.event_params?.first_screen_time || 0; // 按日期累加首屏时间
      return acc;
    }, {} as Record<string, number>);

    return {
      xAxis: {
        type: 'category',
        data: Object.keys(loadTimeData), // 横坐标数据（日期）
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: Object.values(loadTimeData), // 纵坐标数据（页面加载时间）
          type: 'line',
          name: '页面加载时间',
        },
        {
          data: Object.values(firstScreenTimeData), // 纵坐标数据（首屏加载时间）
          type: 'line',
          name: '首屏加载时间',
        },
      ],
    };
  };

  // 生成用户分布图表数据
  const getUserDistributionChartData = () => {
    const data: Record<string, number> = events.reduce((acc, event: EventData) => {
      const region = event.region || '未知'; // 地区
      if (!acc[region]) {
        acc[region] = 0;
      }
      acc[region]++; // 按地区统计用户数量
      return acc;
    }, {} as Record<string, number>);

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)',
      },
      legend: {
        left: 'center',
        top: 'bottom',
        data: Object.keys(data), // 图例数据
      },
      series: [
        {
          name: '地区分布',
          type: 'pie',
          radius: [20, 140],
          center: ['50%', '50%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 5,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
            },
          },
          data: Object.entries(data).map(([name, value]) => ({
            value,
            name,
          })), // 地区分布数据
        },
      ],
    };
  };

  // PV/UV 统计卡片组件
  const StatsCard = () => (
    <Card>
      <h2 className="title">PV/UV</h2>
      <div className="content">
        <div>
          <span className="label">PV : </span>
          <span className="value pv-value">{pv}</span>
        </div>
        <div>
          <span className="label">UV : </span>
          <span className="value uv-value">{uv}</span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container">
      <h1>埋点数据看板</h1>
      {/* 筛选条件部分 */}
      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <RangePicker
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  handleSearch({
                    start_time: dates[0].toISOString(),
                    end_time: dates[1].toISOString()
                  }); // 根据时间范围查询
                }
              }}
            />
          </Col>
          <Col span={4}>
            <Input 
              placeholder="用户ID" 
              onChange={(e) => handleSearch({ uid: e.target.value })} // 根据用户ID查询
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择事件类型"
              onChange={(value) => {
                setSelectedEvent(value); // 更新选中事件
                handleSearch({ event_name: value }); // 根据事件名称查询
              }}
            >
              <Option value="CLICK_EVENT">点击事件</Option>
              <Option value="PAGE_VIEW">页面浏览</Option>
              <Option value="WHITE_SCREEN_EVENT">白屏事件</Option>
              <Option value="ERROR_EVENT">错误事件</Option>
              <Option value="PAGE_STAY_TIME">停留时间</Option>
              <Option value="PERFORMANCE_DATA">性能数据</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button 
              type="primary" 
              onClick={() => handleSearch({})} // 重置查询条件
            >
              查询
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginTop: '20px' }}>
        <Col span={12}>
          <StatsCard /> {/* 显示PV/UV统计卡片 */}
        </Col>
        <Col span={12}>
          <Card>
            <h2>用户分布</h2>
            <ReactECharts option={getUserDistributionChartData()} /> {/* 显示用户分布图表 */}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={12}>
          <Card>
            <h2>事件趋势</h2>
            <ReactECharts option={getChartData()} /> {/* 显示事件趋势图表 */}
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <h2>用户停留时间</h2>
            <ReactECharts option={getStayTimeChartData()} /> {/* 显示用户停留时间图表 */}
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 20 }}>
        <h2>页面性能</h2>
        <ReactECharts option={getPerformanceChartData()} /> {/* 显示页面性能图表 */}
      </Card>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={12}>
          <h2>事件列表</h2>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Button type="primary" onClick={() => setIsAddModalVisible(true)}> {/* 显示新增事件按钮 */}
            新增
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={events} //* 数据源 */
        rowKey="_id" //* 行唯一标识 */
        loading={loading} //* 加载状态 */
        pagination={{ 
          total, 
          pageSize: 10, 
          onChange: (page) => fetchEvents({ page }) 
        }} //* 分页配置 */
      >
        <Table.Column title="事件名称" dataIndex="event_name" /> {/* 显示事件名称列 */}
        <Table.Column 
          title="参数" 
          dataIndex="event_params" 
          render={(params) => JSON.stringify(params)} //* 显示事件参数 */
        />
        <Table.Column 
          title="时间" 
          dataIndex="timestamp" 
          render={(text) => moment(text).format('YYYY-MM-DD HH:mm:ss')} //** 显示事件时间 */
        />
        <Table.Column
          title="操作"
          key="actions"
          render={(_, record: EventData) => (
            <React.Fragment>
              <Button
                type="link"
                onClick={() => {
                  setEditingEvent(record); // 设置编辑状态
                  form.setFieldsValue(record); // 设置表单初始值
                  setIsModalVisible(true); // 打开编辑模态框
                }}
              >
                修改
              </Button>
              <Button
                type="link"
                danger
                onClick={() => handleDeleteEvent(record)} // 删除事件
              >
                删除
              </Button>
            </React.Fragment>
          )}
        />
      </Table>

      <Modal
        title="修改事件"
        open={isModalVisible} //* 控制模态框显示状态 */
        onCancel={() => {
          setIsModalVisible(false); // 关闭模态框
          setEditingEvent(null); // 重置编辑状态
          form.resetFields(); // 重置表单
        }}
        onOk={() => {
          form.submit(); // 提交表单
        }}
      >
        <Form
          form={form}
          onFinish={handleEditEvent} // 提交时触发编辑事件
        >
          <Form.Item
            label="事件名称"
            name="event_name"
            rules={[{ required: true }]} // 事件名称必填
          >
            <Input disabled /> {/* 禁用事件名称输入 */}
          </Form.Item>
          <Form.Item label="事件参数" name="event_params">
            <Input.TextArea /> {/* 事件参数输入框 */}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增事件"
        open={isAddModalVisible} //*控制模态框显示状态 */
        onCancel={() => {
          setIsAddModalVisible(false); // 关闭模态框
          form.resetFields(); // 重置表单
        }}
        onOk={() => {
          form.submit(); // 提交表单
        }}
      >
        <Form
          form={form}
          onFinish={handleAddEvent} // 提交时触发新增事件
        >
          <Form.Item
            label="事件名称"
            name="event_name"
            rules={[{ required: true }]} // 事件名称必填
          >
            <Select
              placeholder="选择事件类型"
              loading={eventsLoading} // 显示加载状态
              options={eventsList.map(event => (/* 显示事件定义选项 */ {
                value: event.event_name,
                label: event.event_name
              }))} 
              onChange={(value) => {
                setSelectedEvent(value); // 更新选中事件
              }}
            />
          </Form.Item>
          <Form.Item label="事件参数" name="event_params">
            <Input.TextArea /> {/* 事件参数输入框 */}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default App;