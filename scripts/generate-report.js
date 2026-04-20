import {execSync} from "child_process";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AKEY = process.env.ANTHROPIC_API_KEY;
if (!AKEY) throw new Error("ANTHROPIC_API_KEY is not set");
console.error("Fetching Linear data...");
const report = JSON.parse(execSync("node scripts/fetch-linear.js", {encoding:"utf-8"}));
const lines = report.projects.map(p => p.name + " " + p.progress + "% 完了:" + p.completedThisWeek.map(t=>t.title).join(",") + " 超過:" + p.overdue.length + "件").join("\n");
console.error("Generating summary...");
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {"Content-Type":"application/json","x-api-key":AKEY,"anthropic-version":"2023-06-01"},
  body: JSON.stringify({model:"claude-opus-4-5",max_tokens:1024,messages:[{role:"user",content:"以下のLinearデータをもとにプロジェクト別週次サマリを日本語400字以内で書いてください。\n"+lines}]})
});
const j = await res.json();
if (j.error) throw new Error(JSON.stringify(j.error));
report.aiSummary = j.content[0].text;
const out = path.join(__dirname, "..", "docs", "report.json");
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.error("Done");
