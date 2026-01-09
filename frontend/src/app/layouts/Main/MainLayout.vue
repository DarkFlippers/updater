<template>
  <q-layout view="hhh LpR fff">
    <AppHeader
      v-if="!flipperStore.isElectron"
      @toggleLeftDrawer="toggleLeftDrawer"
    />

    <AppDrawer v-model="leftDrawerOpen" />

    <q-page-container>
      <template
        v-if="
          route.meta.canLoadWithoutFlipper ||
          flipperStore.flipperReady ||
          flipperStore.flags.switchFlipper ||
          flipperStore.flags.updateInProgress
        "
      >
        <template v-if="flipperStore.flags.switchFlipper">
          <q-page class="flex flex-center" padding>
            <Loading label="Switching Flipper..." />
          </q-page>
        </template>
        <template v-else-if="flipperStore.loadingInfo">
          <q-page class="flex flex-center" padding>
            <Loading label="Loading info..." />
          </q-page>
        </template>
        <template v-else>
          <router-view />
        </template>
      </template>
      <template v-else-if="flipperStore.isElectron">
        <q-page class="flex flex-center fit" padding>
          <q-card flat>
            <q-card-section class="q-pa-none q-ma-md" align="center">
              <template
                v-if="
                  !flipperStore.flags.isBridgeReady ||
                  flipperStore.flags.flipperIsInitialized
                "
              >
                <Loading label="Flipper is initialized..." />
              </template>
              <template v-else-if="flipperStore.availableDfuFlippers.length">
                <q-list class="q-gutter-y-md full-width">
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
                </q-list>
              </template>
              <template v-else>
                <q-img
                  src="~assets/flipper_alert.svg"
                  width="70px"
                  no-spinner
                />
                <div class="text-h6 q-my-sm">Flipper not connected</div>
              </template>
            </q-card-section>
          </q-card>
        </q-page>
      </template>
      <template v-else>
        <q-page class="flex flex-center fit" padding>
          <FlipperConnectWebBtn />
        </q-page>
      </template>

      <q-dialog v-model="flipperStore.dialogs.microSDcardMissing">
        <FlipperMicroSDCard
          isDialog
          :showFindMicroSdBtn="flipperStore.isElectron"
          @onFindMicroSd="flipperStore.findMicroSd"
        />
      </q-dialog>

      <FlipperConnectFlipperDialog
        v-model="flipperStore.dialogs.connectFlipper"
      >
        <template v-slot:description>
          <template v-if="flipperStore.isElectron">
            <p>Plug in your Flipper and and wait for initialization</p>
          </template>
          <template v-else>
            <p>Plug in your Flipper and click the button below</p>
          </template>
        </template>
        <template v-slot:default>
          <template v-if="!flipperStore.isElectron">
            <FlipperConnectWebBtn />
          </template>
        </template>
      </FlipperConnectFlipperDialog>
      <FlipperMobileDetectedDialog
        v-model="flipperStore.dialogs.mobileDetected"
      />
      <FlipperUnsupportedBrowserDialog
        v-model="flipperStore.dialogs.serialUnsupported"
      />
      <q-dialog v-model="flipperStore.dialogs.logs">
        <FlipperLogCard isDialog />
      </q-dialog>
      <FlipperDownloadPathDialog v-model="flipperStore.dialogs.downloadPath" />
      <FlipperRecoveryDialog
        v-model="flipperStore.dialogs.recovery"
        :persistent="
          flipperStore.flags.recovering && !flipperStore.recoveryError
        "
        @hide="flipperStore.resetRecovery(true)"
      />
      <FlipperBusyDialog v-model="flipperStore.flags.flipperIsBusy">
        <q-btn
          @click="goToDeviceControl"
          label="Go to Device Control"
          color="primary"
          outline
          no-caps
          v-close-popup
        />
      </FlipperBusyDialog>

      <FlipperExpandView v-model="flipperStore.expandView" />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

import { AppHeader, AppDrawer } from './components';
import { Loading } from 'shared/components/Loading';

import { FlipperMicroSDCard, FlipperConnectFlipperDialog, FlipperMobileDetectedDialog, FlipperUnsupportedBrowserDialog, FlipperDownloadPathDialog, FlipperRecoveryDialog, FlipperBusyDialog, FlipperDfuItem } from 'entity/Flipper';
import { FlipperConnectWebBtn, FlipperLogCard, FlipperExpandView } from 'features/Flipper';
import { FlipperModel } from 'entity/Flipper';
const flipperStore = FlipperModel.useFlipperStore();

defineOptions({ name: 'MainLayout' });

const leftDrawerOpen = ref(false);
const toggleLeftDrawer = () => leftDrawerOpen.value = !leftDrawerOpen.value;

onMounted(async () => {
    if (localStorage.getItem('autoReconnect') !== 'false') flipperStore.flags.autoReconnect = true;
    else flipperStore.flags.autoReconnect = false;

    if (!flipperStore.isElectron && flipperStore.flags.autoReconnect) flipperStore.onAutoReconnect();
});

const goToDeviceControl = () => {
    flipperStore.expandView = true;
    router.push({ name: 'Device' });
}
</script>
