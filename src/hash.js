const hasha = require("hasha");

module.exports.hashFile = function hashFile(filepath) {
  const hash = hasha.fromFileSync(filepath);
  const filename = filepath.substring(0, filepath.lastIndexOf("."));
  const ext = filepath.substring(filepath.lastIndexOf(".") + 1);
  const filepathHashed = `${filename}-${hash.substr(0, 8)}.${ext}`;

  return {
    ext,
    filepath,
    filepathHashed,
  };
};
