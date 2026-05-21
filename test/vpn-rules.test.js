import assert from "node:assert/strict";
import test from "node:test";
import {
  createClashProviderYaml,
  createClashRulesYaml,
  formatClashRule,
  formatClashProviderRule,
  getVpnRules,
  parseVpnPolicyOptions
} from "../src/vpn-rules.js";
import { DIRECT_RULES, PROXY_RULES } from "../src/vpn-rules-data.js";

test("generates Clash rules YAML with proxy, direct, and fallback rules", () => {
  const yaml = createClashRulesYaml({ proxy: "PROXY", direct: "DIRECT", fallback: "PROXY" });

  assert.match(yaml, /^rules:\n/m);
  assert.match(yaml, /DOMAIN-SUFFIX,cn,DIRECT/);
  assert.match(yaml, /DOMAIN-SUFFIX,openai.com,PROXY/);
  assert.match(yaml, /GEOIP,CN,DIRECT/);
  assert.match(yaml, /MATCH,PROXY/);
});

test("keeps editable rule data in the dedicated data file", () => {
  assert.ok(DIRECT_RULES.domainSuffixes.includes("aliyuncs.com"));
  assert.ok(DIRECT_RULES.ipCidrs.includes("10.0.0.0/8"));
  assert.ok(PROXY_RULES.domainSuffixes.includes("registry.k8s.io"));
  assert.ok(PROXY_RULES.domainSuffixes.includes("releases.hashicorp.com"));
  assert.ok(PROXY_RULES.domainSuffixes.includes("proxy.golang.org"));
  assert.ok(PROXY_RULES.domainSuffixes.includes("files.pythonhosted.org"));
});

test("generates Clash provider payload YAML", () => {
  const yaml = createClashProviderYaml("proxy");

  assert.match(yaml, /^payload:\n/m);
  assert.match(yaml, /DOMAIN-SUFFIX,github.com/);
  assert.doesNotMatch(yaml, /DOMAIN-SUFFIX,github.com,PROXY/);
  assert.doesNotMatch(yaml, /MATCH/);
});

test("generates direct provider payload YAML separately", () => {
  const yaml = createClashProviderYaml("direct");

  assert.match(yaml, /^payload:\n/m);
  assert.match(yaml, /DOMAIN-SUFFIX,cn/);
  assert.match(yaml, /IP-CIDR,10\.0\.0\.0\/8,no-resolve/);
  assert.doesNotMatch(yaml, /DOMAIN-SUFFIX,openai.com/);
});

test("parses custom policy names from query parameters", () => {
  const searchParams = new URLSearchParams({
    proxy: "Proxy Group",
    direct: "DIRECT",
    fallback: "direct"
  });

  assert.deepEqual(parseVpnPolicyOptions(searchParams), {
    proxy: "Proxy Group",
    direct: "DIRECT",
    fallback: "DIRECT"
  });
});

test("rejects policy names that could break rule lines", () => {
  assert.throws(() => parseVpnPolicyOptions(new URLSearchParams({ proxy: "A,B" })), /Policy names/);
  assert.throws(() => parseVpnPolicyOptions(new URLSearchParams({ proxy: "A\nB" })), /Policy names/);
});

test("formats no-resolve IP rules with policy before options", () => {
  const rule = getVpnRules().find((item) => item.type === "IP-CIDR" && item.value === "10.0.0.0/8");
  assert.equal(formatClashRule(rule, { proxy: "PROXY", direct: "DIRECT", fallback: "PROXY" }), "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve");
  assert.equal(formatClashProviderRule(rule), "IP-CIDR,10.0.0.0/8,no-resolve");
});
