# 御风接入与维护

当前主仓库：[Kuki-Hill/WuDao_MountainGathering](https://github.com/Kuki-Hill/WuDao_MountainGathering)。01–05 的新模块接入见 [统一接口](experience-integration.md)。

## 来源与技术

御风来源为 [WingBrone](https://github.com/Kuki-Hill/WingBrone)，初始参考提交 `699ff7114fbfaefb457fa407abea7e7fbca50f8d`。代码使用程序采样的稳定点身份、GPU 着色器动画，以及独立的输入—响应—反馈循环；没有使用 World Labs 资产，也没有把普通 Points 称为高斯泼溅。

主站保留米纸、墨绿、抹茶绿和木质强调色，粒子使用色彩核心与柔边衰减。CRT 纹理为全局默认，整合版御风没有原版/CRT 切换选项。正文和按钮位于装饰图形之上，深色按钮配浅色文字。

## 流程与资源释放

山图 → 御风台 → 石间 / 穿竹 / 风决准备页 → 进入御风 → 游戏 → 返回准备页。三幕为参考《切腹》（1962）构图的程序化占位，不打包电影片段。用户可暂停或手动选幕。

游戏默认使用方向键，摄像头只在用户主动选择后开启。进入游戏时主站暂停自己的渲染循环，退出卸载 iframe，避免同时维护多套渲染、事件与媒体流。主站与游戏通过 iframe 的独立 origin/source 校验通信，山图随后恢复渲染。

## 重建

源码在 `integrations/wingbrone`，运行资源在 `public/experiences/wingbrone`。

```bash
npm ci --prefix integrations/wingbrone
npm run build:wingbrone
npm run build:pages
```

游戏构建使用相对资源路径，适配主站的仓库子目录；MediaPipe Worker、WASM 与模型在本地静态资源中，来源及许可见各目录 CREDITS.md。单文件备份不包含完整游戏与大型模型，完整体验使用 HTTP 预览或部署构建。

根项目测试覆盖六入口、转场、剑道游戏挂载和退出、01–05 接口及卸载。摄像头识别和个人照片导出仍需在真实设备上另外检查。
