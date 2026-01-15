import express from 'express';
import ScriptService from '../services/ScriptService.js';

const router = express.Router();
const scriptService = new ScriptService();

/**
 * 获取所有脚本
 * GET /api/scripts
 */
router.get('/', async (req, res) => {
    try {
        const scripts = scriptService.getScripts();
        res.json({ success: true, scripts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 获取单个脚本
 * GET /api/scripts/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const script = scriptService.getScript(req.params.id);
        if (!script) {
            return res.status(404).json({ success: false, message: '脚本不存在' });
        }
        res.json({ success: true, script });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 创建脚本
 * POST /api/scripts
 */
router.post('/', async (req, res) => {
    try {
        const { name, code, description } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, message: '名称和代码不能为空' });
        }
        const id = scriptService.createScript(name, code, description);
        res.json({ success: true, id, message: '脚本已创建' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 更新脚本
 * PUT /api/scripts/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, code, description } = req.body;
        const success = scriptService.updateScript(req.params.id, { name, code, description });
        if (!success) {
            return res.status(404).json({ success: false, message: '脚本不存在或更新说明失败' });
        }
        res.json({ success: true, message: '脚本已更新' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 删除脚本
 * DELETE /api/scripts/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const success = scriptService.deleteScript(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: '脚本不存在' });
        }
        res.json({ success: true, message: '脚本已删除' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
