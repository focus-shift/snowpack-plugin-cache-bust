module.exports.setIfAbsent = function setIfAbsent(map, key, producer) {
  if (map.has(key)) {
    return map.get(key);
  }
  const value = producer(key);
  map.set(key, value);
  return value;
};
