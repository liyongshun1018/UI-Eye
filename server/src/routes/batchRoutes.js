import express from 'express'
import BatchController from '../controllers/BatchController.js'

const router = express.Router()
const batchController = new BatchController()

/**
 * 创建批量任务
 */
router.post('/tasks', (req, res) => batchController.createTask(req, res))

/**
 * 获取任务详情
 */
router.get('/tasks/:id', (req, res) => batchController.getTask(req, res))

/**
 * 获取任务列表
 */
router.get('/tasks', (req, res) => batchController.getTaskList(req, res))

/**
 * 启动任务
 */
router.post('/tasks/:id/start', (req, res) => batchController.startTask(req, res))

/**
 * 删除任务
 */
router.delete('/tasks/:id', (req, res) => batchController.deleteTask(req, res))

/**
 * 获取任务详细对比结果（包含明细）
 */
router.get('/tasks/:id/results', (req, res) => batchController.getTaskResults(req, res))

/**
 * 获取统计信息
 */
router.get('/stats', (req, res) => batchController.getStats(req, res))

/**
 * 导出任务结果 (CSV)
 */
router.get('/tasks/:id/export', (req, res) => batchController.exportTaskResults(req, res))

export default router
