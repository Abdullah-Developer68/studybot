import { createLowlight } from "lowlight";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import csharp from "highlight.js/lib/languages/csharp";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import kotlin from "highlight.js/lib/languages/kotlin";
import swift from "highlight.js/lib/languages/swift";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import ini from "highlight.js/lib/languages/ini";
import powershell from "highlight.js/lib/languages/powershell";

export const lowlight = createLowlight();

// JavaScript / TypeScript
lowlight.register("javascript", js);
lowlight.register("js", js);
lowlight.register("typescript", ts);
lowlight.register("ts", ts);

// Data / config
lowlight.register("json", json);
lowlight.register("yaml", yaml);
lowlight.register("yml", yaml);
lowlight.register("ini", ini);

// Shell
lowlight.register("bash", bash);
lowlight.register("sh", bash);
lowlight.register("shell", bash);
lowlight.register("powershell", powershell);
lowlight.register("ps1", powershell);

// Web
lowlight.register("html", xml);
lowlight.register("xml", xml);
lowlight.register("css", css);
lowlight.register("markdown", markdown);
lowlight.register("md", markdown);

// Backend / systems
lowlight.register("python", python);
lowlight.register("py", python);
lowlight.register("java", java);
lowlight.register("cpp", cpp);
lowlight.register("c++", cpp);
lowlight.register("c", c);
lowlight.register("csharp", csharp);
lowlight.register("cs", csharp);
lowlight.register("php", php);
lowlight.register("ruby", ruby);
lowlight.register("rb", ruby);
lowlight.register("go", go);
lowlight.register("golang", go);
lowlight.register("rust", rust);
lowlight.register("rs", rust);
lowlight.register("kotlin", kotlin);
lowlight.register("kt", kotlin);
lowlight.register("swift", swift);
lowlight.register("sql", sql);

// DevOps
lowlight.register("dockerfile", dockerfile);

export default lowlight;
