<template>
  <q-item
    :disable="
      flipperStore.flags.disableButtonMultiflipper ||
      flipperStore.flags.disableNavigation
    "
    clickable
    @click="onSwitchFlipper"
  >
    <q-item-section avatar class="items-center">
      <q-avatar size="md" square>
        <q-icon name="flipper:switch" size="32px" />
        <q-badge
          v-if="countFlippers > 1"
          color="primary"
          floating
          style="top: 0px; right: -4px; font-size: 9px; padding: 1px 4.5px"
          :label="countFlippers"
        />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>My Flippers</q-item-label>
    </q-item-section>
  </q-item>

  <q-dialog v-model="flipperStore.dialogs.multiflipper">
    <q-card class="rounded-borders">
      <q-card-section class="row items-center" style="min-width: 350px">
        <q-list class="q-gutter-y-md full-width">
          <template
            v-for="flipper in flipperStore.availableFlippers"
            :key="flipper.info.hardware.name"
          >
            <q-item
              class="row rounded-borders"
              :style="`${
                flipperStore.flipperName === flipper.name
                  ? 'border: 2px solid ' + getCssVar('primary')
                  : ''
              }`"
              :active="flipperStore.flipperName === flipper.name"
              :clickable="flipperStore.flipperName !== flipper.name"
              @click="connectFlipper(flipper)"
              v-close-popup
            >
              <q-item-section class="col-5">
                <img
                  src="~assets/flipper_white.svg"
                  style="width: 100%"
                />
              </q-item-section>
              <q-item-section class="col-5 q-pl-md">
                <div>
                  <div class="text-h6">
                    {{ flipper.info?.hardware.name }}
                  </div>
                  <div class="text-caption">
                    Firmware
                    {{ firmwareVersion(flipper) }}
                  </div>
                </div>
              </q-item-section>
              <q-item-section class="col-2">
                <!-- v-if="
                    flipperStore.info?.hardware?.uid ===
                    flipper.info?.hardware.uid
                  " -->
                <q-icon
                  v-if="flipperStore.flipperName === flipper.name"
                  color="primary"
                  name="mdi-check-circle-outline"
                  size="md"
                />
              </q-item-section>
            </q-item>
          </template>

          <template
            v-for="flipper in flipperStore.availableDfuFlippers"
            :key="flipper.name"
          >
            <FlipperDfuItem :flipper>
              <template #default="{ flipper }">
                <q-btn
                  unelevated
                  dense
                  color="primary"
                  label="Repair"
                  @click="flipperStore.recovery(flipper.info)"
                />
              </template>
            </FlipperDfuItem>
          </template>

          <q-item
            v-if="
              !flipperStore.availableFlippers?.length &&
              !flipperStore.availableDfuFlippers?.length
            "
            class="row rounded-borders"
          >
            <q-item-section class="col-5">
              <img
                src="~assets/flipper_white.svg"
                style="width: 100%; filter: opacity(0.3)"
              />
            </q-item-section>
            <q-item-section class="col-7 q-pl-md">
              <div>
                <div class="text-h6">Waiting for connection...</div>
                <div class="text-caption">Your Flippers will appear here</div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <!-- <div
          v-if="flipperStore.flags.loadingMultiflipper"
          class="row items-center full-width"
        >
          <Loading
            class="col"
            label="Reading Flippers..."
          />
        </div> -->
      </q-card-section>
      <!-- <q-card-section align="center">
        <q-btn unelevated color="primary" label="Repair" @click="recovery"/>
      </q-card-section> -->
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCssVar } from 'quasar'

import { FlipperModel, FlipperDfuItem } from 'entity/Flipper'
const flipperStore = FlipperModel.useFlipperStore()

const onSwitchFlipper = async () => {
  flipperStore.dialogs.multiflipper = true
  // await mainStore.start()
}

const connectFlipper = (flipper: FlipperModel.DataFlipperElectron) => {
  // flipper.readingMode.type = route.name === 'Cli' ? 'cli' : 'rpc'
  /* else {
    flipper.mode = route.name === 'Cli' ? 'cli' : 'rpc'
  } */
  flipperStore.connectFlipper(flipper)
}

const countFlippers = computed(
  () =>
    flipperStore.availableFlippers.length +
    flipperStore.availableDfuFlippers.length
)

const firmwareVersion = (flipper: FlipperModel.DataFlipperElectron) => {
  console.log(flipper)
  if (flipper.info?.firmware.branch === 'dev') {
    return `Dev ${flipper.info?.firmware.commit}`
  }
  return flipper.info?.firmware.version
}
</script>
