import { NativeModules, NativeEventEmitter } from 'react-native'
import DownloadTask from './lib/DownloadTask'
import NativeRNBackgroundDownloader, {
  type NativeRNBackgroundDownloaderConstants,
  type Spec as NativeBackgroundDownloaderSpec,
} from './src/NativeRNBackgroundDownloader'

type TurboModuleProxyGlobal = typeof globalThis & { __turboModuleProxy?: unknown }

const globalWithTurboModuleProxy = globalThis as TurboModuleProxyGlobal

const isTurboModuleEnabled = globalWithTurboModuleProxy.__turboModuleProxy != null

const NativeModule: NativeBackgroundDownloaderSpec = isTurboModuleEnabled
  ? NativeRNBackgroundDownloader
  : (NativeModules.RNBackgroundDownloader as NativeBackgroundDownloaderSpec)

const NativeModuleConstants: NativeRNBackgroundDownloaderConstants = (() => {
  type LegacyNativeModule = NativeBackgroundDownloaderSpec &
    Partial<NativeRNBackgroundDownloaderConstants>

  const getLegacyConstants = (
    legacyModule: LegacyNativeModule
  ): NativeRNBackgroundDownloaderConstants => {
    const {
      documents,
      TaskRunning,
      TaskSuspended,
      TaskCanceling,
      TaskCompleted,
    } = legacyModule

    if (
      documents == null ||
      TaskRunning == null ||
      TaskSuspended == null ||
      TaskCanceling == null ||
      TaskCompleted == null
    )
      throw new Error('[RNBackgroundDownloader] Native module constants are not available')

    return {
      documents,
      TaskRunning,
      TaskSuspended,
      TaskCanceling,
      TaskCompleted,
    }
  }

  try {
    const constants = NativeModule.getConstants?.()

    if (constants && typeof constants === 'object')
      return constants
  } catch (error) {
    console.warn('[RNBackgroundDownloader] Failed to load native constants', error)
  }

  return getLegacyConstants(NativeModule as LegacyNativeModule)
})()

const RNBackgroundDownloaderEmitter = new NativeEventEmitter(NativeModule as unknown as object)

const MIN_PROGRESS_INTERVAL = 250
const tasksMap = new Map()

const config = {
  headers: {},
  progressInterval: 1000,
  isLogsEnabled: false,
}

function log (...args) {
  if (config.isLogsEnabled)
    console.log('[RNBackgroundDownloader]', ...args)
}

RNBackgroundDownloaderEmitter.addListener('downloadBegin', ({ id, ...rest }) => {
  log('[RNBackgroundDownloader] downloadBegin', id, rest)
  const task = tasksMap.get(id)
  task?.onBegin(rest)
})

RNBackgroundDownloaderEmitter.addListener('downloadProgress', events => {
  log('[RNBackgroundDownloader] downloadProgress-1', events, tasksMap)
  for (const event of events) {
    const { id, ...rest } = event
    const task = tasksMap.get(id)
    log('[RNBackgroundDownloader] downloadProgress-2', id, task)
    task?.onProgress(rest)
  }
})

RNBackgroundDownloaderEmitter.addListener('downloadComplete', ({ id, ...rest }) => {
  log('[RNBackgroundDownloader] downloadComplete', id, rest)
  const task = tasksMap.get(id)
  task?.onDone(rest)

  tasksMap.delete(id)
})

RNBackgroundDownloaderEmitter.addListener('downloadFailed', ({ id, ...rest }) => {
  log('[RNBackgroundDownloader] downloadFailed', id, rest)
  const task = tasksMap.get(id)
  task?.onError(rest)

  tasksMap.delete(id)
})

export function setConfig ({ headers, progressInterval, isLogsEnabled }) {
  if (typeof headers === 'object') config.headers = headers

  if (progressInterval != null)
    if (typeof progressInterval === 'number' && progressInterval >= MIN_PROGRESS_INTERVAL)
      config.progressInterval = progressInterval
    else
      console.warn(`[RNBackgroundDownloader] progressInterval must be a number >= ${MIN_PROGRESS_INTERVAL}. You passed ${progressInterval}`)

  if (typeof isLogsEnabled === 'boolean') config.isLogsEnabled = isLogsEnabled
}

export function checkForExistingDownloads () {
  log('[RNBackgroundDownloader] checkForExistingDownloads-1')
  return NativeModule.checkForExistingDownloads()
    .then(foundTasks => {
      log('[RNBackgroundDownloader] checkForExistingDownloads-2', foundTasks)
      return foundTasks.map(taskInfo => {
        // SECOND ARGUMENT RE-ASSIGNS EVENT HANDLERS
        const task = new DownloadTask(taskInfo, tasksMap.get(taskInfo.id))
        log('[RNBackgroundDownloader] checkForExistingDownloads-3', taskInfo)

        if (taskInfo.state === NativeModuleConstants.TaskRunning) {
          task.state = 'DOWNLOADING'
        } else if (taskInfo.state === NativeModuleConstants.TaskSuspended) {
          task.state = 'PAUSED'
        } else if (taskInfo.state === NativeModuleConstants.TaskCanceling) {
          task.stop()
          return null
        } else if (taskInfo.state === NativeModuleConstants.TaskCompleted) {
          if (taskInfo.bytesDownloaded === taskInfo.bytesTotal)
            task.state = 'DONE'
          else
            // IOS completed the download but it was not done.
            return null
        }
        tasksMap.set(taskInfo.id, task)
        return task
      }).filter(task => !!task)
    })
}

export function ensureDownloadsAreRunning () {
  log('[RNBackgroundDownloader] ensureDownloadsAreRunning')
  return checkForExistingDownloads()
    .then(tasks => {
      for (const task of tasks)
        if (task.state === 'DOWNLOADING') {
          task.pause()
          task.resume()
        }
    })
}

export function completeHandler (jobId: string) {
  if (jobId == null) {
    console.warn('[RNBackgroundDownloader] completeHandler: jobId is empty')
    return
  }

  return NativeModule.completeHandler(jobId)
}

type DownloadOptions = {
  id: string,
  url: string,
  destination: string,
  headers?: object,
  metadata?: object,
  isAllowedOverRoaming?: boolean,
  isAllowedOverMetered?: boolean,
  isNotificationVisible?: boolean;
  notificationTitle?: string,
}

export function download (options: DownloadOptions) {
  log('[RNBackgroundDownloader] download', options)
  if (!options.id || !options.url || !options.destination)
    throw new Error('[RNBackgroundDownloader] id, url and destination are required')

  options.headers = { ...config.headers, ...options.headers }

  if (!(options.metadata && typeof options.metadata === 'object'))
    options.metadata = {}

  options.destination = options.destination.replace('file://', '')

  if (options.isAllowedOverRoaming == null) options.isAllowedOverRoaming = true
  if (options.isAllowedOverMetered == null) options.isAllowedOverMetered = true
  if (options.isNotificationVisible == null) options.isNotificationVisible = false

  const task = new DownloadTask({
    id: options.id,
    metadata: options.metadata,
  })
  tasksMap.set(options.id, task)

  NativeModule.download({
    ...options,
    metadata: JSON.stringify(options.metadata),
    progressInterval: config.progressInterval,
  })

  return task
}

export const directories = {
  documents: NativeModuleConstants.documents,
}

export default {
  download,
  checkForExistingDownloads,
  ensureDownloadsAreRunning,
  completeHandler,

  setConfig,

  directories,
}
