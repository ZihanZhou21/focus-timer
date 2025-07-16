# 每日重置系统

## 概述

为了确保每天 0 时所有任务的状态都被重置，我们实现了一个完整的每日重置系统。该系统结合了**自动检测**、**手动触发**和**API 调度**三种方式，确保任务状态能够可靠地进行每日重置。

## 系统架构

### 🔄 三层重置机制

1. **自动重置触发器** (`src/lib/auto-reset.ts`)

   - 客户端自动检测跨日情况
   - 页面加载、获得焦点、可见性变化时触发检查
   - 每分钟定期检查一次

2. **调度器 API** (`src/app/api/scheduler/route.ts`)

   - 提供可被外部调用的重置端点
   - 支持状态查询和手动触发
   - 可与外部 cron 服务集成

3. **重置数据 API** (`src/app/api/tasks/reset-daily/route.ts`)
   - 执行实际的数据重置操作
   - 提供重置状态查询
   - 支持备份和详细日志

### 📱 用户界面集成

- **主页面** (`src/app/page.tsx`) - 自动加载重置服务，监听重置完成事件
- **设置页面** (`src/app/settings/page.tsx`) - 手动控制和状态监控

## 工作原理

### 🚀 自动重置流程

1. **检测时机**

   ```
   ✅ 应用启动时
   ✅ 页面重新获得焦点
   ✅ 页面从隐藏状态变为可见
   ✅ 每分钟定期检查
   ```

2. **重置判断**

   ```typescript
   // 检查是否需要重置
   if (lastResetDate !== today && autoResetEnabled) {
     performReset()
   }
   ```

3. **重置执行**
   ```
   ✅ 自动备份数据
   ✅ 重置任务状态 (completed → pending)
   ✅ 清理今日完成记录
   ✅ 清理今日时间统计
   ✅ 清理今日打卡记录
   ✅ 更新修改时间
   ✅ 触发页面数据刷新
   ```

### 📊 重置范围

#### TODO 任务重置内容：

- ✅ 状态：`completed` → `pending`
- ✅ 今日完成记录：从 `completedAt` 数组中移除今日日期
- ✅ 今日时间统计：删除 `dailyTimeStats[today]`
- ✅ 更新时间：设置 `updatedAt` 为当前时间

#### 打卡任务重置内容：

- ✅ 状态：`completed` → `pending`
- ✅ 今日完成记录：从 `completedAt` 数组中移除今日日期
- ✅ 今日打卡记录：从 `checkInHistory` 中移除今日记录
- ✅ 更新时间：设置 `updatedAt` 为当前时间

## API 端点

### 🔧 调度器 API

```bash
# 检查调度器状态
GET /api/scheduler
GET /api/scheduler?action=status

# 手动触发重置
POST /api/scheduler?action=daily-reset&userId=user_001
```

### 📋 重置数据 API

```bash
# 获取重置状态
GET /api/tasks/reset-daily?userId=user_001

# 执行手动重置
POST /api/tasks/reset-daily?userId=user_001
```

## 使用方式

### 🎮 用户操作

1. **自动重置**：无需任何操作，系统自动检测并执行
2. **手动重置**：在设置页面点击"立即重置"按钮
3. **重置控制**：在设置页面开启/关闭自动重置功能

### 👨‍💻 开发者操作

```typescript
import { autoResetService } from '@/lib/auto-reset'

// 获取重置状态
const status = autoResetService.getStatus()

// 手动触发重置
await autoResetService.manualReset()

// 开启/关闭自动重置
autoResetService.setAutoResetEnabled(true)

// 监听重置完成事件
window.addEventListener('daily-reset-completed', (event) => {
  console.log('重置完成:', event.detail)
})
```

### 🔄 外部调度集成

如果需要使用外部 cron 服务（如 Vercel Cron），可以设置定时调用：

```bash
# 每天 00:00 执行
curl -X POST "https://your-domain.com/api/scheduler?action=daily-reset"
```

## 数据安全

### 💾 自动备份

每次执行重置前，系统会自动创建数据备份：

```
data/tasks.backup-daily-reset.{timestamp}.json
```

### 🔍 详细日志

重置过程会记录详细信息：

```typescript
{
  resetCount: 5,           // 重置的任务数量
  resetDetails: {
    statusResets: 3,       // 状态重置数量
    completedAtResets: 5,  // 完成记录重置数量
    timeStatsResets: 2,    // 时间统计重置数量
    checkInResets: 1       // 打卡记录重置数量
  },
  backupPath: "...",       // 备份文件路径
  resetDate: "2025-01-16", // 重置日期
  timestamp: "..."         // 执行时间
}
```

## 兼容性

### 🌐 部署环境

- ✅ **Serverless** (Vercel, Netlify): 客户端自动触发
- ✅ **传统服务器**: 可配置 node-cron
- ✅ **混合模式**: 客户端 + 外部 cron 双重保障

### 📱 浏览器支持

- ✅ 现代浏览器：完整功能
- ✅ localStorage：状态持久化
- ✅ CustomEvent：事件通信
- ✅ Visibility API：智能检测

## 监控和调试

### 📊 状态监控

在设置页面可以查看：

- 自动重置开关状态
- 上次重置日期
- 当前是否需要重置
- 手动重置按钮

### 🔍 调试信息

开发者控制台会显示详细日志：

```
AutoResetService 初始化: {lastResetDate: null, ...}
需要重置: 上次重置日期 null, 今天 2025-01-16
开始执行自动重置...
自动重置成功: {resetCount: 5, ...}
```

### 🧪 测试验证

```typescript
// 重置状态进行测试
autoResetService.resetState()

// 检查状态
console.log(autoResetService.getStatus())

// 手动触发
await autoResetService.manualReset()
```

## 优势特点

### ⚡ 高可靠性

- 多重触发机制，确保不遗漏
- 自动备份，数据安全有保障
- 详细日志，便于问题追踪

### 🔧 易于维护

- 配置简单，无需复杂设置
- 状态可视化，便于监控
- 支持手动控制，灵活性强

### 🚀 性能优秀

- 客户端触发，服务器零负担
- 智能检测，避免不必要的调用
- 缓存状态，减少重复操作

### 🌍 通用兼容

- 支持各种部署环境
- 浏览器兼容性良好
- 可扩展外部调度集成

---

**安装提示**：系统已自动集成到应用中，无需额外配置即可使用。首次访问应用时会自动启动每日重置检测服务。
