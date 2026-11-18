# WingBrone · Budo 本地接入

上游：https://github.com/Kuki-Hill/WingBrone
固定参考提交：699ff7114fbfaefb457fa407abea7e7fbca50f8d

此目录保留改色和嵌入适配后的源码。游戏逻辑沿用上游；仅调整米纸/竹绿配色、点大小、加载通知。相机和键盘模式仍由访客在游戏内部选择。

已构建的游戏、Worker、WASM 和模型在 public/experiences/wingbrone，可由根项目直接运行。根项目 npm run build 无需重新安装游戏依赖。

修改游戏后，在仓库根目录执行：

    npm ci --prefix integrations/wingbrone
    npm run build:wingbrone
    npm run build

build:wingbrone 保留现有 vision 模型目录，使用相对路径，支持 /Budo/ 子目录部署。旧构建哈希文件可在确认无引用后清理；不自动删除模型。第三方归属见本目录 CREDITS.md。

加载完成通知 wingbrone:ready 只发向当前来源；父页面校验消息来源和窗口。退出入口会卸载 iframe，暂停山图的设置随即解除。
