# china-holidays

Cloudflare Workers 服务，用来提供中国法定节假日与调休上班日数据。

它会输出：

- `GET /china-holidays.ics`：可订阅的 iCalendar 文件，动态包含当前年份附近的 `节日名称(休)` 和 `节日名称(班)` 全天事件。
- `GET /today.json`：按 `Asia/Shanghai` 日期返回今天是否应开启工作日闹钟。
- `GET /day.json?date=2026-10-01`：查询指定日期。
- `GET /year.json?year=2026`：查看某年的原始数据。
- `GET /vpn/clash.yaml`：Clash/Mihomo `rules:` YAML，包含直连与代理规则。
- `GET /vpn/proxy-provider.yaml`：Clash/Mihomo classical rule-provider 代理规则。
- `GET /vpn/direct-provider.yaml`：Clash/Mihomo classical rule-provider 直连规则。

默认数据源是 `NateScarlet/holiday-cn` 的在线 JSON，Worker 会在运行时拉取：

```text
https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{年份}.json
```

如果动态源短暂不可用，会回退到仓库里内置的静态数据。目前静态兜底包含 2026 年。

## 快速开始

```bash
npm install
npm run dev
```

本地启动后访问：

```text
http://localhost:8787/china-holidays.ics
http://localhost:8787/today.json
http://localhost:8787/vpn/clash.yaml
```

部署到 Cloudflare Workers：

```bash
npm run deploy
```

## 快捷指令建议

最稳的方式是让快捷指令每天早晨请求：

```text
https://你的-worker域名/today.json
```

然后读取 `shouldEnableAlarm`：

- `true`：开启工作日闹钟。
- `false`：关闭工作日闹钟。
- `null`：当前年份尚未发布或获取到节假日数据，不自动切换。

如果你更想使用日历订阅，可以把下面这个地址添加到系统日历：

```text
https://你的-worker域名/china-holidays.ics
```

ICS 里：

- `节日名(休)` 表示放假。
- `节日名(班)` 表示周末调休上班。

为了方便快捷指令按“当天日历事件”判断，连续假期会拆成每天一个全天事件，而不是一个跨多天长日程。例如春节 9 天会生成 9 个 `春节(休)` 全天事件。

## VPN 规则

当前 Worker 同时提供 Clash/Mihomo 风格的 YAML 规则：

```text
https://你的-worker域名/vpn/clash.yaml
https://你的-worker域名/vpn/proxy-provider.yaml
https://你的-worker域名/vpn/direct-provider.yaml
```

默认策略名：

- `PROXY`：需要代理。
- `DIRECT`：直连。
- 兜底规则默认为 `PROXY`。

如果你的 Clash/Mihomo 配置里策略组叫 `🚀 节点选择`，可以这样传参：

```text
https://你的-worker域名/vpn/clash.yaml?proxy=🚀%20节点选择&direct=DIRECT
```

如果你想让未知域名默认直连：

```text
https://你的-worker域名/vpn/clash.yaml?fallback=direct
```

规则顺序是：

1. 局域网和私有 IP 直连。
2. 常见中国大陆域名直连。
3. 常见海外服务和开发者服务走代理。
4. `GEOIP,CN,DIRECT`。
5. `MATCH,PROXY` 或你指定的兜底策略。

规则数据已经抽离到 `src/vpn-rules-data.js`。后续你只需要修改这个文件里的：

- `DIRECT_RULES.domainSuffixes`
- `DIRECT_RULES.ipCidrs`
- `DIRECT_RULES.ipCidr6s`
- `PROXY_RULES.domainSuffixes`
- `PROXY_RULES.ipCidrs`
- `PROXY_RULES.ipCidr6s`

生成 YAML 的代码在 `src/vpn-rules.js`，一般不用改。当前代理列表额外覆盖了云原生开发常见链路，包括 Docker Hub、GHCR、Quay、Kubernetes Registry、Helm、Terraform/HashiCorp、AWS/Azure/GCP 镜像与 API、npm/PyPI/Go/Rust/Maven/Gradle 等包仓库。

如果你想用远程 rule-provider，可以在主配置里这样引用：

```yaml
rule-providers:
  my-proxy:
    type: http
    behavior: classical
    format: yaml
    interval: 86400
    path: ./ruleset/my-proxy.yaml
    url: "https://你的-worker域名/vpn/proxy-provider.yaml"
  my-direct:
    type: http
    behavior: classical
    format: yaml
    interval: 86400
    path: ./ruleset/my-direct.yaml
    url: "https://你的-worker域名/vpn/direct-provider.yaml"

rules:
  - RULE-SET,my-direct,DIRECT
  - RULE-SET,my-proxy,PROXY
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
```

## 数据来源

动态数据源：

https://github.com/NateScarlet/holiday-cn

该项目提供按年份的 JSON 文件，并说明会自动抓取国务院公告。Worker 会优先请求 CDN：

```text
https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{年份}.json
https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{年份}.json
https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{年份}.json
```

2026 年静态兜底数据来源为中国政府网发布的《国务院办公厅关于2026年部分节假日安排的通知》（国办发明电〔2025〕7号）：

https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm

后续年份公布后，通常无需改代码；动态源更新后 Worker 会自动读取。若你希望在外部源故障时仍可用，可以在 `src/holidays.js` 中增加对应年份作为静态兜底。

## 测试

```bash
npm test
```
