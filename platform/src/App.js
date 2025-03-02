import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, DatePicker, Select, Input, Card, Row, Col, Modal, Form, message } from 'antd';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import './styles.css';
const { RangePicker } = DatePicker;
const { Option } = Select;
// 主组件
const App = () => {
    // 状态管理：事件列表、总条数、PV/UV、加载状态等
    const [events, setEvents] = useState([]); // 存储事件数据
    const [total, setTotal] = useState(0); // 存储总条数
    const [pv, setPv] = useState(0); // 存储PV（页面访问量）
    const [uv, setUv] = useState(0); // 存储UV（独立访客量）
    const [loading, setLoading] = useState(false); // 加载状态
    // 状态管理：事件定义列表、加载状态、选中事件、模态框显示状态等
    const [eventsList, setEventsList] = useState([]); // 存储事件定义列表
    const [eventsLoading, setEventsLoading] = useState(true); // 事件定义加载状态
    const [selectedEvent, setSelectedEvent] = useState(''); // 选中事件名称
    const [isModalVisible, setIsModalVisible] = useState(false); // 编辑模态框显示状态
    const [editingEvent, setEditingEvent] = useState(null); // 编辑中的事件
    const [isAddModalVisible, setIsAddModalVisible] = useState(false); // 新增模态框显示状态
    const [form] = Form.useForm(); // 表单实例
    // 获取事件列表的函数（使用 useCallback 优化性能）
    const fetchEvents = useCallback(async (params = {}) => {
        setLoading(true); // 设置加载状态
        try {
            const response = await axios.get('/events', { params });
            setEvents(response.data.data || []); // 更新事件数据
            setTotal(response.data.total || 0); // 更新总条数
        }
        catch (error) {
            console.error('Failed to fetch events:', error); // 捕获错误
        }
        finally {
            setLoading(false); // 重置加载状态
        }
    }, []);
    // 获取 PV/UV 数据的函数
    const fetchStats = useCallback(async (params = {}) => {
        try {
            const response = await axios.get('/stats/pv-uv', {
                params: {
                    ...params,
                    event_name: selectedEvent // 使用选中事件名称作为过滤条件
                }
            });
            setPv(response.data.pv || 0); // 更新PV数据
            setUv(response.data.uv || 0); // 更新UV数据
        }
        catch (error) {
            console.error('Failed to fetch stats:', error); // 捕获错误
        }
    }, [selectedEvent]);
    // 获取事件定义的函数
    const fetchEventDefinitions = useCallback(async () => {
        setEventsLoading(true); // 设置加载状态
        try {
            const response = await axios.get('/event');
            setEventsList(response.data.data.map((item) => ({
                _id: item._id,
                event_name: item.event_name,
                description: item.description
            }))); // 更新事件定义列表
        }
        catch (error) {
            console.error('Failed to fetch events:', error); // 捕获错误
        }
        finally {
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
    const handleSearch = (values) => {
        const params = {
            project_id: 'trackpoint_project_001',
            event_name: selectedEvent,
            ...values, // 拼接其他搜索条件
        };
        fetchEvents(params); // 重新获取事件数据
        fetchStats(params); // 更新PV/UV数据
    };
    // 处理事件编辑
    const handleEditEvent = async () => {
        try {
            if (!editingEvent)
                return;
            const updatedEventData = form.getFieldsValue(); // 获取表单数据
            const response = await axios.put(`/events/${editingEvent._id}`, {
                ...editingEvent,
                ...updatedEventData
            }); // 发送更新请求
            if (response.data.success) {
                message.success('事件更新成功'); // 显示成功提示
                setIsModalVisible(false); // 关闭模态框
                fetchEvents(); // 刷新事件列表
            }
            else {
                message.error(response.data.error || '更新失败'); // 显示失败提示
            }
        }
        catch (error) {
            console.error('Update error:', error); // 捕获错误
            message.error('更新失败'); // 显示失败提示
        }
    };
    // 处理事件删除
    const handleDeleteEvent = async (record) => {
        try {
            const response = await axios.delete(`/events/${record._id}`); // 发送删除请求
            if (response.data.success) {
                message.success('事件删除成功'); // 显示成功提示
                fetchEvents(); // 刷新事件列表
            }
            else {
                message.error(response.data.error || '删除失败'); // 显示失败提示
            }
        }
        catch (error) {
            message.error('删除失败'); // 显示失败提示
        }
    };
    // 处理事件新增
    const handleAddEvent = async () => {
        try {
            const newEventData = form.getFieldsValue(); // 获取表单数据
            const response = await axios.post('/events', {
                ...newEventData,
                project_id: 'trackpoint_project_001',
                timestamp: new Date().toISOString() // 更新时间戳
            }); // 发送新增请求
            if (response.data.success) {
                message.success('事件新增成功'); // 显示成功提示
                setIsAddModalVisible(false); // 关闭模态框
                fetchEvents(); // 刷新事件列表
            }
            else {
                message.error(response.data.error || '新增失败'); // 显示失败提示
            }
        }
        catch (error) {
            console.error('Add error:', error); // 捕获错误
            message.error('新增失败'); // 显示失败提示
        }
    };
    // 生成事件趋势图表数据
    const getChartData = () => {
        const data = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date]++; // 按日期统计事件数量
            return acc;
        }, {});
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
                    data: Object.values(data),
                    type: 'line',
                    name: '事件数量',
                },
            ],
        };
    };
    // 生成用户停留时间图表数据
    const getStayTimeChartData = () => {
        const data = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += event.event_params?.duration || 0; // 按日期累加停留时间
            return acc;
        }, {});
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
                    data: Object.values(data),
                    type: 'line',
                    name: '用户停留时间',
                },
            ],
        };
    };
    // 生成页面性能图表数据
    const getPerformanceChartData = () => {
        const loadTimeData = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += event.event_params?.load_time || 0; // 按日期累加载时间
            return acc;
        }, {});
        const firstScreenTimeData = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD'); // 提取日期
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += event.event_params?.first_screen_time || 0; // 按日期累加首屏时间
            return acc;
        }, {});
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
                    data: Object.values(loadTimeData),
                    type: 'line',
                    name: '页面加载时间',
                },
                {
                    data: Object.values(firstScreenTimeData),
                    type: 'line',
                    name: '首屏加载时间',
                },
            ],
        };
    };
    // 生成用户分布图表数据
    const getUserDistributionChartData = () => {
        const data = events.reduce((acc, event) => {
            const region = event.region || '未知'; // 地区
            if (!acc[region]) {
                acc[region] = 0;
            }
            acc[region]++; // 按地区统计用户数量
            return acc;
        }, {});
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
    const StatsCard = () => (_jsxs(Card, { children: [_jsx("h2", { className: "title", children: "PV/UV" }), _jsxs("div", { className: "content", children: [_jsxs("div", { children: [_jsx("span", { className: "label", children: "PV : " }), _jsx("span", { className: "value pv-value", children: pv })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "UV : " }), _jsx("span", { className: "value uv-value", children: uv })] })] })] }));
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "\u57CB\u70B9\u6570\u636E\u770B\u677F" }), _jsx(Card, { children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 6, children: _jsx(RangePicker, { onChange: (dates) => {
                                    if (dates && dates[0] && dates[1]) {
                                        handleSearch({
                                            start_time: dates[0].toISOString(),
                                            end_time: dates[1].toISOString()
                                        }); // 根据时间范围查询
                                    }
                                } }) }), _jsx(Col, { span: 4, children: _jsx(Input, { placeholder: "\u7528\u6237ID", onChange: (e) => handleSearch({ uid: e.target.value }) }) }), _jsx(Col, { span: 4, children: _jsxs(Select, { placeholder: "\u9009\u62E9\u4E8B\u4EF6\u7C7B\u578B", onChange: (value) => {
                                    setSelectedEvent(value); // 更新选中事件
                                    handleSearch({ event_name: value }); // 根据事件名称查询
                                }, children: [_jsx(Option, { value: "CLICK_EVENT", children: "\u70B9\u51FB\u4E8B\u4EF6" }), _jsx(Option, { value: "PAGE_VIEW", children: "\u9875\u9762\u6D4F\u89C8" }), _jsx(Option, { value: "WHITE_SCREEN_EVENT", children: "\u767D\u5C4F\u4E8B\u4EF6" }), _jsx(Option, { value: "ERROR_EVENT", children: "\u9519\u8BEF\u4E8B\u4EF6" }), _jsx(Option, { value: "PAGE_STAY_TIME", children: "\u505C\u7559\u65F6\u95F4" }), _jsx(Option, { value: "PERFORMANCE_DATA", children: "\u6027\u80FD\u6570\u636E" })] }) }), _jsx(Col, { span: 4, children: _jsx(Button, { type: "primary", onClick: () => handleSearch({}), children: "\u67E5\u8BE2" }) })] }) }), _jsxs(Row, { gutter: 16, style: { marginTop: '20px' }, children: [_jsxs(Col, { span: 12, children: [_jsx(StatsCard, {}), " "] }), _jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { children: "\u7528\u6237\u5206\u5E03" }), _jsx(ReactECharts, { option: getUserDistributionChartData() }), " "] }) })] }), _jsxs(Row, { gutter: 16, style: { marginTop: 20 }, children: [_jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { children: "\u4E8B\u4EF6\u8D8B\u52BF" }), _jsx(ReactECharts, { option: getChartData() }), " "] }) }), _jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { children: "\u7528\u6237\u505C\u7559\u65F6\u95F4" }), _jsx(ReactECharts, { option: getStayTimeChartData() }), " "] }) })] }), _jsxs(Card, { style: { marginTop: 20 }, children: [_jsx("h2", { children: "\u9875\u9762\u6027\u80FD" }), _jsx(ReactECharts, { option: getPerformanceChartData() }), " "] }), _jsxs(Row, { gutter: 16, style: { marginTop: 20 }, children: [_jsx(Col, { span: 12, children: _jsx("h2", { children: "\u4E8B\u4EF6\u5217\u8868" }) }), _jsx(Col, { span: 12, style: { textAlign: 'right' }, children: _jsxs(Button, { type: "primary", onClick: () => setIsAddModalVisible(true), children: [" ", "\u65B0\u589E"] }) })] }), _jsxs(Table, { dataSource: events, rowKey: "_id" //* 行唯一标识 */
                , loading: loading, pagination: {
                    total,
                    pageSize: 10,
                    onChange: (page) => fetchEvents({ page })
                }, children: [_jsx(Table.Column, { title: "\u4E8B\u4EF6\u540D\u79F0", dataIndex: "event_name" }), " ", _jsx(Table.Column, { title: "\u53C2\u6570", dataIndex: "event_params", render: (params) => JSON.stringify(params) }), _jsx(Table.Column, { title: "\u65F6\u95F4", dataIndex: "timestamp", render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss') }), _jsx(Table.Column, { title: "\u64CD\u4F5C", render: (_, record) => (_jsxs(React.Fragment, { children: [_jsx(Button, { type: "link", onClick: () => {
                                        setEditingEvent(record); // 设置编辑状态
                                        form.setFieldsValue(record); // 设置表单初始值
                                        setIsModalVisible(true); // 打开编辑模态框
                                    }, children: "\u4FEE\u6539" }), _jsx(Button, { type: "link", danger: true, onClick: () => handleDeleteEvent(record), children: "\u5220\u9664" })] })) }, "actions")] }), _jsx(Modal, { title: "\u4FEE\u6539\u4E8B\u4EF6", open: isModalVisible, onCancel: () => {
                    setIsModalVisible(false); // 关闭模态框
                    setEditingEvent(null); // 重置编辑状态
                    form.resetFields(); // 重置表单
                }, onOk: () => {
                    form.submit(); // 提交表单
                }, children: _jsxs(Form, { form: form, onFinish: handleEditEvent, children: [_jsxs(Form.Item, { label: "\u4E8B\u4EF6\u540D\u79F0", name: "event_name", rules: [{ required: true }], children: [_jsx(Input, { disabled: true }), " "] }), _jsxs(Form.Item, { label: "\u4E8B\u4EF6\u53C2\u6570", name: "event_params", children: [_jsx(Input.TextArea, {}), " "] })] }) }), _jsx(Modal, { title: "\u65B0\u589E\u4E8B\u4EF6", open: isAddModalVisible, onCancel: () => {
                    setIsAddModalVisible(false); // 关闭模态框
                    form.resetFields(); // 重置表单
                }, onOk: () => {
                    form.submit(); // 提交表单
                }, children: _jsxs(Form, { form: form, onFinish: handleAddEvent, children: [_jsx(Form.Item, { label: "\u4E8B\u4EF6\u540D\u79F0", name: "event_name", rules: [{ required: true }], children: _jsx(Select, { placeholder: "\u9009\u62E9\u4E8B\u4EF6\u7C7B\u578B", loading: eventsLoading, options: eventsList.map(event => ( /* 显示事件定义选项 */{
                                    value: event.event_name,
                                    label: event.event_name
                                })), onChange: (value) => {
                                    setSelectedEvent(value); // 更新选中事件
                                } }) }), _jsxs(Form.Item, { label: "\u4E8B\u4EF6\u53C2\u6570", name: "event_params", children: [_jsx(Input.TextArea, {}), " "] })] }) })] }));
};
export default App;
//# sourceMappingURL=App.js.map