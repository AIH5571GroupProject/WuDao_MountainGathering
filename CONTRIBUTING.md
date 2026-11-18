# 共同创作

## 分工

每个武道各自维护 `src/experiences/<arenaId>/`。独立项目的静态产物放到 `public/experiences/<arenaId>/`。地图、相机、公共转场和主站样式由主站维护，调整这些共享部分前先在 Issue 中协调。

仓库协作者拥有 Write 权限后可以直接推送。建议每次创作建立自己的分支，再通过 PR 合并，减少彼此覆盖：

```bash
git clone https://github.com/Kuki-Hill/WuDao_MountainGathering.git
cd WuDao_MountainGathering
npm ci
git switch -c feature/shaolin-your-name
npm run dev
# 完成后
npm test
npm run build:pages
git add src/experiences/shaolin public/experiences/shaolin
git commit -m "Add Shaolin experience"
git push -u origin feature/shaolin-your-name
```

只暂存本次实际改动的路径；没有静态目录时省略该路径。邀请链接需要用被邀请的 GitHub 账号登录并接受，接受后 Write 权限才生效。

## 接入与验收

详细合同与可复制模板见 [模块接入指南](docs/experience-integration.md)。

- 保留米纸 `#e9ecdf`、墨绿 `#394c39`、木质强调色 `#986c50`；深色按钮搭配浅色字。避免引入紫色主视觉。
- 中英双语、静息模式、暂停/恢复需要覆盖。摄像头或声音只能由用户主动开启。
- React 卸载时取消动画帧、计时器、事件、音频、摄像头，并释放 Three.js 资源；iframe 模块接收释放消息并处理 `pagehide`。
- 验证进入、退出、反复进出、切换武道、加载失败、缩放与仓库子路径下的资源。提供截图或浏览器检查结果。
- 不提交密钥、登录凭据、个人媒体、node_modules、临时截图与参考电影帧。第三方素材和依赖注明来源与许可。

主站 CI 会检查测试和生产构建；合并前请查看结果。
