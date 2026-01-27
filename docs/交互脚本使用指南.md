# 交互脚本使用指南

## 📋 概述

交互脚本允许您在批量截图前自动执行登录、填写表单、清除弹窗等操作。脚本使用 **Playwright API**，在浏览器环境中执行，`page` 对象会自动注入。

---

## 🚀 快速开始

### 创建第一个脚本

1. 进入 UI-Eye 的"交互脚本"页面
2. 点击"新建脚本"
3. 输入脚本名称（如"百度登录"）
4. 粘贴脚本代码
5. 保存

### 关联到批量任务

1. 创建批量任务时，在"关联脚本"下拉框中选择脚本
2. 输入目标 URL
3. 提交任务
4. 系统会先执行脚本，然后截图

---

## 📖 常用 Playwright API

### 元素定位

```javascript
// CSS 选择器
await page.click('.login-btn');
await page.fill('#username', 'value');

// 文本定位
await page.click('text=登录');
await page.click('button:has-text("提交")');

// XPath
await page.click('xpath=//button[@type="submit"]');
```

### 等待操作

```javascript
// 等待元素出现（推荐）
await page.waitForSelector('.element');

// 等待 URL 变化
await page.waitForURL('**/dashboard**');

// 等待网络空闲
await page.waitForLoadState('networkidle');

// 固定延迟（不推荐，仅用于调试）
await page.waitForTimeout(2000);
```

### 输入操作

```javascript
// 填写输入框
await page.fill('input[name="email"]', 'test@example.com');

// 逐字输入
await page.type('input', 'text', { delay: 100 });

// 选择下拉框
await page.selectOption('select#country', 'CN');
```

### 点击操作

```javascript
// 普通点击
await page.click('button');

// 双击
await page.dblclick('.item');

// 强制点击（即使元素被遮挡）
await page.click('button', { force: true });
```

---

## 🎯 常用场景

### 场景 1：用户名密码登录

```javascript
// 等待登录表单
await page.waitForSelector('input[name="username"]');

// 填写用户名和密码
await page.fill('input[name="username"]', 'your_username');
await page.fill('input[name="password"]', 'your_password');

// 点击登录按钮
await page.click('button[type="submit"]');

// 等待登录成功
await page.waitForSelector('.user-profile', { timeout: 10000 });
```

### 场景 2：Cookie 登录（推荐）

```javascript
// 设置登录 Cookie
await page.context().addCookies([
  {
    name: 'session_id',
    value: 'your_session_id_here',
    domain: '.example.com',
    path: '/'
  }
]);

// 刷新页面以应用 Cookie
await page.reload();

// 等待登录状态生效
await page.waitForSelector('.user-menu');
```

**如何获取 Cookie？**
1. 在浏览器中手动登录
2. 按 F12 打开开发者工具
3. Application → Cookies → 选择网站
4. 复制 Cookie 的 Name 和 Value

### 场景 3：清除弹窗

```javascript
// 等待并关闭弹窗
await page.waitForSelector('.modal-overlay', { timeout: 5000 }).catch(() => {});
await page.click('.modal-close-btn').catch(() => {});
await page.waitForTimeout(1000);
```

### 场景 4：滚动页面

```javascript
// 滚动到页面底部
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

// 等待懒加载内容
await page.waitForTimeout(2000);

// 滚动到特定元素
await page.locator('.target-section').scrollIntoViewIfNeeded();
```

### 场景 5：填写表单

```javascript
// 填写搜索框并提交
await page.fill('input[name="search"]', '关键词');
await page.click('button.search-btn');
await page.waitForSelector('.search-results');
```

---

## 💡 实战示例：百度登录

### 方式 1：Cookie 登录（推荐）

```javascript
// 设置百度的登录 Cookie
await page.context().addCookies([
  {
    name: 'BDUSS',
    value: 'your_bduss_value_here',
    domain: '.baidu.com',
    path: '/'
  },
  {
    name: 'BAIDUID',
    value: 'your_baiduid_value_here',
    domain: '.baidu.com',
    path: '/'
  }
]);

// 刷新页面以应用 Cookie
await page.reload();

// 等待登录状态生效
await page.waitForSelector('.s-top-username', { timeout: 5000 });
```

**获取百度 Cookie 步骤**：
1. 手动登录百度
2. F12 → Application → Cookies → https://www.baidu.com
3. 复制 `BDUSS` 和 `BAIDUID` 的值
4. 粘贴到脚本中

### 方式 2：用户名密码登录

```javascript
// 点击首页的"登录"按钮
await page.click('text=登录').catch(() => {});
await page.waitForTimeout(1000);

// 等待登录框出现
await page.waitForSelector('#TANGRAM__PSP_11__userName', { timeout: 5000 });

// 切换到"用户名登录"
await page.click('text=用户名登录').catch(() => {});
await page.waitForTimeout(500);

// 填写用户名和密码
await page.fill('#TANGRAM__PSP_11__userName', 'your_username');
await page.fill('#TANGRAM__PSP_11__password', 'your_password');

// 点击登录按钮
await page.click('#TANGRAM__PSP_11__submit');

// 等待登录成功
await page.waitForSelector('.s-top-username', { timeout: 10000 });
```

### 方式 3：清除百度首页弹窗

```javascript
// 等待页面加载完成
await page.waitForLoadState('networkidle');

// 关闭可能出现的弹窗
await page.click('.close-btn').catch(() => {});
await page.click('.modal-close').catch(() => {});

// 移除底部的推广横幅
await page.evaluate(() => {
  const banner = document.querySelector('.s-bottom-layer');
  if (banner) banner.remove();
});

await page.waitForTimeout(500);
```

---

## ⚠️ 注意事项

### 1. 选择器稳定性

- ✅ 优先使用 `id`、`data-testid` 等稳定属性
- ❌ 避免使用易变的 class 名称（如 `.btn-primary-123`）

### 2. 等待时机

- ✅ 使用 `waitForSelector` 等待元素出现
- ❌ 避免使用 `waitForTimeout` 固定延迟

### 3. 错误处理

```javascript
// 使用 try-catch
try {
  await page.click('.optional-popup-close');
} catch (e) {
  console.log('弹窗不存在，跳过');
}

// 或使用 .catch()
await page.click('.btn').catch(() => {});
```

### 4. Cookie 安全

- 不要在脚本中硬编码敏感的 Cookie 值
- 考虑使用环境变量或配置文件

### 5. 调试技巧

```javascript
// 截图调试
await page.screenshot({ path: '/tmp/debug.png' });

// 打印页面内容
const content = await page.content();
console.log(content);

// 打印当前 URL
console.log(await page.url());
```

---

## 🔗 参考资源

- [Playwright 官方文档](https://playwright.dev/docs/api/class-page)
- [Playwright 选择器指南](https://playwright.dev/docs/selectors)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)

---

## ❓ 常见问题

**Q: 脚本执行失败怎么办？**  
A: 查看服务器日志中的 `[Playwright] 交互脚本执行失败` 错误信息，检查选择器是否正确。

**Q: 如何获取网站的 Cookie？**  
A: 在浏览器中手动登录，然后在开发者工具的 Application → Cookies 中复制。

**Q: 脚本可以访问外部 API 吗？**  
A: 可以使用 `page.evaluate()` 在页面上下文中执行 `fetch` 请求。

**Q: 如何处理验证码？**  
A: 使用 `waitForTimeout` 给用户预留时间手动操作，或考虑使用 Cookie 绕过验证。

**Q: 如何找到正确的选择器？**  
A: 在浏览器中按 F12，使用"选择元素"工具（Ctrl+Shift+C）点击目标元素，查看其属性。

---

## 📝 最佳实践

1. **优先使用 Cookie 登录**：稳定、快速、无验证码
2. **使用稳定的选择器**：`id` > `data-testid` > `class` > `xpath`
3. **添加错误处理**：使用 `.catch()` 处理可选操作
4. **等待元素而非时间**：`waitForSelector` 优于 `waitForTimeout`
5. **测试脚本**：在创建批量任务前，先单独测试脚本是否正常工作
