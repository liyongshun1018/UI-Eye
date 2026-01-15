/**
 * 批量任务 API 测试脚本
 * 用于测试批量任务的创建、启动和查询功能
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/batch';

async function testBatchTaskAPI() {
    console.log('\n🧪 批量任务 API 测试\n');

    try {
        // 1. 创建批量任务
        console.log('1️⃣ 创建批量任务...');
        const createResponse = await axios.post(`${API_BASE}/tasks`, {
            name: 'API 测试任务',
            urls: [
                'https://www.baidu.com',
                'https://www.taobao.com'
            ],
            domain: null,
            options: {
                headless: true,
                fullPage: true
            }
        });

        console.log('✅ 任务已创建:', createResponse.data);
        const taskId = createResponse.data.taskId;

        // 2. 获取任务详情
        console.log('\n2️⃣ 获取任务详情...');
        const detailResponse = await axios.get(`${API_BASE}/tasks/${taskId}`);
        console.log('✅ 任务详情:', detailResponse.data.task);

        // 3. 启动任务
        console.log('\n3️⃣ 启动任务...');
        const startResponse = await axios.post(`${API_BASE}/tasks/${taskId}/start`);
        console.log('✅ 任务已启动:', startResponse.data);

        // 4. 等待一段时间
        console.log('\n⏳ 等待 30 秒...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        // 5. 再次获取任务详情
        console.log('\n4️⃣ 获取最新任务详情...');
        const finalResponse = await axios.get(`${API_BASE}/tasks/${taskId}`);
        console.log('✅ 最终状态:', finalResponse.data.task);

        // 6. 获取任务列表
        console.log('\n5️⃣ 获取任务列表...');
        const listResponse = await axios.get(`${API_BASE}/tasks`);
        console.log('✅ 任务列表:', listResponse.data);

        // 7. 获取统计信息
        console.log('\n6️⃣ 获取统计信息...');
        const statsResponse = await axios.get(`${API_BASE}/stats`);
        console.log('✅ 统计信息:', statsResponse.data);

        console.log('\n🎉 所有测试通过！\n');
    } catch (error) {
        console.error('\n❌ 测试失败:', error.response?.data || error.message);
        process.exit(1);
    }
}

testBatchTaskAPI();
