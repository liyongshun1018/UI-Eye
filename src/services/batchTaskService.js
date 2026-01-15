import axios from 'axios'

const API_BASE = '/api/batch'

/**
 * 批量任务 API 服务
 */
export default {
    /**
     * 创建批量任务
     * @param {Object} data - 任务数据
     * @param {string} data.name - 任务名称
     * @param {Array<string>} data.urls - URL 列表
     * @param {string} data.domain - 登录域名（可选）
     * @param {Object} data.options - 截图选项
     */
    async createTask(data) {
        try {
            const response = await axios.post(`${API_BASE}/tasks`, data)
            return response.data
        } catch (error) {
            console.error('创建任务失败:', error)
            throw error
        }
    },

    /**
     * 获取任务详情
     * @param {number} id - 任务 ID
     */
    async getTask(id) {
        try {
            const response = await axios.get(`${API_BASE}/tasks/${id}`)
            return response.data
        } catch (error) {
            console.error('获取任务详情失败:', error)
            throw error
        }
    },

    /**
     * 获取任务列表
     * @param {Object} params - 查询参数
     * @param {string} params.status - 状态过滤
     * @param {number} params.limit - 每页数量
     * @param {number} params.offset - 偏移量
     */
    async getTaskList(params = {}) {
        try {
            const response = await axios.get(`${API_BASE}/tasks`, { params })
            return response.data
        } catch (error) {
            console.error('获取任务列表失败:', error)
            throw error
        }
    },

    /**
     * 启动任务
     * @param {number} id - 任务 ID
     */
    async startTask(id) {
        try {
            const response = await axios.post(`${API_BASE}/tasks/${id}/start`)
            return response.data
        } catch (error) {
            console.error('启动任务失败:', error)
            throw error
        }
    },

    /**
     * 删除任务
     * @param {number} id - 任务 ID
     */
    async deleteTask(id) {
        try {
            const response = await axios.delete(`${API_BASE}/tasks/${id}`)
            return response.data
        } catch (error) {
            console.error('删除任务失败:', error)
            throw error
        }
    },

    /**
     * 获取统计信息
     */
    async getStats() {
        try {
            const response = await axios.get(`${API_BASE}/stats`)
            return response.data
        } catch (error) {
            console.error('获取统计信息失败:', error)
            throw error
        }
    },

    /**
     * 获取所有脚本
     */
    async getScripts() {
        const response = await axios.get(`${API_BASE}/scripts`)
        return response.data
    },

    /**
     * 获取单个脚本
     */
    async getScript(id) {
        const response = await axios.get(`${API_BASE}/scripts/${id}`)
        return response.data
    },

    /**
     * 创建脚本
     */
    async createScript(data) {
        const response = await axios.post(`${API_BASE}/scripts`, data)
        return response.data
    },

    /**
     * 更新脚本
     */
    async updateScript(id, data) {
        const response = await axios.put(`${API_BASE}/scripts/${id}`, data)
        return response.data
    },

    /**
     * 删除脚本
     */
    async deleteScript(id) {
        const response = await axios.delete(`${API_BASE}/scripts/${id}`)
        return response.data
    }
}
