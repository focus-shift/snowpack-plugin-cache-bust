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
    name: "snowpack-plugin-cache-busting",

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

      for (const file of htmlFiles) {
        const fileTmp = `${file}.tmp`;
        fs.writeFileSync(fileTmp, "", "utf8");

        const writable = fs.createWriteStream(fileTmp);
        const readable = fs.createReadStream(file);
        readable.setEncoding("utf8");

        const rewriter = createRewritingStream({ mutators });

        readable.pipe(rewriter).pipe(writable);

        await new Promise((resolve) => {
          rewriter.on("end", () => {
            fs.renameSync(fileTmp, file);
            resolve();
          });
        });
      }

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
