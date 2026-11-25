<template>
  <q-dialog>
    <q-card
      class="dialog"
      style="width: 100%; max-width: min(calc(100vw - 16px), 1000px)"
    >
      <q-btn
        v-if="flipperStore.recoveryError"
        icon="close"
        flat
        round
        dense
        v-close-popup
        class="dialog-close-btn"
      />
      <q-card-section class="row items-center">
        <div class="text-h6">Repair</div>
      </q-card-section>
      <q-card-section class="row items-center">
        <template v-if="flipperStore.recoveryError">
          <p class="text-bold text-negative">
            {{ flipperStore.recoveryUpdateStage }}
          </p>
          <div class="full-width q-mb-md">
            <q-btn
              unelevated
              color="primary"
              label="Retry"
              @click="flipperStore.retry"
            />
          </div>
        </template>
        <template v-else>
          <p>{{ flipperStore.recoveryUpdateStage }}</p>
          <ProgressBar :progress="flipperStore.recoveryProgress" interpolated />
        </template>
        <q-expansion-item
          v-model="showRecoveryLog"
          class="full-width q-mt-md"
          icon="svguse:common-icons.svg#logs"
          label="View logs"
        >
          <div
            class="full-width bg-grey-12 text-black q-px-sm q-py-xs rounded-borders"
            style="height: 300px"
          >
            <q-scroll-area ref="scrollAreaRef" class="fit text-left">
              <code v-for="line in flipperStore.recoveryLogs" :key="line">
                {{ line }}
                <br />
              </code>
            </q-scroll-area>
          </div>
        </q-expansion-item>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { QScrollArea } from 'quasar'

import { ProgressBar } from 'shared/components/ProgressBar'
import { emitter as bridgeEmitter } from 'shared/lib/flipperJs/bridgeController'
import type { Unsubscribe } from 'nanoevents'

import { FlipperModel } from 'entity/Flipper'
const flipperStore = FlipperModel.useFlipperStore()

const showRecoveryLog = ref(false)

const scrollAreaRef = ref<QScrollArea>()
const unbindLogs = ref<Unsubscribe>()
const unbindStatus = ref<Unsubscribe>()

const unbinding = () => {
  if (unbindLogs.value) {
    unbindLogs.value()
  }

  if (unbindStatus.value) {
    unbindStatus.value()
  }
}

onMounted(() => {
  unbindLogs.value = bridgeEmitter.on('log', (stderr) => {
    const logLines = stderr.data.split('\n')
    logLines.pop()
    logLines.forEach(() => {
      if (scrollAreaRef.value) {
        scrollAreaRef.value.setScrollPercentage('vertical', 1)
      }
    })
  })

  unbindStatus.value = bridgeEmitter.on('status', async (status) => {
    if (status.error || status.finished) {
      unbinding()
    }
  })
})

onUnmounted(() => {
  unbinding()
})
</script>
