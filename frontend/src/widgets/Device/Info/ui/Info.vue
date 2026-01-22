<template>
    <div class="full-width" style="max-width: 700px">
        <template v-if="!flipperStore.loadingInfo">
            <template v-if="flipperStore.info">
                <div class="column items-center full-width">
                    <FlipperBody class="q-mb-xl" ref="refFlipperBody" v-bind="flipperBody"
                        :showScreenUpdating="flipperStore.flags.updateInProgress"
                        :isScreenStream="flipperStore.isScreenStream" :orientation="orientation"
                        @expandView="expandView" />
                    <div class="q-mb-md q-mt-sm full-width" :class="{
                        'row items-start': $q.screen.gt.xs,
                        'column items-center': $q.screen.lt.sm
                    }">
                        <div class="col" :class="{
                            'q-mr-xl': $q.screen.gt.xs,
                            'full-width q-mb-md': $q.screen.lt.sm
                        }">
                            <FlipperDetailInfo />
                            <FlipperInfo class="q-px-xs q-pr-sm" v-bind="info" />
                        </div>
                        <div class="col" :class="{
                            'full-height': $q.screen.gt.xs,
                            'full-width': $q.screen.lt.sm
                        }">
                            <FlipperUpdate @updateInProgress="stopScreenStream" />
                        </div>
                    </div>
                </div>
            </template>
        </template>
        <template v-else>
            <div class="row justify-center q-my-md">
                <Loading label="Loading info..." />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { logger } from 'shared/lib/utils/useLog';
import { rpcErrorHandler } from 'shared/lib/utils/useRpcUtils';

import { Loading } from 'shared/components/Loading';
import { FlipperUpdate, FlipperDetailInfo } from 'features/Flipper';
import { FlipperBody, FlipperInfo, FlipperModel } from 'entity/Flipper';
const flipperStore = FlipperModel.useFlipperStore();

flipperStore.pageWithScreenStream = true;

import { bytesToSize } from 'shared/lib/utils/bytesToSize';
import { FlipperFrameRenderer } from 'shared/lib/flipperJs';

const componentName = 'DeviceInfo';

const sdCardUsage = computed(() => {
    if (
        flipperStore.info?.storage.sdcard?.totalSpace &&
        flipperStore.info?.storage.sdcard?.freeSpace
    ) {
        return `${bytesToSize(
            flipperStore.info?.storage.sdcard?.totalSpace -
            flipperStore.info?.storage.sdcard?.freeSpace
        )} / ${bytesToSize(flipperStore.info?.storage.sdcard?.totalSpace)}`;
    }

    return 'No SD card';
});

const hardwareVersion = computed(() => (
    flipperStore.info?.hardware.ver +
    '.F' +
    flipperStore.info?.hardware.target +
    'B' +
    flipperStore.info?.hardware.body +
    'C' +
    flipperStore.info?.hardware.connect
));

const radioVersion = computed(() => flipperStore.info?.radio.alive !== 'false'
    ? (flipperStore.info?.radio.stack.major + '.' + flipperStore.info?.radio.stack.minor + '.' + flipperStore.info?.radio.stack.sub)
    : 'corrupt'
);

const info = ref({
    firmwareVersion: computed(() => {
        if (flipperStore.info?.firmware.branch.name === 'dev') return `Dev ${flipperStore.info?.firmware.commit.hash}`;
        return flipperStore.info?.firmware.version;
    }),
    buildDate: computed(() => flipperStore.info?.firmware.build.date),
    sdCardUsage: computed(() => sdCardUsage.value),
    databaseStatus: computed(() => flipperStore.info?.storage.databases?.status),
    hardwareVersion: computed(() => hardwareVersion.value),
    radioVersion: computed(() => radioVersion.value),
    radioStackType: computed(() => flipperStore.info?.radio.stack.type)
});

const flipperBody = ref({
    flipperName: computed(() => flipperStore.info?.hardware.name),
    flipperColor: computed(() => flipperStore.info?.hardware.color)
});

const refFlipperBody = ref<typeof FlipperBody>();
const screenStreamCanvas = computed<HTMLCanvasElement>(() => refFlipperBody.value?.screenStreamCanvas);
const frameRenderer = ref<FlipperFrameRenderer>();

const expandView = async () => flipperStore.expandView = true;

const unbindFrame = ref();
const orientation = ref(0);

const startScreenStream = async () => await flipperStore.startScreenStream()
    .then(() => {
        logger.debug({
            context: componentName,
            message: 'guiStartScreenStream: OK'
        });

        unbindFrame.value = flipperStore.flipper?.emitter.on(
            'screenStream/frame',
            (data: Uint8Array, frameOrientation: string) => {
                orientation.value = Number(frameOrientation);

                if (screenStreamCanvas.value) {
                    if (frameRenderer.value) frameRenderer.value.renderFrame({ data });
                }
            }
        );
    })
    .catch((error: Error) => rpcErrorHandler({
        componentName,
        error,
        command: 'guiStartScreenStream'
    }));

const stopScreenStream = async () => await flipperStore.stopScreenStream()
    .then(() => {
        logger.debug({
            context: componentName,
            message: 'guiStopScreenStream: OK'
        });

        if (unbindFrame.value) unbindFrame.value();
    })
    .catch((error: Error) => rpcErrorHandler({
        componentName,
        error,
        command: 'guiStopScreenStream'
    }));

onMounted(async () => {
    if (flipperStore.flipperReady) {
        if (!flipperStore.rpcActive) await flipperStore.flipper?.startRPCSession();

        if (!flipperStore.info) await flipperStore.flipper?.getInfo();

        if (flipperStore.rpcActive) {
            if (!flipperStore.isScreenStream) await startScreenStream();
        }
    }

    if (screenStreamCanvas.value) {
        frameRenderer.value = new FlipperFrameRenderer(screenStreamCanvas.value);

        if (flipperStore.flipper?.frameData) frameRenderer.value.renderFrame({
            data: flipperStore.flipper.frameData
        });
    }
})

watch(() => flipperStore.flipperReady, async (newValue) => {
    if (newValue) {
        if (!flipperStore.isScreenStream) await startScreenStream();
    }
});

watch(() => flipperStore.flags.updateInProgress, async (newValue) => {
    if (!newValue) nextTick(() => {
        frameRenderer.value = new FlipperFrameRenderer(screenStreamCanvas.value);
    });
});

onBeforeUnmount(async () => {
    if (!flipperStore.flags.switchFlipper) await stopScreenStream().catch(console.error);

    flipperStore.pageWithScreenStream = false;
});
</script>
