(function() {
  var splitKeyPath;

  exports.getValueAtKeyPath = function(object, keyPath) {
    var j, key, keys, len;
    keys = splitKeyPath(keyPath);
    for (j = 0, len = keys.length; j < len; j++) {
      key = keys[j];
      object = object[key];
      if (object == null) {
        return;
      }
    }
    return object;
  };

  exports.setValueAtKeyPath = function(object, keyPath, value) {
    var key, keys;
    keys = splitKeyPath(keyPath);
    while (keys.length > 1) {
      key = keys.shift();
      if (object[key] == null) {
        object[key] = {};
      }
      object = object[key];
    }
    return object[keys.shift()] = value;
  };

  splitKeyPath = function(keyPath) {
    var char, i, j, keys, len, startIndex;
    if (keyPath == null) {
      return [];
    }
    startIndex = 0;
    keys = [];
    for (i = j = 0, len = keyPath.length; j < len; i = ++j) {
      char = keyPath[i];
      if (char === '.' && (i === 0 || keyPath[i - 1] !== '\\')) {
        keys.push(keyPath.substring(startIndex, i));
        startIndex = i + 1;
      }
    }
    keys.push(keyPath.substr(startIndex, keyPath.length));
    return keys;
  };

}).call(this);
