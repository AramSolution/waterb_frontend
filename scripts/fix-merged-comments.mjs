/**
 * Fixes lines where a // comment was accidentally merged with following code
 * (same line: "// garbled...    const x" -> two lines).
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src");

const CODE_START =
  /(\s{2,})((?:const|let|var)\s|function\s|return\s|if\s*\(|useEffect\s*\(|switch\s*\(|for\s*\(|while\s*\(|case\s+|default:|break;|continue;|throw\s|await\s|import\s|export\s|\}\s*catch\s*\(|\}\s*finally\s*\{|\}\s*else\s|\}\s*else\s+if)/;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function fixContent(content) {
  const lines = content.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const idx = line.indexOf("//");
    if (idx === -1) {
      out.push(line);
      continue;
    }
    const afterComment = line.slice(idx + 2);
    // Find "//" that starts a line comment (not inside string — best-effort)
    const m = afterComment.match(CODE_START);
    if (m) {
      const splitAt = idx + 2 + m.index + m[1].length;
      const commentPart = line.slice(0, splitAt).trimEnd();
      const codePart = line.slice(splitAt).trimStart();
      const indent = line.match(/^(\s*)/)[1];
      if (commentPart !== "//" && !commentPart.endsWith("//")) {
        out.push(commentPart.startsWith("//") ? indent + commentPart.trim() : line);
        if (!commentPart.trim().startsWith("//")) {
          out.push(line);
          continue;
        }
      } else {
        out.push(line);
        continue;
      }
      const codeIndent =
        codePart.startsWith("}") ? indent : indent.length >= 2 ? indent : "    ";
      out.push(codeIndent + codePart);
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function fixFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const fixed = fixContent(raw);
  if (fixed !== raw) {
    fs.writeFileSync(filePath, fixed, "utf8");
    return true;
  }
  return false;
}

const files = walk(ROOT);
let n = 0;
for (const f of files) {
  try {
    if (fixFile(f)) {
      n++;
      console.log("fixed:", path.relative(process.cwd(), f));
    }
  } catch (e) {
    console.error("error", f, e.message);
  }
}
console.log("done, files changed:", n);
