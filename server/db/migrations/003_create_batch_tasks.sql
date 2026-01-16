-- 批量任务表
CREATE TABLE IF NOT EXISTS batch_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  urls TEXT NOT NULL,          -- JSON 数组
  domain TEXT,                  -- 登录域名（可选）
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/running/completed/failed
  total INTEGER NOT NULL,
  success INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  duration REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  results TEXT,                 -- JSON 结果
  error_message TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_created_at ON batch_tasks(created_at DESC);
