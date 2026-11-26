# 01–05 独立模块接入

## 目录和路由

每个武道的注册文件是 `src/experiences/<arenaId>/index.ts`：`shaolin`、`wingchun`、`taekwondo`、`boxing`、`sumo`。注册表自动接回山图，不需要修改主站流程。

流程：山图 → 双人切磋 →「进入篇章」→ 全屏预留页 → 已配置时出现「进入体验」→ 粒子散尽、聚拢 → 挂载模块。退出体验 → 粒子转场 → 原篇章；从篇章可回到切磋或山图。未完成的模块保留 `entry: null`，不会出现空白游戏按钮。

## React 模块

把 `src/experiences/_template/Experience.tsx` 复制到自己的目录，注册文件改为：

```ts
entry: { kind: 'react', load: () => import('./Experience') },
```

默认导出组件接收 `ExperienceProps`，类型定义位于 `src/experiences/types.ts`：

| 字段 | 含义 |
| --- | --- |
| version / arenaId | 协议 1 和场地标识 |
| language | zh 或 en |
| soundEnabled | 主站音轨开关，不表示用户已授予自动播放权限 |
| reducedMotion / quality | 静息模式与 airy、balanced、full 三档 |
| paused | 标签页不可见时为 true，暂停模拟、动画及音频 |
| assets | 场景、角色、电影、环境音、场内音的 URL 预留 |
| onExit() | 请求回到原篇章 |
| onComplete(result) | 通知完成，可含 score、completed、summary |

完成消息由主站发出 `wudao:experience-complete` CustomEvent，detail 为 `{ arenaId, result }`，暂不联网保存成绩。主站取消 WebGL 渲染循环让出 GPU；模块负责自己的渲染、资源加载和 useEffect 清理。

## 独立 HTML / Three.js 项目

将打包后的 index.html 和相对路径资源放到 `public/experiences/<arenaId>/`。Vite 子项目使用 `base: './'`。注册文件改为：

```ts
entry: { kind: 'iframe', src: 'experiences/shaolin/index.html' },
```

不要写死主站根路径或 localhost。宿主会按 BASE_URL 补上 GitHub 仓库路径。只有模块确实使用摄像头时添加 `camera: true`；在模块里仍需主动按钮请求授权。

可复制 `public/experiences/_template/index.html` 开始开发，并把其中 `arenaId` 改成自己的场地。模板默认同源集成。跨源集成时需要在子项目中明确允许主站 origin，不使用通配符向任意来源发送上下文。

### 消息协议

所有消息包含 `{ type, version: 1, arenaId }`。子项目必须校验 `event.source === parent` 和预先允许的主站 origin；宿主同样校验 iframe 窗口、origin、场地和版本。

| 方向 | type | 附加内容 |
| --- | --- | --- |
| 子 → 主 | wudao:ready | 模块事件监听器和必要资源就绪后发送 |
| 主 → 子 | wudao:init | 全部 ExperienceContext 字段 |
| 主 → 子 | wudao:context | 语言、音轨开关等上下文更新 |
| 主 → 子 | wudao:pause | paused: boolean |
| 主 → 子 | wudao:dispose | 释放资源，不再发起新的任务 |
| 子 → 主 | wudao:complete | result: { score?, completed?, summary? } |
| 子 → 主 | wudao:exit | 请求回到篇章 |
| 子 → 主 | wudao:error | 请求展示宿主的重试提示 |

宿主监听器在 iframe 挂载时建立。子模块准备好后发送 ready，收到 init 后开始使用上下文；20 秒没有 ready 会出现重试入口，迟到的 ready 仍可恢复。离开时 iframe 被卸载。dispose 消息是尽力通知，必须同时处理 pagehide，不能只依赖消息送达；摄像头、音频、动画帧也要在自己的销毁代码中停止。

## 素材与音轨

注册文件的 assets 提供 `sceneUrl`、`actorUrl`、`filmUrl`、`ambientAudio`、`stageAudio`，默认均为 null。主站向模块透传这些配置，**不会自动加载、播放或把模型转换为点云**；由模块自行解析。相对 URL 需相对主站 BASE_URL 解析。

主站另有 `wudao:audio` 事件，detail 含 `kind: near | enter | leave | enabled`、`arenaId`、`enabled`。该接口仅发送意图，当前没有音轨播放器。

## 本地验收

1. 启用自己的 entry 后运行 npm run dev。
2. 从云雾入口入山，选择自己的场地 → 进入篇章 → 进入体验。
3. 确认模块在转场后出现，退出能回到篇章，反复进入不会叠加音轨或摄像头。
4. npm test 和 npm run build:pages 均通过后推送分支。

06 剑道沿用独立的三幕准备页和御风入口，此注册表不替换它。
