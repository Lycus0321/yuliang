# 余量

拓竹云端耗材称重与库存管理应用，基于 Expo + React Native + TypeScript，同时输出 PWA、Android，并保留 iOS 上架能力。

- 当前版本：`1.1.11`
- Android：`versionCode 23`

```text
拓竹账号登录
  -> 读取云端耗材库
  -> 整盘称重
  -> 扣除空盘皮重与其他重量
  -> 写回耗材剩余净重
```

## 当前功能

### 登录与会话

- 中国大陆区、国际区切换。
- Bambu 账号密码登录。
- 邮箱或短信验证码登录。
- 验证器 TOTP 双重验证流程。
- Web/PWA 登录态由 Cloudflare Worker 和 HttpOnly Cookie 管理。
- Android/iOS Token 保存在系统安全存储中。
- 支持会话恢复、退出登录、401 自动返回登录页。
- 支持本地演示模式。

### 耗材库

- 从拓竹云端读取耗材库。
- 按 PLA、PETG、ABS、ASA、TPU、PC、PA、其他材料分组。
- 显示品牌、型号、颜色、装入位置、RFID/手动类型和剩余量。
- 搜索品牌、型号、颜色和备注。
- 筛选全部、已装入、低余量和已用尽。
- 已用尽耗材默认隐藏。
- 支持默认、余量升降序和名称排序。
- 支持卡片与列表视图，移动端保留 RFID、装入位置和已用尽标识。
- 材料分类支持点击标题展开或收起。
- 筛选、排序和视图状态在页面切换后保留。
- 支持下拉刷新与手动同步。

### 料盘编辑与称重

- 编辑和称重位于同一料盘弹窗，通过 Tab 切换。
- 可编辑名称、品牌、型号、颜色和备注。
- 品牌、型号、颜色联动选择。
- 使用“加载更多”展开被隐藏的选项。
- 输入整盘总重后自动扣除皮重和其他重量。
- 总重和皮重/附加重量预设仅接受整数克重，小数输入会被前端限制。
- 校验空值、非法数字、负数、超重和总重小于皮重的情况。
- 每个料盘记忆上次使用的皮重和其他重量。
- 支持标记用尽和从拓竹云端删除。
- 未保存修改关闭弹窗时二次确认。
- API 超时或保存失败时，错误固定显示在弹窗底部操作区上方。

### 耗材目录

“耗材目录”是一级入口，结构为：

```text
品牌
  -> 多个型号
       -> 多个颜色
       -> 一个默认空盘皮重
```

- 新增、编辑、隐藏和删除自定义品牌、型号、颜色。
- 隐藏品牌联动隐藏型号和颜色。
- 隐藏型号联动隐藏颜色。
- 官方目录可用时优先使用云端数据，失败时回退内置目录。
- 删除目录选项不会修改已有料盘。
- 型号可绑定默认空盘皮重。
- 新增和编辑使用弹窗，列表与表单分离。
- 移动端按品牌 → 型号 → 颜色分步进入。

### 颜色与皮重

- 颜色选择器支持拖拽饱和度/明度面板和色相条。
- 支持常用色块、HEX 输入和实时预览。
- 官方颜色只读，自定义颜色可编辑和删除。
- 空盘皮重与其他重量均使用“名称 + 克重”结构。
- 内置空盘仅保留“通用空盘 200 g”。
- 皮重可绑定品牌和型号，并支持隐藏、默认和本机覆盖。
- 称重时按“上次选择 → 型号默认 → 品牌+型号 → 品牌 → 型号 → 全局默认”匹配。

### RFID 策略

- 默认安全模式保留 RFID 原始品牌、型号和颜色。
- 自定义身份信息写入料盘名称和备注。
- 单纯修改备注不会追加身份字段。
- 偏好设置中可全局开启“强制修改 RFID 字段”。
- 强制模式会直接覆盖品牌、型号、颜色和颜色数组。
- 强制模式可能与 Bambu Studio、Handy 或实体标签冲突。

### 数据管理

- 本地偏好使用 AsyncStorage 持久化。
- 导出 JSON 在输入框中展示，由用户手动选择复制。
- 导入 JSON 通过输入框粘贴，不生成文件，也不调用剪切板 API。
- 支持合并导入和完整替换。
- 合并时按 ID 和内容去重。
- 完整替换前二次确认。
- 自动拦截空内容、无效 JSON 和非对象数据。
- JSON 不包含 Bambu Token、Cookie 或账号凭证。

### 响应式与 Android

- PC 顶部导航，手机底部导航。
- 内容最大宽度 `1200px`，页面栅格左右留白 `24px`。
- 适配安全区域、窄屏和 Android 软键盘。
- Android 使用键盘 `resize` 模式。
- 弹层正文可滚动，底部操作区固定。
- Android 返回键优先关闭下拉框、弹层，再返回耗材库。
- 移动端偏好设置、耗材目录和二级弹层宽度统一。
- PWA 更新后自动刷新，编辑期间暂停自动刷新。

## 技术架构

| 平台 | API 访问 | 会话存储 |
|---|---|---|
| Web/PWA | Cloudflare Worker 代理 `/api/*` | Worker 加密 HttpOnly Cookie |
| Android | 直接访问 `api.bambulab.cn` / `api.bambulab.com` | Expo SecureStore |
| iOS | 与 Android 相同的直连能力 | Expo SecureStore |

- Worker 同时托管 `dist-web` 静态资源和 API。
- 原生端不依赖 Worker，也不需要 `EXPO_PUBLIC_API_BASE`。
- 本地偏好使用 AsyncStorage。
- 会话、强制 RFID 开关和料盘重量记忆使用 SecureStore。

## 本地运行

```powershell
cd filament-app
npm install
```

分别启动 Worker 和 Expo：

```powershell
npm run worker:dev
npm run web
```

地址：

```text
Expo Web：http://localhost:8081
Worker：http://localhost:8787
```

## 构建与部署

### PWA

```powershell
npm run build:web
npm run worker:deploy
```

首次部署前设置 Worker 会话密钥：

```powershell
npx wrangler secret put SESSION_SECRET --config worker/wrangler.jsonc
```

当前地址：

```text
https://yuliang.lykkk.fun
```

### Android APK

当前 APK 由 GitHub Actions 手动构建，不随每次推送自动触发：

```powershell
gh workflow run android-apk.yml --ref master
```

工作流会生成 APK 和 SHA-256 文件，并覆盖发布到：

```text
https://github.com/Lycus0321/filament-app/releases/tag/android-latest
```

本地验证 Android Bundle：

```powershell
npx expo export --platform android --output-dir dist-android-next
```

### iOS

EAS 脚本保留用于后续 TestFlight：

```powershell
npm run build:ios:preview
```

首次使用需要登录 Expo 账号并完成 Apple 签名配置。

## 验证

```powershell
npx tsc --noEmit
npm run worker:typecheck
npx expo-doctor
npm run build:web
npx expo export --platform android --output-dir dist-android-next
```

Playwright 回归覆盖：

- 登录、耗材库和演示模式。
- 料盘编辑、称重和未保存保护。
- RFID 安全模式与强制修改。
- 品牌、型号、颜色联动。
- 耗材目录统一管理。
- 皮重品牌/型号匹配。
- 标记用尽、删除确认和已用尽筛选。
- JSON 输入框导出、无效 JSON、合并导入和完整替换。
- 局部 JSON 合并时保留未提供的本机标量设置。
- 50 字备注在写入 RFID 身份前缀后不被截断。
- 内置通用空盘不可隐藏；删除料盘同步清理重量记忆。
- 979px 使用移动导航，980px 起统一切换桌面布局。
- `320px`、`390px`、`768px` 移动端和平板布局。

主要脚本：

```text
scripts/verify-app.mjs
scripts/verify-regressions.mjs
scripts/verify-settings.mjs
scripts/verify-unified-management.mjs
scripts/verify-tare-mapping.mjs
scripts/verify-linkage.mjs
scripts/verify-review-regressions.mjs
```

## 数据接口

```text
登录：POST /v1/user-service/user/login
读取耗材库：GET /v1/design-user-service/my/filament/v2
修改剩余重量：PUT /v1/design-user-service/my/filament/v2
删除耗材：DELETE /v1/design-user-service/my/filament/v2/batch
```

- 中国大陆：`api.bambulab.cn`
- 国际区：`api.bambulab.com`

## 已知限制

- 拓竹接口为社区逆向的非公开接口，接口变化后需要适配。
- TOTP 已有代码支持，但仍需覆盖更多真实账号和设备组合。
- 不支持离线修改耗材。
- 本地偏好不自动跨设备同步，需要手动复制和粘贴 JSON。
- Android 当前通过 GitHub Actions 测试 Release 分发，未进行 Google Play 上架。
- iOS 尚未完成 TestFlight 和 App Store 配置。
- RFID 强制修改可能被 Studio、Handy 或实体标签数据覆盖。

## 静态原型

`prototype/` 为历史交互原型，不调用真实接口：

```powershell
npx serve prototype -l 4173
```
