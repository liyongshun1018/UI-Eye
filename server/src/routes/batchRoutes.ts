import express from 'express';
import { BatchController } from '../controllers/BatchController.js';
import { catchAsync } from '../utils/ErrorHandler.js';

const router = express.Router();
const batchController = new BatchController();

/**
 * 批量审计模块 API 路由集合
 * 职责：作为与前端通讯的契约入口，负责将特定路径的 HTTP 请求导向对应的控制器方法
 */

/**
 * [POST] /api/batch/tasks
 * 职责：创建一个新的批量审计主记录
 */
router.post('/tasks', catchAsync((req, res) => batchController.createTask(req, res)));

/**
 * [GET] /api/batch/tasks
 * 职责：获取批量审计任务列表 (支持分页与状态过滤)
 */
router.get('/tasks', catchAsync((req, res) => batchController.getTaskList(req, res)));

/**
 * [GET] /api/batch/tasks/:id
 * 职责：获取指定批量任务的实时进度与统计数据
 */
router.get('/tasks/:id', catchAsync((req, res) => batchController.getTask(req, res)));

/**
 * [POST] /api/batch/tasks/:id/start
 * 职责：正式启动后台批处理器，开始执行 Puppeteer 截图与比对逻辑
 */
router.post('/tasks/:id/start', catchAsync((req, res) => batchController.startTask(req, res)));

/**
 * [GET] /api/batch/tasks/:id/results
 * 职责：获取批量任务下属的所有页面对比报告子项
 */
router.get('/tasks/:id/results', catchAsync((req, res) => batchController.getTaskResults(req, res)));

/**
 * [GET] /api/batch/tasks/:id/export
 * 职责：导出批量任务的汇总报表 (JSON/CSV 预留)
 */
router.get('/tasks/:id/export', catchAsync((req, res) => batchController.exportTaskResults(req, res)));

/**
 * [DELETE] /api/batch/tasks/:id
 * 职责：物理删除批量任务及相关数据
 */
router.delete('/tasks/:id', catchAsync((req, res) => batchController.deleteTask(req, res)));

/**
 * [GET] /api/batch/stats
 * 职责：获取全站审计的大盘统计数据 (概览指标)
 */
router.get('/stats', catchAsync((req, res) => batchController.getStats(req, res)));

export default router;
