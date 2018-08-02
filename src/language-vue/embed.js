"use strict";

const { concat, hardline, indent } = require("../doc").builders;

function embed(path, print, textToDoc, options) {
  const node = path.getValue();
  const parent = path.getParentNode();
  if (!parent || parent.tag !== "root" || node.unary) {
    return null;
  }

  let parser;

  if (node.tag === "style") {
    const langAttr = node.attrs.find(attr => attr.name === "lang");
    if (!langAttr || langAttr.value === "postcss") {
      parser = "css";
    } else if (langAttr.value === "scss") {
      parser = "scss";
    } else if (langAttr.value === "less") {
      parser = "less";
    }
  }

  if (node.tag === "script") {
    const langAttr = node.attrs.find(attr => attr.name === "lang");
    if (!langAttr) {
      parser = "babylon";
    } else if (langAttr.value === "ts" || langAttr.value === "tsx") {
      parser = "typescript";
    }
  }

  if (!parser) {
    return null;
  }

  // build AST from source text without tags
  // 对文本内容构建 ast 树（刨除tag，如 `<style` / `</style>`）
  let textNodes = textToDoc(
    options.originalText.slice(
      node.contentStart,
      node.contentEnd
    ),
    {
      parser
    }
  );

  // remove the last "hardline" before the ending `</style>` tag,
  // without doing so that empty "hardline" will also get indented and generate
  // two empty spaces(depends on you indentation) before the `</style>` tag
  // 去掉文本尾部换行，否则缩进的时候会把换行也缩进，多出两个空格
  //
  // @see issue comment https://github.com/prettier/prettier/issues/3888#issuecomment-386339629
  textNodes.parts.pop();
  // a small optimization to reduce nesting, no harm to remove this, should be
  // 精简嵌套层级
  textNodes.parts = textNodes.parts[0].parts;

  return concat([
    // the `<style lang="blabla">` or `<script>`
    options.originalText.slice(node.start, node.contentStart),

    // the most important part:
    // add a base indent to the whole source text, just as the option `baseIndent`
    // of the `script-indent` rule of the plugin `eslint-plugin-vue` does.
    // 对文本自身内容整体进行缩进
    //
    // @see https://github.com/prettier/prettier/issues/3888#issuecomment-385960667
    indent(concat([
      hardline,
      textNodes,
    ])),

    // adding back the "hardline" which has been deliberately removed in
    // previous steps
    // 手动填补最后缺失的换行，就是 `</style>`前面的那个，否则它会和文本沾在一起
    hardline,

    // the `</style>` or `</script>`
    options.originalText.slice(node.contentEnd, node.end)
  ]);
}

module.exports = embed;
