# 武道山集 · WuDao Mountain Gathering

一座粒子高山，六处武道场地。桌面端交互 Demo，使用 React、TypeScript、Three.js / React Three Fiber 和 Vite。保留米纸、抹茶绿、墨绿及 CRT 纹理。

## 运行与验证

需要 Node.js 22 LTS 和 npm。

```bash
npm ci
npm run dev
npm test
npm run build
```

本机持续预览可运行 `npm run review`，或双击 `start-preview.cmd`。`start-preview.cmd` 只适用于 Windows；macOS 与 Linux 请直接运行 `npm run review`。出现 `WuDao is ready` 后打开终端给出的地址，预览窗口需保持运行。代码开发使用 dev 服务；验收预览会先打包，修改后需要重启。

## 当前体验

- 首屏是云雾入口；点击「拨云入山」，穿过云层飞近山体。
- 山坡延伸到屏幕之外，远处有层叠群山。拖动环看、右键平移、滚轮缩放。
- 点击地图入口、底栏，或按数字 1–6 进入场地。移动指针可以轻推粒子，点击地面出现涟漪。
- 01–05 保留双人切磋与全屏篇章，提供各自独立的互动模块接入点；目前没有启用正式游戏。
- 06 剑道提供石间、穿竹、风决三幕准备场景及御风游戏，默认键盘操作，可在游戏内主动选择摄像头。
- 切换场地时先向四边散尽粒子，再聚成新场景。Esc 返回上一层，游戏内 Esc 由游戏处理，左上角退出。
- 中英切换、粒子疏密、静息模式可用；主站音轨暂未启用，只保留事件与素材接口。

## 共同创作

请从 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [01–05 接入指南](docs/experience-integration.md) 开始。

| 编号 | 武道 | 独立接入文件 |
| --- | --- | --- |
| 01 | 少林 | `src/experiences/shaolin/index.ts` |
| 02 | 咏春 | `src/experiences/wingchun/index.ts` |
| 03 | 跆拳道 | `src/experiences/taekwondo/index.ts` |
| 04 | 拳击 | `src/experiences/boxing/index.ts` |
| 05 | 相扑 | `src/experiences/sumo/index.ts` |
| 06 | 剑道 / 御风 | `src/mountain/KendoPreparation.tsx` 与 `integrations/wingbrone/` |

01–05 可以分别接入 React 模块或独立 HTML / iframe 项目。宿主传入语言、音轨开关、静息状态、画质、素材配置，提供退出、完成及暂停/释放生命周期。保持 `entry: null` 时继续展示预留篇章；完成模块后只需修改自己的注册文件。各模块在完整粒子转场结束后挂载，退出后卸载。

## 构建与部署

`npm run build:pages` 使用仓库子路径 `/WuDao_MountainGathering/` 构建。GitHub Actions 会在推送和 PR 上运行测试及该构建，并保存站点产物，尚不自动开启公开网页托管。

`npm run build:portable` 可重新生成单文件备份，完整御风整合版请通过 HTTP 预览运行。御风源码更新后运行 `npm ci --prefix integrations/wingbrone` 和 `npm run build:wingbrone`，详见 [御风维护说明](docs/WingBrone接入与新版交互.md)。

测试覆盖入口状态、六个场地、转场、模块消息校验和卸载；模拟渲染器的 UI 测试不代替真实 WebGL 视觉检查。
