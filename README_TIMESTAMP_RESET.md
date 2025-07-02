# 基于时间戳的逻辑重置系统

## 概述

本系统实现了基于时间戳的逻辑重置功能，替代了原有的 `node-cron` 定时任务方案。这种方法更适合 serverless 环境，无需依赖定时服务，在用户访问时动态判断是否需要重置任务状态。

## 工作原理

### 核心思想

- **不实际删除数据**：保留所有历史数据
- **动态计算状态**：基于时间戳在查询时判断显示状态
- **今日视图**：只显示今天的进度和状态

### 重置规则

任务被视为需要重置的条件：

1. 任务的最后更新时间不是今天
2. 任务的完成时间不是今天
3. TODO 任务没有今天的时间记录
4. 打卡任务没有今天的打卡记录

### 技术实现

#### 1. 时间戳工具函数 (`src/lib/timestamp-reset.ts`)

- `isToday()`: 判断日期是否为今天
- `shouldShowResetState()`: 判断任务是否需要显示重置状态
- `applyLogicalReset()`: 应用逻辑重置到任务
- `getTodayTimeLogs()`: 获取今天的时间记录

#### 2. API 层面的修改

- **今日任务 API** (`src/app/api/tasks/today/route.ts`): 获取任务时自动应用逻辑重置
- **任务进度 API** (`src/app/api/tasks/[id]/progress/route.ts`): 只计算今天的进度

#### 3. 缓存管理

- **智能缓存失效**: 新的一天自动清除缓存
- **过期缓存清理**: 定期清理跨日的缓存数据

## 优势对比

### 与 Cron 方案对比

| 特性                  | 时间戳重置      | Cron 重置           |
| --------------------- | --------------- | ------------------- |
| **serverless 兼容性** | ✅ 完全兼容     | ❌ 需要持续服务     |
| **数据安全性**        | ✅ 保留历史数据 | ❌ 删除数据         |
| **资源消耗**          | ✅ 按需计算     | ❌ 定时执行         |
| **调试便利性**        | ✅ 即时测试     | ❌ 需要等待触发     |
| **部署复杂度**        | ✅ 无需配置     | ❌ 需要配置定时任务 |

### 优势

1. **零配置**: 无需设置定时任务或外部服务
2. **数据完整性**: 保留所有历史数据，便于统计和分析
3. **实时响应**: 用户打开应用即可看到正确的重置状态
4. **调试友好**: 可以随时测试重置逻辑
5. **成本效益**: 无额外服务费用

## 使用示例

### 检查任务是否需要重置

```typescript
import { shouldShowResetState } from '@/lib/timestamp-reset'

const task = await getTask(taskId)
if (shouldShowResetState(task)) {
  console.log('任务将显示重置状态')
}
```

### 获取今天的任务进度

```typescript
import { getTodayProgress } from '@/lib/timestamp-reset'

const progress = getTodayProgress(todoTask)
console.log(`今日进度: ${progress}%`)
```

### 应用逻辑重置

```typescript
import { applyLogicalReset } from '@/lib/timestamp-reset'

const resetTask = applyLogicalReset(originalTask)
// resetTask 显示重置后的状态，但不修改原数据
```

## 数据流程

1. **用户打开应用** → 清除过期缓存
2. **加载任务列表** → 应用逻辑重置规则
3. **显示任务状态** → 基于今日数据计算进度
4. **用户操作任务** → 正常记录数据
5. **第二天访问** → 自动显示重置状态

## 注意事项

1. **时区一致性**: 所有时间判断基于系统时区
2. **缓存策略**: 缓存会在跨日时自动失效
3. **数据迁移**: 兼容现有数据结构，无需迁移
4. **性能考虑**: 计算开销较小，适合实时计算

## 测试验证

### 本地测试

```bash
# 修改系统时间到昨天，创建任务
# 恢复系统时间到今天，检查任务状态
```

### API 测试

```bash
# 获取任务进度 - 应该只显示今天的数据
curl http://localhost:3000/api/tasks/{taskId}/progress

# 获取今日任务 - 应该显示重置状态
curl http://localhost:3000/api/tasks/today?userId=user_001
```

## 维护说明

- **定期检查**: 无需特殊维护，系统自动管理
- **数据备份**: 建议定期备份 `data/tasks.json`
- **监控建议**: 关注缓存命中率和 API 响应时间
