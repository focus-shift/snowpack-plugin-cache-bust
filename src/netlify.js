const fs = require("fs");
const { EOL } = require("os");

async function createNetlifyHeaders({ files, buildDirectory }) {
  const appendHeaders = fs.existsSync(`${buildDirectory}/_headers`);

  let headers = files
    .map((file) => createHeader({ file, buildDirectory }))
    .join(EOL + EOL);

  headers += EOL;

  if (appendHeaders) {
    const content = fs.readFileSync(`${buildDirectory}/_headers`, "", "utf8");
    headers = content + EOL + EOL + headers;
  }

  fs.writeFileSync(`${buildDirectory}/_headers`, headers, "utf8");
}

function createHeader({ file, buildDirectory }) {
  const filepath = file.filepathHashed.substring(buildDirectory.length);
  return `${filepath}${EOL}  cache-control: public, max-age=31536000, immutable`;
}

module.exports = { createNetlifyHeaders };
