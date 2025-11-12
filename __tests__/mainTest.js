import RNBackgroundDownloader from '../index'
import DownloadTask from '../lib/DownloadTask'
import { NativeModules, NativeEventEmitter } from 'react-native'

const RNBackgroundDownloaderNative = NativeModules.RNBackgroundDownloader
const nativeEmitter = new NativeEventEmitter(RNBackgroundDownloaderNative)

let downloadTask

test('download function', () => {
  downloadTask = RNBackgroundDownloader.download({
    id: 'test',
    url: 'test',
    destination: 'test',
  })
  expect(downloadTask).toBeInstanceOf(DownloadTask)
  expect(RNBackgroundDownloaderNative.download).toHaveBeenCalled()
})

test('begin event', () => {
  const mockedHeaders = { Etag: '123' }
  return new Promise(resolve => {
    const beginDT = RNBackgroundDownloader.download({
      id: 'testBegin',
      url: 'test',
      destination: 'test',
    }).begin(({ expectedBytes, headers }) => {
      expect(expectedBytes).toBe(9001)
      expect(headers).toBe(mockedHeaders)
      expect(beginDT.state).toBe('DOWNLOADING')
      resolve()
    })
    nativeEmitter.emit('downloadBegin', {
      id: 'testBegin',
      expectedBytes: 9001,
      headers: mockedHeaders,
    })
  })
})

test('progress event', () => {
  return new Promise(resolve => {
    RNBackgroundDownloader.download({
      id: 'testProgress',
      url: 'test',
      destination: 'test',
    }).progress(({ bytesDownloaded, bytesTotal }) => {
      expect(bytesDownloaded).toBe(100)
      expect(bytesTotal).toBe(200)
      resolve()
    })
    nativeEmitter.emit('downloadProgress', [{
      id: 'testProgress',
      bytesDownloaded: 100,
      bytesTotal: 200,
    }])
  })
})

test('done event', () => {
  return new Promise(resolve => {
    const doneDT = RNBackgroundDownloader.download({
      id: 'testDone',
      url: 'test',
      destination: 'test',
    }).done(() => {
      expect(doneDT.state).toBe('DONE')
      resolve()
    })
    nativeEmitter.emit('downloadComplete', {
      id: 'testDone',
    })
  })
})

test('fail event', () => {
  return new Promise(resolve => {
    const failDT = RNBackgroundDownloader.download({
      id: 'testFail',
      url: 'test',
      destination: 'test',
    }).error(({ error, errorCode }) => {
      expect(error).toBeInstanceOf(Error)
      expect(errorCode).toBe(-1)
      expect(failDT.state).toBe('FAILED')
      resolve()
    })
    nativeEmitter.emit('downloadFailed', {
      id: 'testFail',
      error: new Error('test'),
      errorCode: -1,
    })
  })
})

test('pause', () => {
  const pauseDT = RNBackgroundDownloader.download({
    id: 'testPause',
    url: 'test',
    destination: 'test',
  })

  pauseDT.pause()
  expect(pauseDT.state).toBe('PAUSED')
  expect(RNBackgroundDownloaderNative.pauseTask).toHaveBeenCalled()
})

test('resume', () => {
  const resumeDT = RNBackgroundDownloader.download({
    id: 'testResume',
    url: 'test',
    destination: 'test',
  })

  resumeDT.resume()
  expect(resumeDT.state).toBe('DOWNLOADING')
  expect(RNBackgroundDownloaderNative.resumeTask).toHaveBeenCalled()
})

test('stop', () => {
  const stopDT = RNBackgroundDownloader.download({
    id: 'testStop',
    url: 'test',
    destination: 'test',
  })

  stopDT.stop()
  expect(stopDT.state).toBe('STOPPED')
  expect(RNBackgroundDownloaderNative.stopTask).toHaveBeenCalled()
})

test('checkForExistingDownloads', () => {
  return RNBackgroundDownloader.checkForExistingDownloads()
    .then(foundDownloads => {
      expect(RNBackgroundDownloaderNative.checkForExistingDownloads).toHaveBeenCalled()
      expect(foundDownloads.length).toBe(4)
      foundDownloads.forEach(foundDownload => {
        expect(foundDownload).toBeInstanceOf(DownloadTask)
        expect(foundDownload.state).not.toBe('FAILED')
        expect(foundDownload.state).not.toBe('STOPPED')
      })
    })
})

test('wrong handler type', () => {
  const dt = RNBackgroundDownloader.download({
    id: 'test22222',
    url: 'test',
    destination: 'test',
  })

  expect(() => {
    dt.begin('not function')
  }).toThrow()

  expect(() => {
    dt.progress(7)
  }).toThrow()

  expect(() => {
    dt.done({ iamnota: 'function' })
  }).toThrow()

  expect(() => {
    dt.error('not function')
  }).toThrow()
})

test('exposes legacy handler aliases', () => {
  const dt = RNBackgroundDownloader.download({
    id: 'legacyHandlers',
    url: 'test',
    destination: 'test',
  })

  const beginHandler = jest.fn()
  const progressHandler = jest.fn()
  const doneHandler = jest.fn()
  const errorHandler = jest.fn()

  dt
    .begin(beginHandler)
    .progress(progressHandler)
    .done(doneHandler)
    .error(errorHandler)

  expect(dt.beginHandler).toBe(beginHandler)
  expect(dt._beginHandler).toBe(beginHandler)
  expect(dt.progressHandler).toBe(progressHandler)
  expect(dt._progressHandler).toBe(progressHandler)
  expect(dt.doneHandler).toBe(doneHandler)
  expect(dt._doneHandler).toBe(doneHandler)
  expect(dt.errorHandler).toBe(errorHandler)
  expect(dt._errorHandler).toBe(errorHandler)
})

test('legacy handler alias assignment triggers callbacks', () => {
  const beginHandler = jest.fn()

  const dt = RNBackgroundDownloader.download({
    id: 'legacyAliasAssignment',
    url: 'test',
    destination: 'test',
  })

  expect(() => {
    dt._beginHandler = 'nope'
  }).toThrow('[RNBackgroundDownloader] expected argument to be a function, got: string')

  dt._beginHandler = beginHandler

  nativeEmitter.emit('downloadBegin', {
    id: 'legacyAliasAssignment',
  })

  expect(beginHandler).toHaveBeenCalledTimes(1)
})

test('direct handler property assignment remains reactive', () => {
  const progressHandler = jest.fn()

  const dt = RNBackgroundDownloader.download({
    id: 'directPropertyAssignment',
    url: 'test',
    destination: 'test',
  })

  expect(() => {
    dt.progressHandler = 'nope'
  }).toThrow('[RNBackgroundDownloader] expected argument to be a function, got: string')

  dt.progressHandler = progressHandler

  nativeEmitter.emit('downloadProgress', [{
    id: 'directPropertyAssignment',
    bytesDownloaded: 5,
    bytesTotal: 10,
  }])

  expect(progressHandler).toHaveBeenCalledTimes(1)
})
