# 剩余时间计算重构总结

## 问题背景

原有的剩余时间计算存在小数点问题，主要原因是：

1. **多次转换累积误差**：秒 → 分钟 → 再次计算时产生舍入误差
2. **基于进度数据的二次计算**：在进度 API 基础上再次计算剩余时间
3. **四舍五入策略不一致**：不同地方使用 Math.round()产生不同结果

## 新的数据流设计

### 旧数据流（有问题）

```
原始数据(秒) → 进度API(秒→分钟+四舍五入) → TaskDetailCard(再次计算) → Focus页面
```

### 新数据流（正确）

```
原始数据(秒) → 剩余时间API(秒→分钟+向下取整) → TaskDetailCard(直接使用) → Focus页面
```

## 核心改进

### 1. 新增剩余时间 API

- **路径**: `/api/tasks/[id]/remaining`
- **功能**: 直接从原始数据计算剩余时间
- **特点**: 使用 Math.floor()避免向上舍入，确保整数分钟结果

### 2. 计算逻辑优化

```typescript
// 避免小数点的正确计算方式
const estimatedMinutes = Math.floor(estimatedDuration / 60) // 向下取整
const executedMinutes = Math.floor(totalExecutedSeconds / 60) // 向下取整
const remainingMinutes = Math.max(0, estimatedMinutes - executedMinutes)
```

### 3. 新增 API 服务层

- **文件**: `src/lib/task-remaining-api.ts`
- **功能**: 提供缓存、批量请求等功能
- **缓存**: 2 分钟智能缓存

## 修改的文件

### 新增文件

1. `src/app/api/tasks/[id]/remaining/route.ts` - 剩余时间 API
2. `src/lib/task-remaining-api.ts` - 剩余时间 API 服务

### 修改文件

1. `src/components/TaskDetailCard.tsx` - 使用新的剩余时间 API

## API 对比

### 旧进度 API 返回

```json
{
  "taskId": "xxx",
  "totalExecutedTime": 3600, // 秒
  "estimatedDuration": 7200, // 秒
  "progressPercentage": 50.7 // 带小数
}
```

### 新剩余时间 API 返回

```json
{
  "taskId": "xxx",
  "estimatedMinutes": 120, // 分钟（整数）
  "executedMinutes": 60, // 分钟（整数）
  "remainingMinutes": 60, // 分钟（整数）
  "isCompleted": false
}
```

## 实际测试结果

### 测试数据

- **任务 1**: estimatedDuration=14400 秒, timeLog=10800 秒
- **任务 2**: estimatedDuration=7200 秒, timeLog=3600 秒

### API 响应

```bash
# 任务1
curl /api/tasks/task_1719399600001_ghijkl456/remaining
{
  "estimatedMinutes": 240,    # 14400/60 = 240 ✅
  "executedMinutes": 180,     # 10800/60 = 180 ✅
  "remainingMinutes": 60      # 240-180 = 60 ✅
}

# 任务2
curl /api/tasks/task_1719399600002_mnopqr789/remaining
{
  "estimatedMinutes": 120,    # 7200/60 = 120 ✅
  "executedMinutes": 60,      # 3600/60 = 60 ✅
  "remainingMinutes": 60      # 120-60 = 60 ✅
}
```

## 优势总结

1. ✅ **避免小数点问题** - 使用 Math.floor()确保整数结果
2. ✅ **减少计算误差** - 单次转换，避免累积误差
3. ✅ **数据流更清晰** - 直接从原始数据计算
4. ✅ **性能更好** - 专门的 API，减少不必要的计算
5. ✅ **更容易维护** - 逻辑集中，便于调试
6. ✅ **向下兼容** - 保留原有进度 API，平滑过渡

## 后续优化建议

1. **批量 API**: 可以考虑添加批量获取多任务剩余时间的 API
2. **缓存优化**: 可以在任务更新时主动清除相关缓存
3. **类型安全**: 可以进一步完善 TypeScript 类型定义
4. **错误处理**: 可以添加更详细的错误处理和降级策略
