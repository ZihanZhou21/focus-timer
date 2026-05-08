# 项目说明与协作指南

## 项目概览

这是一个基于 Next.js App Router 的专注计时器与任务管理应用，名称为 `focus-timer`。应用围绕“今日任务、专注计时、进度记录、历史统计、每日重置”展开。

核心体验包括：

- 主页仪表盘：展示今日任务、周视图、活动日历、任务详情。
- 任务专注页：通过 `/focus?id=任务ID` 进入绑定任务的倒计时专注流程。
- 独立计时页：通过 `/timer` 使用不绑定任务的番茄钟/练习模式。
- 历史与统计：通过 `/calendar`、`/stats` 查看周/月/年维度的专注数据。
- 设置页：管理计时器偏好、通知、主题和每日重置。

## 技术栈

- 框架：Next.js `15.3.2`，App Router。
- UI：React `19`，Tailwind CSS `4`。
- 状态管理：Redux Toolkit + React Redux；项目中也安装了 Zustand，但当前主要状态在 Redux 中。
- 数据库：MongoDB 官方 Node SDK。
- 语言：TypeScript，开启 `strict`。
- 构建与开发：npm scripts 调用 Next.js。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
```

注意：`package.json` 中的 `lint` 脚本是 `next lint`，但新版本 Next.js 对 lint 命令支持可能有变化；如果 lint 失败，先确认是否是工具链版本问题。

## 重要目录

- `src/app`：Next.js 页面、布局、API Route、Redux store 和 slices。
- `src/app/api`：服务端 API 路由，负责任务 CRUD、专注会话、进度、剩余时间、统计、批量接口、每日重置等。
- `src/components`：主要 UI 组件，包括仪表盘、任务详情、专注计时器、统计卡片、导航等。
- `src/components/focus`：专注页的计时进度与控制按钮。
- `src/components/task-detail`：任务详情卡内部拆分组件。
- `src/components/watchfaces`：独立计时器的表盘组件。
- `src/hooks`：前端业务 hook，目前核心是 `useFocusTimerLogic`。
- `src/lib`：客户端 API 封装、数据库访问、类型、常量、计时器本地存储、批量请求、自动重置、清理管理等。
- `data`：本地任务 JSON 数据和备份。MongoDB 不可用时部分读取逻辑会回退到这里。
- `public`：静态资源，包括提示音 `alert.mp3` 和 `break_end.mp3`。

## 数据与环境变量

项目使用 MongoDB 作为主存储，环境变量位于 `.env.local`：

- `MONGODB_URI`
- `DB_NAME`

不要把真实连接串、密码或生产凭据写进文档、日志、提交信息或公开输出。当前代码在 `src/lib/database.ts` 中也有默认 MongoDB URI 字符串，修改数据库逻辑时应优先使用环境变量，并避免继续扩散硬编码凭据。

数据库集合名称为 `tasks`。当 MongoDB 读取失败时，`readTasksData`、`findTaskById`、`findUserTasks` 等部分逻辑会尝试读取 `data/tasks.json` 作为本地回退；写入失败通常会抛错或返回失败，不会自动写回本地 JSON。

## 核心数据模型

任务类型定义在 `src/lib/types.ts`：

- `BaseTask`：任务公共字段，包括 `_id`、`userId`、`type`、`title`、`content`、`status`、`priority`、`tags`、`createdAt`、`updatedAt`、`completedAt`、`plannedTime`。
- `TodoTask`：待办任务，包含 `dueDate`、`estimatedDuration`、`dailyTimeStats`。
- `CheckInTask`：打卡任务，包含 `checkInHistory`、`recurrence`。

重要约定：

- `status` 可为 `pending`、`in_progress`、`completed`、`archived`。
- `completedAt` 是日期字符串数组，格式类似 `YYYY-MM-DD`。
- `dailyTimeStats` 是 TODO 任务的每日专注秒数映射，例如 `{ "2026-05-08": 1800 }`，现在是主要的时间统计来源。
- 旧的 `timeLog` 已被移除或废弃，新增时间应通过 session API 更新 `dailyTimeStats`。

## 前端状态管理

Redux store 位于 `src/app/store.ts`，包含以下 slice：

- `tasksSlice`：主页任务列表、当前选中任务、加载状态。
- `timerSlice`：全局计时器状态，包括剩余时间、是否运行、任务 ID、开始时间、预计结束时间、累计时间等。
- `taskInfoSlice`：专注页任务信息和实时进度。
- `statsSlice`：统计相关状态。

`ClientProvider` 会在全局挂载 Redux Provider，并渲染 `TimerBackgroundManager`。因此计时器不是只依赖某个页面组件运行，而是通过全局后台管理组件持续 tick、保存和完成任务。

## 计时器机制

核心 hook 是 `src/hooks/useFocusTimerLogic.ts`。

它负责：

- 初始化计时器。
- 从 `localStorage` 恢复未完成的计时状态。
- 开始/暂停计时。
- 节流保存计时状态。
- 暂停或离开页面时保存 session。
- 同步后端任务进度。
- 处理键盘快捷键，主要是 `Space` 和 `Escape`。

`TimerBackgroundManager` 负责：

- 运行全局 1 秒 tick。
- 每 10 秒保存计时状态到 `localStorage`。
- 当任务倒计时归零时调用 `/api/tasks/[id]/complete`。
- 完成后同步 Redux 任务状态、清理本地计时状态，并在 `/focus` 页时返回主页。

本项目计时逻辑依赖时间戳字段 `startTime` 和 `expectedEndTime` 来减少浏览器后台降频带来的误差。

## 主要 API 路由

任务基础接口：

- `GET /api/tasks?userId=user_001`：获取用户任务。
- `POST /api/tasks`：创建任务。
- `PUT /api/tasks`：批量更新任务。
- `GET /api/tasks/[id]`：获取单个任务。
- `PUT /api/tasks/[id]`：更新任务，包含 `completedAt` 的特殊处理。
- `DELETE /api/tasks/[id]`：删除任务。

专注与进度：

- `POST /api/tasks/[id]/session`：记录一次专注时长，增加今天的 `dailyTimeStats`。
- `POST /api/tasks/[id]/session-v2`：新版 session 接口，修改前需先阅读实现。
- `GET /api/tasks/[id]/progress`：获取今日进度。
- `GET /api/tasks/[id]/remaining`：获取今日剩余时间。
- `POST /api/tasks/[id]/complete`：完成任务。

今日任务与统计：

- `GET /api/tasks/today`：获取今日任务，可通过 `format=project-items` 转成主页 UI 使用的格式。
- `GET /api/tasks/weekly-stats`：周统计。
- `GET /api/tasks/monthly-stats`：月统计。
- `GET/POST /api/tasks/reset-daily`：每日重置状态与手动重置。
- `POST /api/scheduler?action=daily-reset`：自动重置调度入口。
- `GET /api/health`：健康检查。

批量接口：

- `POST /api/tasks/batch/progress`
- `POST /api/tasks/batch/remaining`
- `POST /api/tasks/batch/info`

批量接口最多处理 50 个任务 ID，并以 `success`、`errors`、`count` 的结构返回。客户端封装在 `src/lib/batch-task-api.ts`，带 2 分钟内存缓存。

## 客户端 API 封装

- `src/lib/api.ts`：通用任务服务 `TaskService` 和兼容旧 UI 的 `ProjectItem` 类型。
- `src/lib/today-api.ts`：今日任务服务，将后端任务转成主页需要的 `ProjectItem`。
- `src/lib/task-progress-api.ts`：任务进度客户端请求与缓存。
- `src/lib/task-remaining-api.ts`：任务剩余时间客户端请求与缓存。
- `src/lib/batch-task-api.ts`：批量进度、剩余时间、任务信息请求。
- `src/lib/weekly-stats-api.ts`、`src/lib/monthly-stats-api.ts`：统计接口封装。

## 页面职责

- `src/app/page.tsx`：主页仪表盘。加载今日任务，展示周图、活动日历、任务列表和任务详情卡。
- `src/app/focus/page.tsx`：绑定任务的专注页。读取 URL 参数中的任务 ID、剩余时间、已用时间等，并与后端任务进度同步。
- `src/app/timer/page.tsx`：独立专注空间/练习模式，使用 `FocusTimer`。
- `src/app/calendar/page.tsx`：历史统计视图，支持周/月/年切换。
- `src/app/stats/page.tsx`：统计页。
- `src/app/settings/page.tsx`：设置页，包含每日重置管理。
- `src/app/layout.tsx`：根布局，包含 metadata、viewport 和 `ClientProvider`。

## 每日重置

自动重置逻辑在 `src/lib/auto-reset.ts`：

- 使用 `localStorage` 保存上次重置日期和开关状态。
- 客户端启动后立即检查一次，之后每分钟检查一次。
- 页面重新可见或重新获得焦点时也会检查。
- 需要重置时调用 `/api/scheduler?action=daily-reset`。
- 重置完成后触发 `daily-reset-completed` 事件，主页会监听并重新加载今日任务。

设置页也提供手动调用 `/api/tasks/reset-daily?userId=user_001` 的入口。

## 代码风格与注意事项

- 路径别名 `@/*` 指向 `src/*`。
- TypeScript 开启严格模式，新增类型时尽量贴近 `src/lib/types.ts` 的现有模型。
- 项目中不少中文注释和文案在当前终端输出中显示为乱码，但源码意图大多仍可从上下文判断；编辑时尽量保持 UTF-8，避免继续引入编码问题。
- 当前 UI 主要是深色 slate 风格，主页和专注页使用 Tailwind class 直接组合。
- 不要随意重构 `timerSlice`、`useFocusTimerLogic`、`TimerBackgroundManager` 三者之间的协作，它们共同维护全局计时、恢复和完成任务。
- 改任务进度或统计时，要优先考虑 `dailyTimeStats`，不要重新引入旧的 time log 结构。
- 改 API 时注意 MongoDB 失败回退逻辑：读取有本地 JSON 回退，写入通常没有完整回退。
- `DEFAULT_USER_ID` 当前固定为 `user_001`，多用户能力尚未完整产品化。
- `next.config.ts` 在客户端禁用了 `fs`、`path`、`os` fallback，避免服务端模块打进客户端 bundle。

## 当前仓库状态提示

本说明创建时，工作区已有未提交改动：

- `src/app/layout.tsx`
- `src/lib/database.ts`
- `src/lib/task-progress-api.ts`
- `src/lib/task-remaining-api.ts`

还有本地日志文件：

- `.codex-dev.err`
- `.codex-dev.log`

这些不是本次文档整理产生的业务改动。后续协作时不要误删或回退他人的未提交修改。

