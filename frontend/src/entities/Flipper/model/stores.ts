import { ref, unref, computed, reactive } from 'vue'
import { Platform } from 'quasar'

import { defineStore } from 'pinia'
import { FlipperWeb, FlipperElectron } from 'shared/lib/flipperJs'

import { showNotif } from 'shared/lib/utils/useShowNotif'
import { logger, type LogLevel } from 'shared/lib/utils/useLog'

import {
  FlipperInfo,
  PulseFile,
  DataFlipperElectron,
  DataDfuFlipperElectron
} from './types'
import { FlipperApi } from 'entity/Flipper'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

// import type { Emitter, DefaultEvents } from 'nanoevents'
// import { createNanoEvents } from 'nanoevents'

import asyncSleep from 'simple-async-sleep'

import {
  init as bridgeControllerInit,
  emitter as bridgeEmitter /* , getCurrentFlipper, getList, setCurrentFlipper */
} from 'shared/lib/flipperJs/bridgeController'

const componentName = 'FlipperStore'

export const useFlipperStore = defineStore('flipper', () => {
  const isElectron = Platform.is.electron

  const route = useRoute()
  const router = useRouter()

  //const appsStore = AppsModel.useAppsStore()

  const flags = reactive({
    connected: computed(() => flipper.value?.connected),
    updateInProgress: ref(false),
    waitForReconnect: ref(false),
    recovering: ref(false),
    autoReconnect: ref(false),
    isBridgeReady: ref(false),
    switchFlipper: ref(false),
    flipperIsInitialized: ref(false),
    disableNavigation: ref(false),
    disableButtonMultiflipper: ref(false),
    flipperIsBusy: ref(false)
  })

  const dialogs = reactive({
    microSDcardMissing: false,
    multiflipper: false,
    connectFlipper: false,
    mobileDetected: false,
    serialUnsupported: false,
    logs: false,
    downloadPath: false,
    recovery: false
  })

  const oldFlipper = ref<FlipperElectron | FlipperWeb>()
  const flipper = ref<FlipperElectron | FlipperWeb>()

  if (!Platform.is.electron) {
    flipper.value = new FlipperWeb()
  }
  // Platform.is.electron
  //   ? new FlipperElectron(/* '', createNanoEvents() */)
  //   : new FlipperWeb()

  // const flipper = ref<FlipperElectron | FlipperWeb>(new FlipperWeb())
  const flipperName = computed(() => flipper.value?.name)
  const flipperReady = computed(() => flipper.value?.flipperReady || false)
  const rpcActive = computed(() => flipper.value?.rpcActive || false)
  // const flippers: Ref<FlipperWeb[]> = ref([])
  const info = computed(() => flipper.value?.info as FlipperInfo | undefined)
  const loadingInfo = computed(() => flipper.value?.loadingInfo)

  const api = computed(() => {
    const firmware = info?.value?.firmware
    return firmware?.api
      ? `${firmware.api.major}.${firmware.api.minor}`
      : undefined
  })
  const target = computed(() => {
    const firmware = info?.value?.firmware
    return firmware?.target ? `f${firmware.target}` : undefined
  })

  const connect = async ({
    mode,
    autoReconnect
  }: {
    mode?: string
    autoReconnect?: boolean
  } = {}) => {
    if (flipper.value instanceof FlipperWeb) {
      // const ports = await navigator.serial.getPorts()

      // console.log(ports)
      // ports.forEach(async (port) => {
      //   console.log(port)
      //   await new Promise((resolve) => {
      //     setTimeout(() => resolve(true), 2000)
      //   })
      //   const _flipper = new FlipperWeb()
      //   await _flipper.connect({
      //     type: 'RPC'
      //   })
      //   flippers.value.push(_flipper)
      //   console.log(flippers.value)
      // })

      if (flipper.value.connected) {
        return
      }

      const currentAutoReconnectFlag = unref(flags.autoReconnect)
      await flipper.value
        .connect({
          type: mode || route.name === 'Cli' ? 'CLI' : 'RPC',
          autoReconnect
        })
        .then(async () => {
          // flags.connected = true
          const unbind = flipper.value?.emitter.on(
            'disconnect',
            (e: { isUserAction: boolean }) => {
              //appsStore.onClearInstalledAppsList()

              if (flags.autoReconnect && !e.isUserAction) {
                onAutoReconnect()

                flags.autoReconnect = currentAutoReconnectFlag
              }

              if (unbind) {
                unbind()
              }
            }
          )

          if (reconnectInterval.value) {
            clearInterval(reconnectInterval.value)
          }

          if (flags.updateInProgress) {
            onUpdateStage('end')
          }
        })
        .catch(() => {
          // flags.connected = false
        })
    }
  }

  const disconnect = async ({
    isUserAction = false
  }: {
    isUserAction?: boolean
  } = {}) => {
    if (flipper.value instanceof FlipperWeb) {
      await flipper.value?.disconnect({
        isUserAction
      })
      // flags.connected = false
      //appsStore.onClearInstalledAppsList()
    }
  }

  const onUpdateStage = (stage: string) => {
    if (flipper.value) {
      if (stage === 'start') {
        flags.disableButtonMultiflipper = true
        flags.disableNavigation = true
        flags.updateInProgress = true
        flipper.value.updating = true

        // stopScreenStream()
      } else if (stage === 'end') {
        flags.disableButtonMultiflipper = false
        flags.disableNavigation = false
        flags.updateInProgress = false
        flipper.value.updating = false
        flags.recovering = false
      }
    }
  }

  const reconnectInterval = ref<NodeJS.Timeout>()
  const onAutoReconnect = () => {
    reconnectInterval.value = setInterval(() => {
      connect({
        autoReconnect: true
      })
    }, 1000)
  }

  const fileToPass = ref<PulseFile>()
  const openFileIn = ({
    path,
    file
  }: {
    path: RouteLocationRaw
    file: PulseFile
  }) => {
    logger.info({
      context: componentName,
      message: `Passing file ${file.name} to ${path}`
    })
    fileToPass.value = file
    router.push(path)
  }

  const availableFlippers = ref<DataFlipperElectron[]>([])
  const availableDfuFlippers = ref<DataDfuFlipperElectron[]>([])

  const connectFlipper = async (
    _flipper: DataFlipperElectron
    // {
    //   name,
    //   emitter,
    //   mode
    // }: {
    //   name: string
    //   emitter: Emitter<DefaultEvents>
    //   mode: string
    // }
  ) => {
    console.log('connectFlipper', _flipper)
    if (!_flipper) {
      return
    }
    _flipper.mode = route.name === 'Cli' ? 'cli' : 'rpc'

    if (flipperReady.value && flipperName.value !== _flipper.name) {
      // _flipper.flipperReady = false
      flags.switchFlipper = true
    }
    flags.flipperIsInitialized = true
    if (flipper.value) {
      // flipper.value.flipperReady = false
      await flipper.value.disconnect()
      //appsStore.onClearInstalledAppsList()
      oldFlipper.value = unref(flipper.value)
    }

    await asyncSleep(500)

    const localFlipper = new FlipperElectron(
      _flipper.name,
      _flipper.emitter
      /* flipper.info */
    )

    localFlipper.setReadingMode(_flipper.mode)
    localFlipper.setName(_flipper.name)
    // localFlipper.setEmitter(_flipper.emitter)

    await localFlipper.connect(/* name, emitter */).catch(() => {
      showNotif({
        message: `Failed to connect to Flipper ${_flipper.name}. Replug the device and try again.`,
        color: 'negative'
      })
    })

    flipper.value = localFlipper

    flags.switchFlipper = false
    flags.waitForReconnect = false

    if (flipper.value.readingMode.type === 'rpc') {
      await flipper.value.getInfo()
      await flipper.value.ensureCommonPaths()
    } /* else {
      flipper.value.info = _flipper.info
    } */

    if (flags.updateInProgress || flags.recovering) {
      onUpdateStage('end')
    }

    flags.flipperIsInitialized = false

    // const _flipper = new FlipperElectron(name, emitter)
    // flipper.value.setReadingMode('rpc')
    // await _flipper.getInfo()

    // await asyncSleep(1)
    // await _flipper.init()

    // flipper.value = localFlipper

    // await flipper.value?.RPC('systemPing', { timeout: 2000 })
    // await asyncSleep(1000)

    // flipper.value = _flipper
  }

  const isDataFlipperElectron = (
    flipper: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): flipper is DataFlipperElectron => {
    return flipper.mode !== 'dfu'
  }
  const isDataDfuFlipperElectron = (
    flipper: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): flipper is DataDfuFlipperElectron => {
    return flipper.mode === 'dfu'
  }

  const availableBridgeFlippers = ref<
    Array<DataFlipperElectron | DataDfuFlipperElectron>
  >([])
  const listInit = () => {
    bridgeEmitter.on(
      'list',
      async (data: DataFlipperElectron[] | DataDfuFlipperElectron[]) => {
        // availableFlippers.value = []
        // availableDfuFlippers.value = []

        // const _availableFlippers = []
        // const _availableDfuFlippers = []

        // new FlipperElectron(data.name, data.emitter)
        if (availableBridgeFlippers.value.length > data.length) {
          for (
            let index = 0;
            index < availableBridgeFlippers.value.length;
            index++
          ) {
            const bridgeFlipper = availableBridgeFlippers.value[index]!

            if (
              data.findIndex((flipper) => {
                return flipper.name === bridgeFlipper.name
              }) === -1
            ) {
              availableBridgeFlippers.value.splice(index, 1)

              if (flipper.value?.name === bridgeFlipper.name) {
                flipper.value.disconnect()
                //appsStore.onClearInstalledAppsList()

                if (!flags.updateInProgress) {
                  flipper.value = undefined
                }
              }

              if (isDataFlipperElectron(bridgeFlipper)) {
                const index = availableFlippers.value.findIndex((flipper) => {
                  return flipper.name === bridgeFlipper.name
                })

                if (index !== -1) {
                  availableFlippers.value.splice(index, 1)
                }
              }

              if (isDataDfuFlipperElectron(bridgeFlipper)) {
                const index = availableDfuFlippers.value.findIndex(
                  (flipper) => {
                    return flipper.name === bridgeFlipper.name
                  }
                )

                if (index !== -1) {
                  availableDfuFlippers.value.splice(index, 1)
                }
              }
            }
          }
        }

        for (let index = 0; index < data.length; index++) {
          const flipper = data[index]!

          if (
            availableBridgeFlippers.value.findIndex((availableFlipper) => {
              return availableFlipper.name === flipper.name
            }) === -1
          ) {
            availableBridgeFlippers.value.push(flipper)

            if (isDataFlipperElectron(flipper)) {
              availableFlippers.value.push(flipper)
            }

            if (isDataDfuFlipperElectron(flipper)) {
              availableDfuFlippers.value.push(flipper)
              // useFlipperStore().availableDfuFlippers.push(
              //   new FlipperElectron(flipper.name, flipper.emitter, flipper.info)
              // )
            }
          }
        }

        // HACK: Necessary delay to eliminate flippers that lock up after a reboot
        await asyncSleep(1000)

        if (flags.updateInProgress) {
          if (flags.waitForReconnect) {
            const findFlipper = availableFlippers.value.find(
              (availableFlipper) => {
                return availableFlipper.name === flipper.value?.name
              }
            )

            if (findFlipper) {
              // await asyncSleep(1000)

              if (isDataFlipperElectron(findFlipper)) {
                connectFlipper(findFlipper)
              }
            }
          }
        } else if (flags.recovering) {
          if (flags.waitForReconnect) {
            const findFlipper = availableFlippers.value.find(
              (availableFlipper) => {
                return availableFlipper.name === recoveringFlipperName.value
              }
            )

            if (findFlipper) {
              // await asyncSleep(1000)

              if (isDataFlipperElectron(findFlipper)) {
                connectFlipper(findFlipper)
              }
            }
          }
        } else {
          if (availableFlippers.value.length) {
            // await asyncSleep(1000)

            if (!flipper.value) {
              if (!flags.flipperIsInitialized) {
                connectFlipper(availableFlippers.value[0]!)
              }
              // console.log('flipper.value', flipper.value.name)
              // if (flipper.value.name !== availableFlippers.value[0].name) {
              //   console.log(
              //     'availableFlippers.value[0].name',
              //     availableFlippers.value[0].name
              //   )
              //   connectFlipper(availableFlippers.value[0])
              // }
            }
          }
        }

        // availableFlippers.value = _availableFlippers
        // availableDfuFlippers.value = _availableDfuFlippers
        // data.forEach((flipper) => {
        //   if (isDataFlipperElectron(flipper)) {
        //     const _flipper = new FlipperElectron /*
        //       flipper.name,
        //       flipper.emitter,
        //       flipper.info */()

        //     _flipper.setName(flipper.name)
        //     _flipper.setEmitter(flipper.emitter)
        //     _flipper.getInfo()

        //     // await asyncSleep(10000)
        //     // await _flipper.getInfo()

        //     useFlipperStore().availableFlippers.push(_flipper)
        //   }

        //   if (isDataDfuFlipperElectron(flipper)) {
        //     useFlipperStore().availableDfuFlippers.push(flipper)
        //     // useFlipperStore().availableDfuFlippers.push(
        //     //   new FlipperElectron(flipper.name, flipper.emitter, flipper.info)
        //     // )
        //   }
        // })

        // useFlipperStore().availableFlippers[0].getInfo()
      }
    )
  }

  const init = async () => {
    // toggleAutoReconnectCondition.value()

    bridgeEmitter.on('spawn', () => {
      flags.isBridgeReady = true
      // setTimeout(() => {
      // }, 1000)
    })
    bridgeEmitter.on('exit', () => {
      flags.isBridgeReady = false
    })
    listInit()
    await bridgeControllerInit()

    // if (flags.value.autoReconnect && flipper.value?.name) {
    //   autoReconnectFlipperName.value = flipper.value?.name
    // } else {
    //   autoReconnectFlipperName.value = null
    // }
  }

  if (Platform.is.electron) {
    init()
  }

  const findMicroSd = async () => {
    await flipper.value?.getInfo()

    if (info.value?.storage.sdcard?.status.isInstalled) {
      dialogs.microSDcardMissing = false
    } else {
      showNotif({
        message: 'MicroSD not found',
        color: 'warning',
        textColor: 'black',
        timeout: 1000
      })
    }
  }

  const recoveringFlipperName = ref('')
  const recoveryError = ref(false)
  const recoveryUpdateStage = ref('')
  const recoveryProgress = ref(0)
  const recoveryLogs = ref<string[]>([])

  const retry = () => {
    resetRecovery(true)
    dialogs.recovery = false
    dialogs.multiflipper = true
  }
  const resetRecovery = (clearLogs = false) => {
    recoveryUpdateStage.value = ''
    recoveryProgress.value = 0
    if (clearLogs) {
      recoveryLogs.value = []
    }
  }
  const recovery = async (info: DataDfuFlipperElectron['info']) => {
    if (!isElectron) {
      return
    }

    if (flipper.value) {
      flipper.value.disconnect()
      flipper.value = undefined
    }

    recoveryError.value = false
    dialogs.multiflipper = false
    dialogs.recovery = true
    flags.recovering = true
    recoveringFlipperName.value = info.name
    flags.waitForReconnect = true
    // setAutoReconnectCondition.value(flags.value.autoReconnect)
    // flags.value.autoReconnect = false
    // autoReconnectFlipperName.value = info.name

    // console.log(info)
    recoveryUpdateStage.value = 'Loading firmware bundle...'
    const firmwareTar = await FlipperApi.fetchFirmwareTar(
      `https://update.flipperzero.one/firmware/release/f${info.target}/update_tgz`
    )

    const saved = await window.fs.saveToTemp({
      filename: 'update.tar',
      buffer: firmwareTar
    })

    if (saved.status !== 'ok') {
      return
    }

    let inactivityTimeout: NodeJS.Timeout
    const onTimeout = () => {
      const messageLong =
        'Error: Operation timed out. Please check USB connection and try again.'
      const messageShort = `Failed to repair ${info.name}: Repair timeout`
      showNotif({
        message: messageShort,
        color: 'negative'
      })
      logger.error({
        context: componentName,
        message: messageShort
      })
      unbindLogs()
      unbindStatus()
      recoveryUpdateStage.value = messageLong
      recoveryError.value = true
    }
    const updateInactivityTimeout = (stop = false) => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout)
      }

      if (stop) {
        return
      }

      inactivityTimeout = setTimeout(onTimeout, 60 * 1000)
    }

    window.bridge.send({
      type: 'repair',
      name: info.name,
      data: {
        file: saved.path
      }
    })

    updateInactivityTimeout()

    const unbindLogs = bridgeEmitter.on('log', (stderr) => {
      const logLines = stderr.data.split('\n')
      logLines.pop()
      logLines.forEach((line: string) => {
        recoveryLogs.value.push(line)
        let level: LogLevel = 'debug'
        if (line.includes('[E]')) {
          level = 'error'
        } else if (line.includes('[W]')) {
          level = 'warn'
        } else if (line.includes('[I]')) {
          level = 'info'
        }
        logger[level]({
          context: componentName,
          message: line
        })
      })
    })

    const unbindStatus = bridgeEmitter.on('status', async (status) => {
      if (status.error) {
        updateInactivityTimeout(true)
        let messageLong = `Failed to repair ${info.name}: ${status.error.message}`
        let messageShort = messageLong
        switch (status.error.message) {
          case 'UnknownError':
            messageLong =
              'Unknown error! Please try again. If the error persists, please contact support.'
            messageShort = `Failed to repair ${info.name}: Unknown error`
            break
          case 'InvalidDevice':
            messageLong =
              'Error: Cannot determine device type. Please try again.'
            messageShort = `Failed to repair ${info.name}: Invalid device`
            break
          case 'DiskError':
            messageLong =
              'Error: Cannot read/write to disk. The app may be missing permissions.'
            messageShort = `Failed to repair ${info.name}: Disk error`
            break
          case 'DataError':
            messageLong =
              'Error: Necessary files are corrupted. Please try again.'
            messageShort = `Failed to repair ${info.name}: Data error`
            break
          case 'SerialAccessError':
            messageLong =
              'Error: Cannot access device in Serial mode. Please check USB connection and permissions and try again.'
            messageShort = `Failed to repair ${info.name}: Serial access error`
            break
          case 'RecoveryAccessError':
            messageLong =
              'Error: Cannot access device in Recovery mode. Please check USB connection and permissions and try again.'
            messageShort = `Failed to repair ${info.name}: Recovery access error`
            break
          case 'OperationError':
            messageLong =
              'Error: Current operation was interrupted. Please try again.'
            messageShort = `Failed to repair ${info.name}: Operation error`
            break
          case 'SerialError':
            messageLong =
              'Error: Serial port error. Please check USB connection and try again.'
            messageShort = `Failed to repair ${info.name}: Serial error`
            break
          case 'RecoveryError':
            messageLong =
              'Error: Recovery mode error. Please check USB connection and try again.'
            messageShort = `Failed to repair ${info.name}: Recovery error`
            break
          case 'ProtocolError':
            messageLong =
              'Error: Protocol error. Please try again. If the error persists, please contact support.'
            messageShort = `Failed to repair ${info.name}: Protocol error`
            break
          case 'TimeoutError':
            messageLong =
              'Error: Operation timed out. Please check USB connection and try again.'
            messageShort = `Failed to repair ${info.name}: Timeout error`
            break
        }
        showNotif({
          message: messageShort,
          color: 'negative'
        })
        unbindLogs()
        unbindStatus()
        recoveryUpdateStage.value = messageLong
        recoveryError.value = true
      }
      if (status.message) {
        updateInactivityTimeout()
        recoveryUpdateStage.value = status.message
      }
      if (status.progress) {
        updateInactivityTimeout()
        recoveryProgress.value = status.progress / 100
      }
      if (status.finished) {
        updateInactivityTimeout(true)
        unbindLogs()
        unbindStatus()

        dialogs.multiflipper = false
        dialogs.recovery = false

        recoveryUpdateStage.value = 'Finished'
      }
    })
  }

  const expandView = ref(false)
  const isScreenStream = ref(false)
  const pageWithScreenStream = ref(false)
  const startScreenStream = async (attempts = 0) => {
    return await flipper.value
      ?.RPC('guiStartScreenStream')
      .then(() => {
        console.log('Started screen streaming')

        isScreenStream.value = true
      })
      .catch((error: Error) => {
        if (attempts < 3) {
          return startScreenStream(attempts + 1)
        } else {
          isScreenStream.value = false

          throw new Error(
            `Start screen stream RPC error: ${error.message || error}`
          )
        }
      })
  }

  const stopScreenStream = async () => {
    try {
      if (!flipper.value) {
        return
      }

      await flipper.value?.RPC('guiStopScreenStream')
      console.log('Stopped screen streaming')
    } catch (error) {
      throw new Error(
        `Stop screen stream RPC error: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      isScreenStream.value = false
    }
  }

  return {
    isElectron,

    flags,
    dialogs,
    connect,
    disconnect,
    oldFlipper,
    flipper,
    flipperReady,
    flipperName,
    rpcActive,
    info,
    loadingInfo,
    api,
    target,
    onUpdateStage,
    onAutoReconnect,
    reconnectInterval,

    fileToPass,
    openFileIn,

    availableFlippers,
    availableDfuFlippers,
    availableBridgeFlippers,
    connectFlipper,
    findMicroSd,

    recoveringFlipperName,
    retry,
    recovery,
    resetRecovery,
    recoveryUpdateStage,
    recoveryProgress,
    recoveryError,
    recoveryLogs,

    expandView,
    isScreenStream,
    pageWithScreenStream,
    startScreenStream,
    stopScreenStream
  }
})
