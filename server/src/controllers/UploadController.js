/**
 * 文件上传控制器
 */
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, `design-${uniqueSuffix}${ext}`)
    }
})

// 文件过滤器：只允许图片
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'))
    }
}

// 创建 multer 实例
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制 10MB
    },
    fileFilter: fileFilter
})

/**
 * 单文件上传
 */
exports.uploadSingle = (req, res) => {
    const uploadHandler = upload.single('file')

    uploadHandler(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `上传失败: ${err.message}`
            })
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的文件'
            })
        }

        // 返回文件访问路径
        const fileUrl = `/uploads/${req.file.filename}`

        res.json({
            success: true,
            message: '上传成功',
            data: {
                url: fileUrl,
                path: fileUrl,
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size
            }
        })
    })
}

/**
 * 多文件上传
 */
exports.uploadMultiple = (req, res) => {
    const uploadHandler = upload.array('files', 10) // 最多 10 个文件

    uploadHandler(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `上传失败: ${err.message}`
            })
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的文件'
            })
        }

        // 返回所有文件的访问路径
        const files = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            path: `/uploads/${file.filename}`,
            filename: file.filename,
            originalname: file.originalname,
            size: file.size
        }))

        res.json({
            success: true,
            message: '上传成功',
            data: files
        })
    })
}
