-- 批量视觉对比功能 - 数据库迁移
-- 为 batch_tasks 表添加对比相关字段

-- 添加设计稿模式字段
ALTER TABLE batch_tasks ADD COLUMN design_mode TEXT DEFAULT 'single';
-- 'single': 所有 URL 共用一个设计稿
-- 'multiple': 每个 URL 对应一个设计稿

-- 添加设计稿来源字段（单设计稿模式）
ALTER TABLE batch_tasks ADD COLUMN design_source TEXT;

-- 添加对比配置字段（JSON）
ALTER TABLE batch_tasks ADD COLUMN compare_config TEXT;

-- 添加平均相似度字段
ALTER TABLE batch_tasks ADD COLUMN avg_similarity REAL;

-- 添加总差异数字段
ALTER TABLE batch_tasks ADD COLUMN total_diff_count INTEGER DEFAULT 0;

-- 创建批量任务明细表
CREATE TABLE IF NOT EXISTS batch_task_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  design_source TEXT,          -- 多设计稿模式下的设计稿
  screenshot_path TEXT,         -- 截图路径
  report_id TEXT,               -- 对比报告 ID
  status TEXT DEFAULT 'pending', -- pending/running/completed/failed
  similarity REAL,              -- 相似度
  diff_count INTEGER,           -- 差异数量
  error_message TEXT,           -- 错误信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (task_id) REFERENCES batch_tasks(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_batch_task_items_task_id ON batch_task_items(task_id);
CREATE INDEX IF NOT EXISTS idx_batch_task_items_status ON batch_task_items(status);
CREATE INDEX IF NOT EXISTS idx_batch_task_items_report_id ON batch_task_items(report_id);
