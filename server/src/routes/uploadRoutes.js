/**
 * 文件上传路由
 */
const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/UploadController')

// 单文件上传
router.post('/upload', uploadController.uploadSingle)

// 多文件上传
router.post('/upload/multiple', uploadController.uploadMultiple)

module.exports = router
