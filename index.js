/**
* @flow
*/

import RNFetchBlob from 'rn-fetch-blob'

let options = {
  storagePath: `${RNFetchBlob.fs.dirs.DocumentDir}/persistStore`,
  encoding: 'utf8',
  toFileName: (name: string) => name.split(':').join('-'),
  fromFileName: (name: string) => name.split('-').join(':'),
}

const pathForKey = (key: string) => `${options.storagePath}/${options.toFileName(key)}`

const FilesystemStorage = {
  config: (
    customOptions: Object,
  ) => {
    options = {
      ...options,
      ...customOptions,
    }
  },

  setItem: (
    key: string,
    value: string,
    callback?: (error: ?Error) => void,
  ) =>
    RNFetchBlob.fs.writeFile(pathForKey(key), value, options.encoding)
      .then(() => callback && callback())
      .catch(error => callback && callback(error)),

  getItem: (
    key: string,
    callback: (error: ?Error, result: ?string) => void
  ) =>
    RNFetchBlob.fs.readFile(pathForKey(options.toFileName(key)), options.encoding)
      .then(data => {
        if (!callback) return data;
        callback(null, data.toString());
      })
      .catch(error => {
        if (!callback) throw error;
        callback(error);
      }),

  removeItem: (
    key: string,
    callback: (error: ?Error) => void,
  ) =>
    RNFetchBlob.fs.unlink(pathForKey(options.toFileName(key)))
      .then(() => callback && callback())
      .catch(error => {
        if (!callback) throw error;
        callback(error);
      }),

  getAllKeys: (
    callback: (error: ?Error, keys: ?Array<string>) => void,
  ) =>
    RNFetchBlob.fs.exists(options.storagePath)
    .then(exists =>
      exists ? true : RNFetchBlob.fs.mkdir(options.storagePath)
    )
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
