import express from 'express';
import BatchTaskService from '../services/BatchTaskService.js';

const router = express.Router();
const batchTaskService = new BatchTaskService();

/**
 * 创建批量任务
 * POST /api/batch/tasks
 */
router.post('/tasks', async (req, res) => {
    try {
        const { name, urls, domain, options } = req.body;

        // 验证参数
        if (!name || !urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                success: false,
                message: '参数错误：name 和 urls 是必需的'
            });
        }

        // 创建任务
        const taskId = batchTaskService.createTask(name, urls, domain, options);

        res.json({
            success: true,
            taskId,
            message: '批量任务已创建'
        });
    } catch (error) {
        console.error('创建批量任务失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 获取任务详情
 * GET /api/batch/tasks/:id
 */
router.get('/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const task = batchTaskService.getTask(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: '任务不存在'
            });
        }

        res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('获取任务详情失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 获取任务列表
 * GET /api/batch/tasks
 */
router.get('/tasks', async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;

        const tasks = batchTaskService.getTaskList({
            status,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const total = batchTaskService.getTaskCount(status);

        res.json({
            success: true,
            tasks,
            total,
            page: Math.floor(offset / limit) + 1,
            pageSize: parseInt(limit)
        });
    } catch (error) {
        console.error('获取任务列表失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 启动任务
 * POST /api/batch/tasks/:id/start
 */
router.post('/tasks/:id/start', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        // 启动任务（异步执行）
        await batchTaskService.startTask(taskId);

        res.json({
            success: true,
            message: '任务已启动'
        });
    } catch (error) {
        console.error('启动任务失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 删除任务
 * DELETE /api/batch/tasks/:id
 */
router.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        batchTaskService.deleteTask(taskId);

        res.json({
            success: true,
            message: '任务已删除'
        });
    } catch (error) {
        console.error('删除任务失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 获取任务统计
 * GET /api/batch/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            total: batchTaskService.getTaskCount(),
            pending: batchTaskService.getTaskCount('pending'),
            running: batchTaskService.getTaskCount('running'),
            completed: batchTaskService.getTaskCount('completed'),
            failed: batchTaskService.getTaskCount('failed')
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
