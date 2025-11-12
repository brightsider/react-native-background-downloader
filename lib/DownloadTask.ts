import { NativeModules } from 'react-native'
import { TaskInfo } from '..'

type Handler = (...args: any[]) => void

const { RNBackgroundDownloader } = NativeModules

type HandlerName = 'begin' | 'progress' | 'done' | 'error'

function validateHandler (handler) {
  const type = typeof handler

  if (type !== 'function')
    throw new TypeError(`[RNBackgroundDownloader] expected argument to be a function, got: ${type}`)
}

export default class DownloadTask {
  id = ''
  state = 'PENDING'
  metadata = {}

  bytesDownloaded = 0
  bytesTotal = 0

  private handlerStore: Partial<Record<HandlerName, Handler>> = {}

  private setHandler (name: HandlerName, handler?: Handler) {
    if (handler == null) {
      this.handlerStore[name] = undefined
      return
    }

    validateHandler(handler)
    this.handlerStore[name] = handler
  }

  private getHandler (name: HandlerName): Handler | undefined {
    return this.handlerStore[name]
  }

  set beginHandler (handler: Handler | undefined) {
    this.setHandler('begin', handler)
  }

  get beginHandler (): Handler | undefined {
    return this.getHandler('begin')
  }

  set _beginHandler (handler: Handler | undefined) {
    this.beginHandler = handler
  }

  get _beginHandler (): Handler | undefined {
    return this.beginHandler
  }

  set progressHandler (handler: Handler | undefined) {
    this.setHandler('progress', handler)
  }

  get progressHandler (): Handler | undefined {
    return this.getHandler('progress')
  }

  set _progressHandler (handler: Handler | undefined) {
    this.progressHandler = handler
  }

  get _progressHandler (): Handler | undefined {
    return this.progressHandler
  }

  set doneHandler (handler: Handler | undefined) {
    this.setHandler('done', handler)
  }

  get doneHandler (): Handler | undefined {
    return this.getHandler('done')
  }

  set _doneHandler (handler: Handler | undefined) {
    this.doneHandler = handler
  }

  get _doneHandler (): Handler | undefined {
    return this.doneHandler
  }

  set errorHandler (handler: Handler | undefined) {
    this.setHandler('error', handler)
  }

  get errorHandler (): Handler | undefined {
    return this.getHandler('error')
  }

  set _errorHandler (handler: Handler | undefined) {
    this.errorHandler = handler
  }

  get _errorHandler (): Handler | undefined {
    return this.errorHandler
  }

  private setBeginHandler (handler?: Handler) {
    if (handler == null) return
    this.beginHandler = handler
  }

  private setProgressHandler (handler?: Handler) {
    if (handler == null) return
    this.progressHandler = handler
  }

  private setDoneHandler (handler?: Handler) {
    if (handler == null) return
    this.doneHandler = handler
  }

  private setErrorHandler (handler?: Handler) {
    if (handler == null) return
    this.errorHandler = handler
  }

  constructor (taskInfo: TaskInfo, originalTask?: TaskInfo) {
    this.id = taskInfo.id
    this.bytesDownloaded = taskInfo.bytesDownloaded ?? 0
    this.bytesTotal = taskInfo.bytesTotal ?? 0

    const metadata = this.tryParseJson(taskInfo.metadata)
    if (metadata)
      this.metadata = metadata

    if (originalTask) {
      this.setBeginHandler(originalTask.beginHandler ?? originalTask._beginHandler)
      this.setProgressHandler(originalTask.progressHandler ?? originalTask._progressHandler)
      this.setDoneHandler(originalTask.doneHandler ?? originalTask._doneHandler)
      this.setErrorHandler(originalTask.errorHandler ?? originalTask._errorHandler)
    }
  }

  begin (handler) {
    this.setBeginHandler(handler)
    return this
  }

  progress (handler) {
    this.setProgressHandler(handler)
    return this
  }

  done (handler) {
    this.setDoneHandler(handler)
    return this
  }

  error (handler) {
    this.setErrorHandler(handler)
    return this
  }

  onBegin (params) {
    this.state = 'DOWNLOADING'
    this.beginHandler?.(params)
  }

  onProgress ({ bytesDownloaded, bytesTotal }) {
    this.bytesDownloaded = bytesDownloaded
    this.bytesTotal = bytesTotal
    this.progressHandler?.({ bytesDownloaded, bytesTotal })
  }

  onDone (params) {
    this.state = 'DONE'
    this.bytesDownloaded = params.bytesDownloaded
    this.bytesTotal = params.bytesTotal
    this.doneHandler?.(params)
  }

  onError (params) {
    this.state = 'FAILED'
    this.errorHandler?.(params)
  }

  pause () {
    this.state = 'PAUSED'
    RNBackgroundDownloader.pauseTask(this.id)
  }

  resume () {
    this.state = 'DOWNLOADING'
    RNBackgroundDownloader.resumeTask(this.id)
  }

  stop () {
    this.state = 'STOPPED'
    RNBackgroundDownloader.stopTask(this.id)
  }

  tryParseJson (element) {
    try {
      if (typeof element === 'string')
        element = JSON.parse(element)

      return element
    } catch (e) {
      console.warn('DownloadTask tryParseJson', e)
      return null
    }
  }
}
