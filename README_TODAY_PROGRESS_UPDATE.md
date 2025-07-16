# 任务进度 API 更新 - 今日进度专用

## 概述

根据用户需求，我们更新了任务进度获取 API，现在**只显示今日的任务进度**，而不是累计的总进度。如果今天没有执行数据，进度条将显示为 0。

## 更新内容

### 🔄 API 变更

#### 1. 任务进度 API (`/api/tasks/[id]/progress`)

**变更前**：

```typescript
// 计算总执行时间（累加所有历史数据）
const totalExecutedTime = Object.values(dailyTimeStats).reduce(
  (total, time) => total + time,
  0
)
```

**变更后**：

```typescript
// 只计算今日执行时间
const today = new Date().toISOString().split('T')[0]
const todayExecutedTime = dailyTimeStats?.[today] || 0
```

#### 2. 剩余时间 API (`/api/tasks/[id]/remaining`)

**变更前**：

```typescript
// 基于总执行时间计算剩余时间
const executedSeconds = Object.values(dailyTimeStats).reduce(
  (total, time) => total + time,
  0
)
const remainingSeconds = Math.max(0, estimatedSeconds - executedSeconds)
```

**变更后**：

```typescript
// 基于今日执行时间计算剩余时间
const todayExecutedSeconds = dailyTimeStats?.[today] || 0
const remainingSeconds = Math.max(0, estimatedSeconds - todayExecutedSeconds)
```

### 📊 新增响应字段

#### 进度 API 新增字段：

```typescript
{
  // 现有字段
  taskId: string
  totalExecutedTime: number    // 改为今日执行时间
  progressPercentage: number   // 改为今日进度百分比

  // 新增字段
  todayProgress: {
    date: string,              // 今日日期
    duration: number,          // 今日执行时间（秒）
    minutes: number            // 今日执行时间（分钟）
  },
  todayOnly: true              // 标记：这是今日专用数据
}
```

#### 剩余时间 API 新增字段：

```typescript
{
  // 现有字段
  executedMinutes: number      // 改为今日已执行时间（分钟）
  remainingMinutes: number     // 改为今日剩余时间（分钟）

  // 新增字段
  todayOnly: true,             // 标记：这是今日数据
  date: string                 // 计算基于的日期
}
```

## 影响范围

### ✅ 前端组件自动适配

由于我们保持了 API 响应的结构兼容性，现有的前端组件无需修改：

1. **进度条组件** - 自动显示今日进度
2. **任务详情卡片** - 自动显示今日执行时间
3. **专注页面** - 自动显示今日剩余时间
4. **统计页面** - 历史数据仍然可用

### 🔧 类型定义更新

```typescript
// 新增类型定义
export interface TaskProgressResponse {
  taskId: string
  totalExecutedTime: number // 今日执行时间（秒）
  estimatedDuration: number // 预估时间（秒）
  progressPercentage: number // 今日进度百分比
  isCompleted: boolean
  dailyProgress: Array<{
    // 保留历史数据
    date: string
    duration: number
    minutes: number
  }>
  todayProgress: {
    // 今日专用数据
    date: string
    duration: number
    minutes: number
  }
  todayOnly: boolean // 标记
}

export interface TaskRemainingResponse {
  taskId: string
  estimatedMinutes: number
  executedMinutes: number // 今日已执行时间（分钟）
  remainingMinutes: number // 今日剩余时间（分钟）
  remainingSeconds: number // 今日剩余时间（秒）
  executedSeconds: number // 今日已执行时间（秒）
  estimatedSeconds: number
  isCompleted: boolean
  todayOnly: boolean // 标记
  date: string // 计算基于的日期
}
```

## 用户体验变化

### 🎯 进度条行为

**之前**：

- 显示任务的累计总进度
- 一旦完成部分任务，进度条永远不会归零
- 可能显示超过 100%的进度

**现在**：

- 只显示今日的进度
- 每天早上进度条从 0 开始
- 最大显示 100%进度
- 符合每日重置的应用逻辑

### ⏰ 剩余时间显示

**之前**：

- 显示完成整个任务还需要的总时间
- 可能显示负数（如果总执行时间超过预估时间）

**现在**：

- 显示完成今日目标还需要的时间
- 每天从完整的预估时间开始倒计时
- 更符合日常任务管理的思维模式

## 数据完整性

### 📚 历史数据保留

- ✅ 所有历史执行数据仍然保存在 `dailyTimeStats` 中
- ✅ 统计页面仍然可以显示历史趋势
- ✅ 月度/周度统计功能不受影响
- ✅ 数据迁移和备份功能正常

### 🔄 兼容性保证

- ✅ API 响应结构保持向后兼容
- ✅ 现有前端组件无需修改
- ✅ 缓存系统自动适配新数据
- ✅ 类型安全得到保证

## 测试验证

### 🧪 验证场景

1. **今日无数据**：

   ```
   期望：进度条显示0%，剩余时间显示完整预估时间
   ```

2. **今日有部分数据**：

   ```
   期望：进度条显示今日进度，剩余时间相应减少
   ```

3. **今日完成任务**：

   ```
   期望：进度条显示100%，剩余时间为0
   ```

4. **跨日重置**：
   ```
   期望：新的一天进度条重置为0%
   ```

### 🔍 测试命令

```bash
# 测试今日进度API
curl http://localhost:3000/api/tasks/{taskId}/progress

# 测试今日剩余时间API
curl http://localhost:3000/api/tasks/{taskId}/remaining

# 验证返回数据包含todayOnly标记
```

## 优势总结

### 🎯 更直观的用户体验

- 进度条反映今日实际工作状态
- 每天都有新的开始感
- 符合人们对"每日任务"的认知

### 🔄 与重置系统一致

- 配合每日重置系统
- 状态重置和进度重置保持同步
- 避免用户混淆

### 📊 数据准确性

- 今日进度基于今日数据
- 避免历史数据干扰当日判断
- 更准确反映当前工作状态

### 🛠 技术优势

- 代码逻辑更清晰
- 计算更高效（只查询单日数据）
- 缓存策略更有效

---

**部署说明**：此更新已自动生效，无需手动操作。用户在下次使用时将自动看到基于今日数据的进度显示。
