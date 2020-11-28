const { promisify } = require("util");
const fs = require("fs");
const glob = require("glob");
const { hashFile } = require("./hash");
const {
  createRewritingStream,
  isPreloadScript,
  isPreloadStyle,
  isStylesheet,
  isScript,
} = require("./html");
const { setIfAbsent } = require("./map");
const { createNetlifyHeaders } = require("./netlify");

const findFiles = promisify(glob);

module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: "snowpack-plugin-cache-bust",

    async optimize({ buildDirectory }) {
      const handledAssets = new Map();
      const htmlFiles = await findFiles(`${buildDirectory}/**/*.html`);

      function getHashedValue(attr) {
        const hashed = setIfAbsent(handledAssets, attr.value, (key) =>
          hashFile(`${buildDirectory}${key}`),
        );
        return hashed.filepathHashed.substring(buildDirectory.length);
      }

      // mutate DOM nodes
      const mutators = [
        {
          // mutate the `src` attribute of `script` elements
          test: (node) => isScript(node),
          mutate(node) {
            const attr = node.attrs.find((attr) => attr.name === "src");
            attr.value = getHashedValue(attr);
          },
        },
        {
          // mutate the `href` attribute of `link` elements
          test: (node) =>
            isStylesheet(node) || isPreloadStyle(node) || isPreloadScript(node),
          mutate(node) {
            const attr = node.attrs.find((attr) => attr.name === "href");
            attr.value = getHashedValue(attr);
          },
        },
      ];

      function transformHtmlFile(file) {
        return new Promise((resolve) => {
          const fileTmp = `${file}.tmp`;
          fs.writeFileSync(fileTmp, "", "utf8");

          const rewriter = createRewritingStream({ mutators });

          rewriter.on("end", () => {
            fs.renameSync(fileTmp, file);
            resolve();
          });

          const writable = fs.createWriteStream(fileTmp);
          const readable = fs.createReadStream(file);
          readable.setEncoding("utf8");

          readable.pipe(rewriter).pipe(writable);
        });
      }

      await Promise.allSettled(htmlFiles.map(transformHtmlFile));

      for (let asset of handledAssets.values()) {
        fs.renameSync(asset.filepath, asset.filepathHashed);
      }

      if (pluginOptions.netlify) {
        await createNetlifyHeaders({
          files: [...handledAssets.values()],
          buildDirectory,
        });
      }
    },
  };
};
