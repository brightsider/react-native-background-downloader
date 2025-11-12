import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export type DownloadHeaders = { [key: string]: string | null }

export type DownloadOptions = {
  id: string
  url: string
  destination: string
  headers?: DownloadHeaders
  metadata: string
  isAllowedOverRoaming: boolean
  isAllowedOverMetered: boolean
  isNotificationVisible: boolean
  notificationTitle?: string
  progressInterval: number
}

export type ExistingDownload = {
  id: string
  metadata: string
  state: number
  bytesDownloaded: number
  bytesTotal: number
}

export type NativeRNBackgroundDownloaderConstants = {
  documents: string
  TaskRunning: number
  TaskSuspended: number
  TaskCanceling: number
  TaskCompleted: number
}

export interface Spec extends TurboModule {
  readonly getConstants: () => NativeRNBackgroundDownloaderConstants
  download(options: DownloadOptions): void
  pauseTask(configId: string): void
  resumeTask(configId: string): void
  stopTask(configId: string): void
  completeHandler(configId: string): void
  checkForExistingDownloads(): Promise<ExistingDownload[]>
  addListener(eventName: string): void
  removeListeners(count: number): void
}

export default TurboModuleRegistry.getEnforcing<Spec>('RNBackgroundDownloader')
