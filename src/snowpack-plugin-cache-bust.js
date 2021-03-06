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
      const notFoundAssets = new Set();
      const htmlFiles = await findFiles(`${buildDirectory}/**/*.html`);

      // transform DOM nodes
      const transformers = [
        {
          // transform the `src` attribute of `script` elements
          test: (node) => isScript(node),
          transform(node) {
            const attr = node.attrs.find((attr) => attr.name === "src");
            try {
              attr.value = getHashedValue(attr);
            } catch (error) {
              notFoundAssets.add(attr.value);
            }
          },
        },
        {
          // transform the `href` attribute of `link` elements
          test: (node) =>
            isStylesheet(node) || isPreloadStyle(node) || isPreloadScript(node),
          transform(node) {
            const attr = node.attrs.find((attr) => attr.name === "href");
            try {
              attr.value = getHashedValue(attr);
            } catch (error) {
              notFoundAssets.add(attr.value);
            }
          },
        },
      ];

      function getHashedValue(attr) {
        const hashed = setIfAbsent(handledAssets, attr.value, (key) =>
          hashFile(`${buildDirectory}${key}`),
        );
        return hashed.filepathHashed.substring(buildDirectory.length);
      }

      function transformHtmlFile(file) {
        return new Promise((resolve) => {
          const fileTmp = `${file}.tmp`;
          fs.writeFileSync(fileTmp, "", "utf8");

          const rewriter = createRewritingStream({ transformers });

          const writable = fs.createWriteStream(fileTmp);
          const readable = fs.createReadStream(file);
          readable.setEncoding("utf8");

          writable.on("close", () => {
            fs.renameSync(fileTmp, file);
            resolve();
          });

          readable.pipe(rewriter).pipe(writable);
        });
      }

      await Promise.allSettled(htmlFiles.map(transformHtmlFile));

      if (notFoundAssets.size > 0) {
        console.log(
          "Could not hash following assets since they are not in the buildDirectory:",
        );
        for (let notFoundAsset of notFoundAssets) {
          console.log(`  - ${notFoundAsset}`);
        }
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
