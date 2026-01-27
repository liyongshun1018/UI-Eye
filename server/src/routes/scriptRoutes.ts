import express from 'express';
import { Container } from '../infrastructure/di/Container.js';
import { catchAsync } from '../utils/ErrorHandler.js';
import ResponseUtils from '../utils/ResponseUtils.js';

const router = express.Router();
const scriptUseCase = Container.getManageScriptsUseCase();

/**
 * 自动化注入脚本管理 API 路由集合
 * 职责：管控用于 Playwright 预处理 (如自动登录、表单填充) 的 JS 代码片段
 */

/**
 * [GET] /api/batch/scripts
 * 职责：拉取系统中已注册的所有自定义脚本列表
 */
router.get('/', catchAsync(async (req, res) => {
    const scripts = scriptUseCase.getScripts();
    return ResponseUtils.success(res, scripts);
}));

/**
 * [GET] /api/batch/scripts/:id
 * 职责：查询特定脚本的源代码正文与描述
 */
router.get('/:id', catchAsync(async (req, res) => {
    const script = scriptUseCase.getScript(req.params.id as string);
    if (!script) return ResponseUtils.error(res, '指定的脚本记录未找到', 404);
    return ResponseUtils.success(res, script);
}));

/**
 * [POST] /api/batch/scripts
 * 职责：注册并存储一段新的 JavaScript 自动化脚本
 */
router.post('/', catchAsync(async (req, res) => {
    const { name, code, description } = req.body;
    if (!name || !code) return ResponseUtils.error(res, '脚本元数据不完整：必须包含标题与代码正文', 400);
    const id = scriptUseCase.createScript(name, code, description);
    return ResponseUtils.success(res, { id }, '新脚本已成功入库');
}));

/**
 * [PUT] /api/batch/scripts/:id
 * 职责：修改已存在的脚本逻辑
 */
router.put('/:id', catchAsync(async (req, res) => {
    const { name, code, description } = req.body;
    const success = scriptUseCase.updateScript(req.params.id as string, { name, code, description });
    if (!success) return ResponseUtils.error(res, '更新失败：脚本可能已被删除', 404);
    return ResponseUtils.success(res, null, '脚本逻辑已同步更新');
}));

/**
 * [DELETE] /api/batch/scripts/:id
 * 职责：物理卸载指定的脚本记录
 */
router.delete('/:id', catchAsync(async (req, res) => {
    const success = scriptUseCase.deleteScript(req.params.id as string);
    if (!success) return ResponseUtils.error(res, '删除失败：脚本不存在', 404);
    return ResponseUtils.success(res, null, '脚本已安全卸载');
}));

export default router;
