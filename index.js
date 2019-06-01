/**
* @flow
*/

import RNFetchBlob from 'rn-fetch-blob'

const defaultStoragePath = `${RNFetchBlob.fs.dirs.DocumentDir}/persistStore`;
const storagePathReadyFactory = path =>
  RNFetchBlob.fs.exists(path).then(exists => {
    return exists
      ? new Promise(resolve => resolve(true))
      : RNFetchBlob.fs.mkdir(path);
  });

let options = {
  storagePath: defaultStoragePath,
  encoding: "utf8",
  toFileName: name => name.split(":").join("-"),
  fromFileName: name => name.split("-").join(":")
};
const pathForKey = key => `${options.storagePath}/${options.toFileName(key)}`;
let storagePathReady = storagePathReadyFactory(defaultStoragePath);

const FilesystemStorage = {
  config: (
    customOptions: Object,
  ) => {
    if (
      !!customOptions.storagePath &&
      options.storagePath !== customOptions.storagePath
    ) {
      storagePathReady = storagePathReadyFactory(customOptions.storagePath);
    }
    options = {
      ...options,
      ...customOptions
    };
  },

  setItem: (
    key: string,
    value: string,
    callback?: (error: ?Error) => void,
  ) =>
    storagePathReady.then(() => 
      RNFetchBlob.fs.writeFile(pathForKey(key), value, options.encoding)
        .then(() => callback && callback())
        .catch(error => callback && callback(error))
    ),

  getItem: (
    key: string,
    callback: (error: ?Error, result: ?string) => void
  ) =>
    storagePathReady.then(() => {
      const filePath = options.toFileName(key);
      return RNFetchBlob.fs.readFile(pathForKey(filePath), options.encoding)
        .then(data => {
          if (!callback) return data;
          callback(null, data.toString());
        })
        .catch(error =>
          RNFetchBlob.fs
            .exists(filePath)
            .then(exists => {
              if (exists) {
                // The error is not related to the existance of the file
                if (!callback) throw error;
                callback(error);
              }
              return "";
            })
            .catch(() => {
              // We throw the original error
              if (!callback) throw error;
              callback(error);
            })
        )
    }),

  removeItem: (
    key: string,
    callback: (error: ?Error) => void,
  ) =>
    storagePathReady.then(() => 
      RNFetchBlob.fs.unlink(pathForKey(options.toFileName(key)))
        .then(() => callback && callback())
        .catch(error => {
          if (!callback) throw error;
          callback(error);
        })
    ),

  getAllKeys: (
    callback: (error: ?Error, keys: ?Array<string>) => void,
  ) =>
  storagePathReady
    .then(() =>
      RNFetchBlob.fs.ls(options.storagePath)
        .then(files => files.map<string>((file) => options.fromFileName(file)))
        .then(files => {
          if (!callback) return files
          callback(null, files)
        })
    )
    .catch(error => {
      if (!callback) throw error
      callback(error)
    }),

  clear: (
    callback: (error: ?Error, removed: ?boolean) => void,
  ) =>
    FilesystemStorage.getAllKeys((error, keys) => {
      if (error) throw error
  
      if (Array.isArray(keys) && keys.length) {
        const removedKeys = []
  
        keys.forEach(key => {
          FilesystemStorage.removeItem(key, (error: ?Error) => {
            removedKeys.push(key)
            if (error && callback) callback(error, false)
            if (removedKeys.length === keys.length && callback) callback(null, true)
          })
        })
      }
      callback && callback(null, false)
    }).catch(error => {
      if (!callback) throw error
      callback(error)
    })
}

export default FilesystemStorage
