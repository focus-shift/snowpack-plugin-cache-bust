const RewritingStream = require("parse5-html-rewriting-stream");

/**
 * checks whether the node is a script element that loads a script file or not.
 */
function isScript(node) {
  return (
    node.tagName === "script" && node.attrs.some((attr) => attr.name === "src")
  );
}

/**
 * checks whether the node is a link or not.
 */
function isLink(node) {
  return node.tagName === "link";
}

/**
 * checks whether the node is a linked stylesheet or not.
 */
function isStylesheet(node) {
  return (
    isLink(node) &&
    node.attrs.some(
      (attr) => attr.name === "rel" && attr.value === "stylesheet",
    )
  );
}

/**
 * checks whether the node is a preload link for stylesheets ot not.
 */
function isPreloadStyle(node) {
  return (
    isLink(node) &&
    node.attrs.some((attr) => attr.name === "as" && attr.value === "style")
  );
}

/**
 * checks whether the node is a preload link for scripts or not.
 */
function isPreloadScript(node) {
  return (
    isLink(node) &&
    node.attrs.some((attr) => attr.name === "as" && attr.value === "script")
  );
}

/**
 * creates a reading stream to transform html element tags.
 */
function createRewritingStream({ mutators }) {
  const rewriter = new RewritingStream();

  for (let eventName of ["endTag", "comment", "text", "doctype"]) {
    rewriter.on(eventName, (_, raw) => {
      rewriter.emitRaw(raw);
    });
  }

  rewriter.on("startTag", (node) => {
    for (let mutator of mutators) {
      if (mutator.test(node)) {
        mutator.mutate(node);
      }
    }
    rewriter.emitStartTag(node);
  });

  return rewriter;
}

module.exports = {
  isScript,
  isLink,
  isStylesheet,
  isPreloadScript,
  isPreloadStyle,
  createRewritingStream,
};
