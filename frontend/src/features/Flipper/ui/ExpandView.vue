<template>
  <q-dialog class="expandView" @show="showDialog" @hide="hideDialog">
    <q-card ref="expandViewCard" class="expandView__wrapper full-width column rounded-borders"
      style="min-width: fit-content">
      <span class="scanLine absolute fit" />
      <canvas ref="gridBackground" class="absolute-center" style="opacity: 0.15" />
      <q-card-section class="row col items-center justify-center q-pa-xl">
        <div class="row justify-center items-center">
          <div class="relative-position q-pa-sm rounded-borders q-mr-lg"
            style="border: 3px solid #9e5823; background: #ff8200;">
            <canvas :width="128 * screenScale" :height="64 * screenScale" style="image-rendering: pixelated" :style="`rotate: ${90 * rotationCalculation
              }deg; scale: ${scaleCalculation};`" ref="screenStreamExpandCanvas" />
          </div>
          <div class="controls column items-end">
            <div class="controls__dpad dpad q-mb-md">
              <FlipperKeypadButton class="dpad__top" icon="flipper:control-triangle"
                iconHover="flipper:control-triangle-hover" iconActive="flipper:control-triangle-down" size="32px"
                @onLongPress="
                  onInputEvent({
                    key: 'UP',
                    type: 'LONG'
                  })
                  " @onShortPress="
                    onInputEvent({
                      key: 'UP',
                      type: 'SHORT'
                    })
                    " @onRepeat="
                      onInputEvent({
                        key: 'UP',
                        type: 'REPEAT'
                      })
                      " :keys="['ArrowUp', 'KeyW']" />
              <FlipperKeypadButton class="dpad__right" icon="flipper:control-triangle"
                iconHover="flipper:control-triangle-hover" iconActive="flipper:control-triangle-down" size="32px"
                @onLongPress="
                  onInputEvent({
                    key: 'RIGHT',
                    type: 'LONG'
                  })
                  " @onShortPress="
                    onInputEvent({
                      key: 'RIGHT',
                      type: 'SHORT'
                    })
                    " @onRepeat="
                      onInputEvent({
                        key: 'RIGHT',
                        type: 'REPEAT'
                      })
                      " :keys="['ArrowRight', 'KeyD']" />
              <FlipperKeypadButton class="dpad__bottom" icon="flipper:control-triangle"
                iconHover="flipper:control-triangle-hover" iconActive="flipper:control-triangle-down" size="32px"
                @onLongPress="
                  onInputEvent({
                    key: 'DOWN',
                    type: 'LONG'
                  })
                  " @onShortPress="
                    onInputEvent({
                      key: 'DOWN',
                      type: 'SHORT'
                    })
                    " @onRepeat="
                      onInputEvent({
                        key: 'DOWN',
                        type: 'REPEAT'
                      })
                      " :keys="['ArrowDown', 'KeyS']" />
              <FlipperKeypadButton class="dpad__left" icon="flipper:control-triangle"
                iconHover="flipper:control-triangle-hover" iconActive="flipper:control-triangle-down" size="32px"
                @onLongPress="
                  onInputEvent({
                    key: 'LEFT',
                    type: 'LONG'
                  })
                  " @onShortPress="
                    onInputEvent({
                      key: 'LEFT',
                      type: 'SHORT'
                    })
                    " @onRepeat="
                      onInputEvent({
                        key: 'LEFT',
                        type: 'REPEAT'
                      })
                      " :keys="['ArrowLeft', 'KeyA']" />
              <FlipperKeypadButton class="dpad__center" icon="flipper:control-circle"
                iconHover="flipper:control-circle-hover" iconActive="flipper:control-circle-down" size="52px"
                @onLongPress="
                  onInputEvent({
                    key: 'OK',
                    type: 'LONG'
                  })
                  " @onShortPress="
                    onInputEvent({
                      key: 'OK',
                      type: 'SHORT'
                    })
                    " @onRepeat="
                      onInputEvent({
                        key: 'OK',
                        type: 'REPEAT'
                      })
                      " :keys="['Space', 'Enter']" />
            </div>
            <FlipperKeypadButton icon="flipper:control-back" iconHover="flipper:control-back-hover"
              iconActive="flipper:control-back-down" size="52px" @onLongPress="
                onInputEvent({
                  key: 'BACK',
                  type: 'LONG'
                })
                " @onShortPress="
                  onInputEvent({
                    key: 'BACK',
                    type: 'SHORT'
                  })
                  " @onRepeat="
                    onInputEvent({
                      key: 'BACK',
                      type: 'REPEAT'
                    })
                    " :keys="['Backspace']" />
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="items-end q-pa-md" align="between">
        <q-btn outline label="Back" icon="flipper:chevron-left" class="flippr" @click="hideDialog" v-close-popup />
        <q-btn outline label="Save screenshot" icon="flipper:save-symbolic" class="flippr" @click="saveImage()" />
        <div class="column items-end">
          <q-btn flat padding="sm" icon="flipper:info-big" class="flippr">
            <q-tooltip class="controlHelp" anchor="bottom right" self="top right" :offset="[16, 20]"
              style="border: 1px solid #662c00; background: #210f00">
              <q-icon name="flipper:steaming-help-mac" style="width: 207px; height: 102px" />
            </q-tooltip>
          </q-btn>
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from 'vue'
import { exportFile } from 'quasar'
import type { QCard } from 'quasar'
import { FlipperKeypadButton } from 'entity/Flipper'
import { FlipperModel } from 'entity/Flipper'
const flipperStore = FlipperModel.useFlipperStore()

import { logger } from 'shared/lib/utils/useLog'
import { rpcErrorHandler } from 'shared/lib/utils/useRpcUtils'
import { showNotif } from 'shared/lib/utils/useShowNotif'

import { FlipperFrameRenderer } from 'shared/lib/flipperJs'

const componentName = 'ExpandView'

const orientation = ref(0)
const screenScale = ref(4)
const rotationCalculation = computed(() => {
  switch (orientation.value) {
    case 1:
      return 2

    case 2:
      return 1

    case 3:
      return 3

    default:
      return 0
  }
})

const scaleCalculation = computed(() => {
  switch (orientation.value) {
    case 2:
      return 0.5

    case 3:
      return 0.5

    default:
      return 1
  }
})

const onInputEvent = ({ key, type }: FlipperModel.InputEvent) => {
  flipperStore.flipper
    ?.RPC('guiSendInputEvent', { key, type: 'PRESS' })
    .catch((error: Error) =>
      rpcErrorHandler({ componentName, error, command: 'guiSendInputEvent' })
    )

  flipperStore.flipper
    ?.RPC('guiSendInputEvent', { key, type })
    .catch((error: Error) =>
      rpcErrorHandler({ componentName, error, command: 'guiSendInputEvent' })
    )

  flipperStore.flipper
    ?.RPC('guiSendInputEvent', { key, type: 'RELEASE' })
    .catch((error: Error) =>
      rpcErrorHandler({ componentName, error, command: 'guiSendInputEvent' })
    )
}

const screenStreamExpandCanvas = ref<HTMLCanvasElement>()
const frameRenderer = ref<FlipperFrameRenderer>()
defineExpose({
  screenStreamExpandCanvas
})

const saveImage = (isClipboard = false) => {
  if (screenStreamExpandCanvas.value) {
    screenStreamExpandCanvas.value.toBlob(
      async (blob) => {
        if (blob) {
          if (isClipboard) {
            const clipboardItem = new ClipboardItem({ 'image/png': blob })
            await navigator.clipboard.write([clipboardItem])

            showNotif({
              message: 'Flipper screen copied to clipboard',
              color: 'info',
              timeout: 500
            })
          } else {
            exportFile(`Screenshot-${new Date().toISOString()}.png`, blob)
          }
        }
      },
      'image/png',
      1
    )
  }
}

const expandViewCard = ref<QCard>()
const gridBackground = ref<HTMLCanvasElement>()
const resizeCanvas = () => {
  if (gridBackground.value && expandViewCard.value) {
    const QCardDOMRect =
      expandViewCard.value.$el.getBoundingClientRect() as DOMRect

    const width = (gridBackground.value.width = QCardDOMRect.width)
    const height = (gridBackground.value.height = QCardDOMRect.height)

    // const numCells = 40
    // const cellSize = width / numCells
    const cellSize = 35

    const ctx = gridBackground.value.getContext('2d')

    if (ctx) {
      ctx.strokeStyle = '#aa5115'
      ctx.lineWidth = 2

      for (let yPos = cellSize; yPos < height; yPos += cellSize) {
        const pos = Math.floor(yPos)
        ctx.moveTo(0, pos)
        ctx.lineTo(width, pos)
      }

      for (let xPos = cellSize; xPos < width; xPos += cellSize) {
        const pos = Math.floor(xPos)
        ctx.moveTo(pos, 0)
        ctx.lineTo(pos, height)
      }

      ctx.stroke()
    }
  }
}

const copyToClipboard = (event: KeyboardEvent) => {
  if (event.metaKey && event.code === 'KeyC') {
    saveImage(true)
  }
}

const unbindFrame = ref()
const startScreenStreamFrame = () => {
  if (flipperStore.flipper) {
    unbindFrame.value = flipperStore.flipper.emitter.on(
      'screenStream/frame',
      (data: Uint8Array, frameOrientation: string) => {
        orientation.value = Number(frameOrientation)

        if (screenStreamExpandCanvas.value) {
          if (frameRenderer.value) {
            frameRenderer.value.renderFrame({
              data,
              scale: screenScale.value
            })
          }
        }
      }
    )
  }
}

const startScreenStream = async () => {
  await flipperStore
    .startScreenStream()
    .then(() => {
      logger.debug({
        context: componentName,
        message: 'guiStartScreenStream: OK'
      })

      startScreenStreamFrame()
    })
    .catch((error: Error) => {
      rpcErrorHandler({
        componentName,
        error,
        command: 'guiStartScreenStream'
      })
    })
}
const stopScreenStream = async () => {
  await flipperStore
    .stopScreenStream()
    .then(() => {
      logger.debug({
        context: componentName,
        message: 'guiStopScreenStream: OK'
      })
    })
    .catch((error: Error) => {
      rpcErrorHandler({
        componentName,
        error,
        command: 'guiStopScreenStream'
      })
    })
    .finally(() => {
      flipperStore.expandView = false
    })
}

watch(
  () => flipperStore.flipperReady,
  async (newValue) => {
    if (!newValue) {
      if (flipperStore.isScreenStream) {
        await stopScreenStream()
      } else {
        flipperStore.expandView = false
      }
    }
  }
)

const showDialog = async () => {
  if (screenStreamExpandCanvas.value) {
    frameRenderer.value = new FlipperFrameRenderer(
      screenStreamExpandCanvas.value,
      128 * screenScale.value,
      64 * screenScale.value
    )

    if (flipperStore.flipper?.frameData) {
      frameRenderer.value.renderFrame({
        data: flipperStore.flipper.frameData,
        scale: screenScale.value
      })
    }
  }

  if (flipperStore.flipperReady) {
    if (flipperStore.rpcActive) {
      if (!flipperStore.isScreenStream) {
        await startScreenStream()
      } else {
        startScreenStreamFrame()
      }
    }
  }

  await nextTick()
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('keydown', copyToClipboard)
}

const hideDialog = () => {
  if (!flipperStore.pageWithScreenStream) {
    stopScreenStream()
  }

  if (unbindFrame.value) {
    unbindFrame.value()
  }

  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('keydown', copyToClipboard)
}
</script>

<style lang="scss" scoped>
@import 'styles';

.flippr {
  color: #ff8200;
}
</style>
