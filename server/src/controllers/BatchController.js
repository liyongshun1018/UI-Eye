import BatchTaskService from '../services/BatchTaskService.js'
import BatchCompareService from '../services/BatchCompareService.js'

/**
 * 批量任务控制器
 * 封装批量任务相关的所有 HTTP 请求处理逻辑
 */
class BatchController {
    constructor() {
        this.batchTaskService = new BatchTaskService()
        this.batchCompareService = new BatchCompareService()
    }

    /**
     * 创建批量任务
     */
    async createTask(req, res) {
        try {
            const { name, urls, domain, options, script_id } = req.body
            if (!name || !urls || !Array.isArray(urls) || urls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '无效的任务数据：任务名称和 URL 列表不能为空'
                })
            }

            const taskId = this.batchTaskService.createTask(name, urls, domain, { ...options, script_id })
            res.json({
                success: true,
                data: { taskId },
                message: '任务已成功创建'
            })
        } catch (error) {
            this.handleError(res, error, '创建任务失败')
        }
    }

    /**
     * 获取单个任务详情
     */
    async getTask(req, res) {
        try {
            const taskId = parseInt(req.params.id)
            const task = this.batchTaskService.getTask(taskId)

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: '任务不存在'
                })
            }

            res.json({
                success: true,
                data: task
            })
        } catch (error) {
            this.handleError(res, error, '获取任务详情失败')
        }
    }

    /**
     * 分页查询任务列表
     */
    async getTaskList(req, res) {
        try {
            const { status, limit = 20, offset = 0 } = req.query
            const limitVal = parseInt(limit)
            const offsetVal = parseInt(offset)

            const tasks = this.batchTaskService.getTaskList({
                status,
                limit: limitVal,
                offset: offsetVal
            })

            const total = this.batchTaskService.getTaskCount(status)

            res.json({
                success: true,
                data: {
                    tasks,
                    total,
                    page: Math.floor(offsetVal / limitVal) + 1,
                    pageSize: limitVal
                }
            })
        } catch (error) {
            this.handleError(res, error, '获取任务列表失败')
        }
    }

    /**
     * 启动批量任务
     */
    async startTask(req, res) {
        try {
            const taskId = parseInt(req.params.id)

            // 异步执行，不阻塞 HTTP 响应
            this.batchTaskService.startTask(taskId).catch(err => {
                console.error(`[批量控制器] 任务 ${taskId} 运行时出错:`, err)
            })

            res.json({
                success: true,
                message: '任务已加入队列开始执行'
            })
        } catch (error) {
            this.handleError(res, error, '启动任务失败')
        }
    }

    /**
     * 删除任务
     */
    async deleteTask(req, res) {
        try {
            const taskId = parseInt(req.params.id)
            this.batchTaskService.deleteTask(taskId)

            res.json({
                success: true,
                message: '任务已被清理'
            })
        } catch (error) {
            this.handleError(res, error, '删除任务失败')
        }
    }

    /**
     * 获取任务详细对比结果明细
     */
    async getTaskResults(req, res) {
        try {
            const taskId = parseInt(req.params.id)
            const results = this.batchCompareService.getCompareResults(taskId)

            if (!results) {
                return res.status(404).json({
                    success: false,
                    message: '未找到该任务的对比结果'
                })
            }

            res.json({
                success: true,
                data: results
            })
        } catch (error) {
            this.handleError(res, error, '获取结果明细失败')
        }
    }

    /**
     * 获取统计概览
     */
    async getStats(req, res) {
        try {
            const stats = {
                total: this.batchTaskService.getTaskCount(),
                pending: this.batchTaskService.getTaskCount('pending'),
                running: this.batchTaskService.getTaskCount('running'),
                completed: this.batchTaskService.getTaskCount('completed'),
                failed: this.batchTaskService.getTaskCount('failed')
            }

            res.json({
                success: true,
                data: stats
            })
        } catch (error) {
            this.handleError(res, error, '获取统计信息失败')
        }
    }

    /**
     * 统一错误处理
     */
    handleError(res, error, message = '服务器内部错误') {
        console.error(`[批量控制器] ${message}:`, error)
        res.status(500).json({
            success: false,
            message: `${message}: ${error.message}`
        })
    }
}

export default BatchController
