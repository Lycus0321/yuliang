# 余量

拓竹云端耗材库的手机客户端原型。核心流程：

```text
拓竹账号登录 -> 读取耗材库 -> 整盘称重 -> 扣除皮重 -> 写回 netWeight
```

## 运行

浏览器调试分别启动 Cloudflare Worker 与 Expo：

```powershell
npm run worker:dev
npm run web
```

浏览器访问 `http://localhost:8081`。Worker 本地运行在 `http://localhost:8787`，负责 Bambu 登录、HttpOnly 会话和耗材 API 转发。

手机或 PWA 部署时通过 `EXPO_PUBLIC_API_BASE` 指向 Worker。生产环境由 Worker 同源托管 PWA，因此不需要配置跨域地址。

## 构建与部署

```powershell
npm run build:web
npm run worker:deploy
```

首次部署前设置生产会话密钥：

```powershell
npx wrangler secret put SESSION_SECRET --config worker/wrangler.jsonc
```

Worker 会同时托管 `dist-web` 静态资源和 `/api/*`。Android JS Bundle 可通过以下命令验证：

```powershell
npx expo export --platform android --output-dir dist-android
```

## Web UI 原型

独立的静态 Web 原型位于 `prototype/`，不会调用接口：

```powershell
npx serve prototype -l 4173
```

浏览器访问 `http://localhost:4173`。原型包含耗材库、料盘编辑弹窗、偏好设置和账号登录界面。称重与基本信息编辑都归入同一料盘弹窗，通过 Tab 切换。

品牌、类型与颜色预设参考 BambuStudio `resources/profiles/BBL`。编辑弹窗默认只显示常用选项，剩余选项通过下拉框内的“加载更多”展开。
偏好设置提供统一的“耗材目录管理”，按品牌 → 型号 → 颜色组织。一个品牌可包含多个型号，一个型号可配置多个颜色和一个默认空盘皮重；删除自定义品牌或型号时会清理对应颜色与默认皮重配置，但不会改动已使用这些选项的料盘。
目录管理作为 Settings 的顶级分类直接嵌入主面板，品牌、型号和颜色的添加或编辑通过弹窗表单完成，避免在树形列表中混排输入控件。
品牌、型号和颜色采用分层显示规则：隐藏品牌会同步隐藏其型号和颜色，隐藏型号会同步隐藏其颜色；子项原显示状态会保留，解除上层隐藏后恢复。
型号管理按品牌分组，颜色管理按 Bambu 型号色卡和通用颜色分组；分组面板可独立展开或收起，避免一次铺开全部选项。
选项管理采用列表与表单分离的流程：列表只负责查看、显示控制、删除和默认项设置，点击底部新增按钮或铅笔编辑后进入独立表单，保存或取消后返回列表。
自定义颜色支持新增和编辑，可直接拖拽饱和度/明度面板与色相条生成颜色，也可点选常用色块或输入 HEX 精确调整；内置颜色保持只读，不会因本地编辑改动官方色卡。

空盘皮重和其他重量使用“名称 + 克重”的预设结构。内置空盘只保留 `通用空盘 200 g`，其余皮重由用户自行新增或编辑。
空盘皮重预设可绑定适用品牌与型号。称重时优先匹配品牌和型号完全一致的预设，其次匹配品牌级预设，再回退到全局默认皮重。
皮重预设的品牌与型号通过现有官方/自定义目录选择，不再依赖自由文本输入，避免拼写和别名造成匹配失败。
预设管理支持新增、编辑、删除、隐藏和设置默认项。内置预设的名称与克重修改只保存在本机，不会改动 Bambu Studio；删除默认预设后会自动回退到内置默认值。
自定义选项删除前需要二次确认，颜色列表显示实际色样；云端目录可用时，品牌与型号选项优先使用云端结果，内置目录仅作为请求失败时的回退。

正式应用会通过 Worker 的 `/api/catalog` 同步 Bambu 官方耗材目录和用户切片预设，并在目录不可用时回退到内置预设。每个料盘的皮重和其他重量选择会保存在本机。

本地偏好使用 AsyncStorage 持久化，JSON 导出会生成 `yuliang-preferences-YYYY-MM-DD.json`。导入支持合并和完整替换两种模式，覆盖 RFID 开关、默认皮重、自定义选项、隐藏项和每盘重量记忆。

## 移动端构建

Android 内测 APK 和 iOS TestFlight 构建使用：

```powershell
npm run build:android:preview
npm run build:ios:preview
```

首次构建需要登录 Expo 账号并完成 Android 或 Apple 签名配置。

## 数据接口

- 登录：`POST /v1/user-service/user/login`
- 读取耗材库：`GET /v1/design-user-service/my/filament/v2`
- 修改剩余重量：`PUT /v1/design-user-service/my/filament/v2`
- 删除耗材：`DELETE /v1/design-user-service/my/filament/v2/batch`

中国大陆使用 `api.bambulab.cn`，国际区使用 `api.bambulab.com`。

## 限制

- 接口为社区逆向的非公开接口，拓竹调整接口后需要适配。
- 当前版本支持密码登录和邮箱/短信验证码登录，暂不支持 TOTP 双重验证。
- 浏览器、PWA 和原生 App 均通过 Cloudflare Worker 访问拓竹云，Bambu Token 不进入客户端。
- 手机原生直连仍可能受到 Cloudflare 策略影响，出现拦截时需要在自有后端增加转发。

## RFID 料盘编辑

默认使用安全模式：保留 RFID 原始品牌、类型和颜色，将自定义信息同时写入料盘名称和备注。

打开编辑页的“强制修改 RFID 字段”开关后，客户端会直接写回 `filamentVendor`、`filamentType`、`color` 和 `colors`。该模式可能导致 Studio 刷新后与 RFID 标签数据冲突。
安全模式只在品牌、型号或颜色实际发生变化时写入名称和备注；单纯修改备注不会生成额外的身份信息。称重页会阻止小于皮重与其他重量之和的整盘总重。
料盘弹窗提供“标记用尽”和“删除料盘”。用尽会把剩余量写为 `0 g` 并保留云端记录；删除会从拓竹云耗材库永久移除记录，已装在 AMS 中的 RFID 料盘可能在下次同步时重新出现。
剩余量为 `0 g` 的耗材默认从全部、已装入和低余量列表中隐藏，可通过“已用尽”筛选查看。
