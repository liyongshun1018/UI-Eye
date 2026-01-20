/**
 * 数据导出服务
 * 提供将 JSON 数据转换为 CSV 格式的能力
 */
class ExportService {
    /**
     * 将对象数组转换为 CSV 字符串
     * @param {Array<Object>} data - 数据数组
     * @param {Array<Object>} columns - 列定义 [{ key: 'name', label: '名称' }]
     * @returns {string} CSV 字符串
     */
    convertToCSV(data, columns) {
        if (!data || data.length === 0) return ''

        // 1. 生成表头 (带 BOM 防止 Excel 乱码)
        const header = columns.map(col => `"${col.label}"`).join(',')

        // 2. 生成行内容
        const rows = data.map(item => {
            return columns.map(col => {
                let value = this.getNestedValue(item, col.key)
                // 处理空值
                if (value === null || value === undefined) value = ''
                // 处理数字和百分比
                if (typeof value === 'number') {
                    value = value.hasOwnProperty('toFixed') ? value.toFixed(2) : value
                }
                // 转义双引号
                const stringValue = String(value).replace(/"/g, '""')
                return `"${stringValue}"`
            }).join(',')
        })

        return '\ufeff' + [header, ...rows].join('\n')
    }

    /**
     * 简单的嵌套属性获取函数，支持 'task.name' 这种格式
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj)
    }
}

export default new ExportService()
