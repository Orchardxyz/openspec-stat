# openspec-stat

[![NPM version](https://img.shields.io/npm/v/openspec-stat.svg?style=flat)](https://npmjs.com/package/openspec-stat)
[![NPM downloads](http://img.shields.io/npm/dm/openspec-stat.svg?style=flat)](https://npmjs.com/package/openspec-stat)

用于追踪团队成员在 Git 仓库中的 OpenSpec 提案和代码变更的命令行工具。

[English](./README.md) | 简体中文

## 功能特性

- ✅ 追踪指定时间范围内的 Git 提交
- ✅ 识别同时包含 OpenSpec 提案和代码变更的提交
- ✅ **提案维度统计汇总** - 按提案聚合统计，避免 merge commit 导致的统计偏差
- ✅ 按作者分组统计（提交数、提案数、代码变更）
- ✅ 支持多分支和通配符过滤
- ✅ 作者名称映射（处理同一人的多个 Git 账号）
- ✅ 仅追踪最近活跃的成员（默认：2 周）
- ✅ 多种输出格式：表格、JSON、CSV、Markdown
- ✅ 国际化支持：英文和中文
- ✅ **🆕 多仓库模式（BETA）** - 一次运行分析多个本地/远程仓库

## 安装

### 全局安装

```bash
npm install -g openspec-stat
# 或
pnpm add -g openspec-stat
```

### 本地项目安装

```bash
npm install openspec-stat --save-dev
# 或
pnpm add -D openspec-stat
```

## 使用方法

### 基本用法

在 Git 仓库目录中运行：

```bash
openspec-stat
```

这将追踪默认时间范围内的提交（昨天 20:00 ~ 今天 20:00）。

### 多仓库模式（BETA）

⚠️ **实验性功能**：多仓库模式允许在单次运行中分析多个仓库（本地或远程）。

```bash
# 初始化多仓库配置（交互式向导）
openspec-stat init --multi

# 运行多仓库分析
openspec-stat multi -c .openspec-stats.multi.json

# 运行并显示详细的贡献者统计
openspec-stat multi -c .openspec-stats.multi.json --show-contributors

# 生成配置模板
openspec-stat init --template multi -o config.json
```

**适用于以下场景的团队管理者：**
- 拥有后端仓库的本地访问权限，但没有前端仓库
- 需要跨多个仓库追踪贡献情况
- 希望获得合并统计结果，而无需运行多个命令

**注意**：默认情况下，多仓库模式仅显示聚合统计信息，以避免信息过载。使用 `--show-contributors` 可查看每个贡献者的详细统计信息。

详细文档请参阅 [多仓库模式指南](./MULTI_REPO_GUIDE.md)。

### 命令行选项

```bash
openspec-stat [选项]

选项：
  -r, --repo <path>           仓库路径（默认：当前目录）
  -b, --branches <branches>   分支列表，逗号分隔（例如：origin/master,origin/release/v1.0）
  -s, --since <datetime>      开始时间（默认：昨天 20:00）
  -u, --until <datetime>      结束时间（默认：今天 20:00）
  -a, --author <name>         按特定作者筛选
  --json                      以 JSON 格式输出
  --csv                       以 CSV 格式输出
  --markdown                  以 Markdown 格式输出
  -c, --config <path>         配置文件路径
  -v, --verbose               详细输出模式
  -l, --lang <language>       输出语言（en, zh-CN）（默认："en"）
  -V, --version               显示版本号
  -h, --help                  显示帮助信息
```

### 使用示例

```bash
# 追踪默认时间范围
openspec-stat

# 追踪特定时间范围
openspec-stat --since "2024-01-01 00:00:00" --until "2024-01-31 23:59:59"

# 追踪特定分支
openspec-stat --branches "origin/master,origin/release/v1.0"

# 追踪特定作者
openspec-stat --author "张三"

# 输出 JSON 格式
openspec-stat --json > stats.json

# 输出 Markdown 报告
openspec-stat --markdown > report.md

# 详细输出模式
openspec-stat --verbose

# 使用自定义配置文件
openspec-stat --config ./my-config.json

# 使用中文输出
openspec-stat --lang zh-CN

# 组合多个选项
openspec-stat --lang zh-CN --verbose
```

## 配置文件

在项目根目录创建 `.openspec-stats.json` 或 `openspec-stats.config.json`：

```json
{
  "defaultBranches": [
    "origin/master",
    "origin/main",
    "origin/release/*"
  ],
  "defaultSinceHours": -30,
  "defaultUntilHours": 18,
  "authorMapping": {
    "张三": "张三",
    "zhangsan@company.com": "张三",
    "zs": "张三"
  },
  "openspecDir": "openspec/",
  "excludeExtensions": [
    ".md",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".webp"
  ],
  "activeUserWeeks": 2
}
```

### 配置选项说明

- **defaultBranches**：默认追踪的分支（支持通配符）
- **defaultSinceHours**：默认开始时间偏移（小时，负数表示往前推）
- **defaultUntilHours**：默认结束时间（当天的小时数）
- **authorMapping**：作者名称映射，用于统一同一人的多个 Git 账号
- **openspecDir**：OpenSpec 提案目录（默认：`openspec/`）
- **excludeExtensions**：排除的文件扩展名（不计入代码变更）
- **activeUserWeeks**：活跃用户时间窗口（周，默认：2）

## 统计逻辑

工具会识别同时满足以下两个条件的提交：

1. 包含 `openspec/` 目录中的文件变更（OpenSpec 提案）
2. 包含代码文件变更（排除文档文件）

统计内容包括：

- **提交数**：符合条件的提交总数
- **OpenSpec 提案**：按 `openspec/changes/{提案名称}` 目录统计
- **代码文件**：修改的代码文件数量
- **新增行数**：新增的代码行数
- **删除行数**：删除的代码行数
- **净变更**：新增行数 - 删除行数

工具提供两个统计视角：

1. **提案汇总**：按提案聚合统计，显示每个提案的总代码变更量和所有贡献者，避免 merge commit 导致的统计偏差
2. **作者汇总**：按贡献者分组统计，显示各个作者的个人贡献情况

## 输出格式

### 表格格式（默认）

```
📊 OpenSpec 统计报告
时间范围：2024-01-01 00:00:00 ~ 2024-01-31 23:59:59
分支：origin/master
总提交数：15

📋 提案汇总（按提案统计）
┌──────────────┬─────────┬──────────────────┬────────────┬───────────┬───────────┬─────────────┐
│ 提案         │ 提交数  │ 贡献者           │ 代码文件   │ 新增行数  │ 删除行数  │ 净变更      │
├──────────────┼─────────┼──────────────────┼────────────┼───────────┼───────────┼─────────────┤
│ feature-123  │ 5       │ 张三, 李四       │ 30         │ +890      │ -234      │ +656        │
│ feature-456  │ 3       │ 张三             │ 15         │ +344      │ -100      │ +244        │
└──────────────┴─────────┴──────────────────┴────────────┴───────────┴───────────┴─────────────┘
  📊 总计：2 个提案 | 8 次提交 | 45 个文件 | +1234/-334 行（净变更：+900）

👥 作者汇总（按贡献者统计）
┌──────────┬─────────┬──────────────────┬────────────┬───────────┬───────────┬─────────────┐
│ 作者     │ 提交数  │ 提案数           │ 代码文件   │ 新增行数  │ 删除行数  │ 净变更      │
├──────────┼─────────┼──────────────────┼────────────┼───────────┼───────────┼─────────────┤
│ 张三     │ 8       │ 3                │ 45         │ +1234     │ -567      │ +667        │
│ 李四     │ 7       │ 2                │ 32         │ +890      │ -234      │ +656        │
└──────────┴─────────┴──────────────────┴────────────┴───────────┴───────────┴─────────────┘
```

### JSON 格式

```bash
openspec-stat --json
```

### CSV 格式

```bash
openspec-stat --csv > stats.csv
```

### Markdown 格式

```bash
openspec-stat --markdown > report.md
```

## 语言支持

工具支持英文和中文输出。您可以使用 `--lang` 选项指定语言：

```bash
# 英文输出（默认）
openspec-stat --lang en

# 中文输出
openspec-stat --lang zh-CN
```

工具还会自动检测您的系统语言。如果您的系统区域设置为中文，输出将默认使用中文。

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 本地测试
node dist/esm/cli.js
```

## 贡献与发布流程

- 请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发环境、分支策略和 PR 规范。
- 请阅读 [RELEASE.md](./RELEASE.md) 了解基于 Changesets 的版本与发布流程。

## 许可证

MIT
