import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Table, Button, DatePicker, Select, Input, Card, Row, Col } from 'antd';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import './styles.css'; // 引入CSS样式表
const { RangePicker } = DatePicker;
const { Option } = Select;
const App = () => {
    const [events, setEvents] = useState([]);
    const [total, setTotal] = useState(0);
    const [pv, setPv] = useState(0);
    const [uv, setUv] = useState(0);
    const [loading, setLoading] = useState(false);
    // 获取事件数据
    const fetchEvents = async (params = {}) => {
        setLoading(true);
        try {
            const response = await axios.get('/events', { params });
            //console.log('Events response:', response.data); // 打印后端返回的数据
            setEvents(response.data.data || []);
            setTotal(response.data.total || 0);
        }
        catch (error) {
            console.error('Failed to fetch events:', error);
        }
        finally {
            setLoading(false);
        }
    };
    // 获取PV/UV数据
    const fetchStats = async (params = {}) => {
        try {
            const response = await axios.get('/stats/pv-uv', { params });
            //console.log('Stats response:', response.data);
            setPv(response.data.pv || 0);
            setUv(response.data.uv || 0);
        }
        catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };
    // 初始化时获取数据
    useEffect(() => {
        fetchEvents({ project_id: 'trackpoint_project_001' });
        fetchStats({ project_id: 'trackpoint_project_001' });
    }, []);
    // 搜索事件
    const handleSearch = (values) => {
        const params = {
            project_id: 'trackpoint_project_001',
            ...values,
        };
        fetchEvents(params);
        fetchStats(params);
    };
    // 事件趋势图表数据
    const getChartData = () => {
        const data = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD');
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date]++;
            return acc;
        }, {});
        return {
            xAxis: {
                type: 'category',
                data: Object.keys(data),
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
    // 用户停留时间图表数据
    // app.tsx 中的 getStayTimeChartData
    const getStayTimeChartData = () => {
        const data = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD');
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += event.page_stay_time || 0; // 修改为访问顶层字段
            return acc;
        }, {});
        return {
            xAxis: {
                type: 'category',
                data: Object.keys(data),
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
    // 页面性能图表数据
    const getPerformanceChartData = () => {
        const loadTimeData = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD');
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += event.event_params.load_time || 0;
            return acc;
        }, {});
        const firstScreenTimeData = events.reduce((acc, event) => {
            const date = moment(event.timestamp).format('YYYY/MM/DD');
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += event.event_params.first_screen_time || 0;
            return acc;
        }, {});
        return {
            xAxis: {
                type: 'category',
                data: Object.keys(loadTimeData),
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
    // 用户分布饼图数据
    const getUserDistributionChartData = () => {
        const data = events.reduce((acc, event) => {
            const country = event.country || '未知';
            if (!acc[country]) {
                acc[country] = 0;
            }
            acc[country]++;
            return acc;
        }, {});
        return {
            title: {
            // text: 'Nightingale Chart',
            // subtext: 'Fake Data',
            // left: 'center',
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b} : {c} ({d}%)',
            },
            legend: {
                left: 'center',
                top: 'bottom',
                data: Object.keys(data),
            },
            toolbox: {
                show: true,
                feature: {
                    mark: { show: true },
                    dataView: { show: false, readOnly: false },
                    restore: { show: false },
                    saveAsImage: { show: false },
                },
            },
            series: [
                {
                    name: 'Radius Mode',
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
                    })),
                },
            ],
        };
    };
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "\u57CB\u70B9\u6570\u636E\u770B\u677F" }), _jsx(Card, { children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 6, children: _jsx(RangePicker, { onChange: (dates) => {
                                    if (dates && dates[0] && dates[1]) {
                                        handleSearch({
                                            start_time: dates[0].toISOString(),
                                            end_time: dates[1].toISOString()
                                        });
                                    }
                                } }) }), _jsx(Col, { span: 6, children: _jsx(Input, { placeholder: "\u7528\u6237ID", onChange: (e) => handleSearch({ uid: e.target.value }) }) }), _jsx(Col, { span: 6, children: _jsxs(Select, { placeholder: "\u9009\u62E9\u4E8B\u4EF6", onChange: (value) => handleSearch({ event_name: value }), children: [_jsx(Option, { value: "CLICK_EVENT", children: "\u70B9\u51FB\u4E8B\u4EF6" }), _jsx(Option, { value: "PAGE_VIEW", children: "\u9875\u9762\u6D4F\u89C8\u4E8B\u4EF6" }), " ", _jsx(Option, { value: "WHITE_SCREEN_EVENT", children: "\u767D\u5C4F\u4E8B\u4EF6" }), _jsx(Option, { value: "ERROR_EVENT", children: "\u9519\u8BEF\u4E8B\u4EF6" }), _jsx(Option, { value: "PAGE_STAY_TIME", children: "\u7528\u6237\u505C\u7559\u65F6\u95F4" }), " ", _jsx(Option, { value: "PERFORMANCE_DATA", children: "\u6027\u80FD\u6570\u636E" }), _jsx(Option, { value: "STYLE_LOSS", children: "\u6837\u5F0F\u4E22\u5931\u5F02\u5E38" })] }) }), _jsx(Col, { span: 6, children: _jsx(Button, { type: "primary", onClick: () => handleSearch({}), children: "\u67E5\u8BE2" }) })] }) }), _jsxs(Row, { gutter: 16, style: { marginTop: '20px' }, children: [_jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { className: "title", children: "PV/UV" }), _jsxs("div", { className: "content", children: [_jsxs("div", { children: [_jsx("span", { className: "label", children: "PV : " }), _jsx("span", { className: "value pv-value", children: pv })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "UV : " }), _jsx("span", { className: "value uv-value", children: uv })] })] })] }) }), _jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { className: "title", children: "\u7528\u6237\u5206\u5E03" }), _jsx(ReactECharts, { option: getUserDistributionChartData() })] }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { className: "title", children: "\u4E8B\u4EF6\u8D8B\u52BF" }), _jsx(ReactECharts, { option: getChartData() })] }) }), _jsx(Col, { span: 12, children: _jsxs(Card, { children: [_jsx("h2", { className: "title", children: "\u7528\u6237\u505C\u7559\u65F6\u95F4" }), _jsx(ReactECharts, { option: getStayTimeChartData() })] }) })] }), _jsxs(Card, { children: [_jsx("h2", { className: "title", children: "\u9875\u9762\u6027\u80FD" }), _jsx(ReactECharts, { option: getPerformanceChartData() })] }), _jsx("h2", { children: "\u4E8B\u4EF6\u5217\u8868" }), _jsxs(Table, { dataSource: events, rowKey: "_id", loading: loading, pagination: { total, pageSize: 10, onChange: (page) => fetchEvents({ page }) }, children: [_jsx(Table.Column, { title: "\u4E8B\u4EF6\u540D\u79F0", dataIndex: "event_name" }), _jsx(Table.Column, { title: "\u53C2\u6570", dataIndex: "event_params", render: (params) => JSON.stringify(params) }), _jsx(Table.Column, { title: "\u65F6\u95F4", dataIndex: "timestamp" })] })] }));
};
export default App;
//# sourceMappingURL=App.js.map