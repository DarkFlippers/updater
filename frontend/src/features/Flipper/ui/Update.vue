<template>
    <div class="column flex-center text-center">
        <div class="flex justify-between items-center full-width q-mt-xs q-pb-md">
            <p class="q-mb-none text-bold text-body1" style="color: white;">Firmware Update</p>
            <q-btn v-if="fwModel.changelog.trim().length" @click="
                () => {
                    changelogDialog = true
                }
            " outline color="white" size="sm" padding="xs md" label="What's New" icon="mdi-information-outline"
                no-caps />
        </div>
        <template v-if="ableToUpdate && flipperStore.info?.storage.sdcard?.status">
            <p style="color: white;" v-if="getChannel('custom')">
                Detected custom firmware
                <b v-if="getChannel('custom')!.title !== 'Custom'">
                    "{{ getChannel('custom')!.title }}"
                </b>
                <span v-if="!isTgzCustomFile || !isTargetCustomFile"> with </span>
                <span v-if="!isTgzCustomFile"> <b>unsupported</b> filetype </span>
                <span v-if="!isTgzCustomFile && !isTargetCustomFile"> and </span>
                <span v-if="!isTargetCustomFile"> <b>unsupported</b> target </span>
            </p>
            <div class="column full-width">
                <div class="flex no-wrap justify-between items-center">
                    <p class="q-mb-none" style="color: white;">Update Channel</p>
                    <q-select v-model="fwModel" :options="Object.values(fwOptions)" borderless dense
                        :disable="flipperStore.flags.updateInProgress">
                        <!-- :style="!$q.screen.xs ? 'width: 320px;' : 'width: 290px;'" -->
                        <template v-slot:selected>
                            <p class="q-mb-none" :class="`text-${fwModel.color}`">
                                {{ fwModel.label }}
                                {{ fwModel.version }}
                            </p>
                        </template>

                        <template v-slot:option="scope">
                            <q-item style="background: #151515;" v-bind="scope.itemProps">
                                <q-item-section class="items-start q-mr-md">
                                    <q-item-label style="color: white;">{{ scope.opt.selectLabel }}</q-item-label>
                                    <q-item-label style="color: white;" class="text-no-wrap" caption>{{
                                        scope.opt.selectDescription }}</q-item-label>
                                </q-item-section>
                                <q-item-section class="items-end">
                                    <q-chip :color="scope.opt.color" text-color="white" :label="scope.opt.version" />
                                </q-item-section>
                            </q-item>
                        </template>
                    </q-select>
                </div>
                <div class="flex no-wrap justify-between items-center">
                    <p class="q-mb-none" style="color: white;">Firmware pack</p>
                    <q-select v-model="fwPack" :options="Object.values(fwPacks)" borderless dense
                        :disable="flipperStore.flags.updateInProgress">

                        <template v-slot:selected>
                            <p class="q-mb-none" style="color: white;">{{ fwPack.label }}</p>
                        </template>

                        <template v-slot:option="scope">
                            <q-item style="background: #151515;" v-bind="scope.itemProps">
                                <q-item-section class="items-start q-mr-md">
                                    <q-item-label style="color: white;">{{ scope.opt.label }}</q-item-label>
                                    <q-item-label style="color: white;" class="text-no-wrap" caption>{{
                                        scope.opt.selectDescription
                                        }}</q-item-label>
                                </q-item-section>
                            </q-item>
                        </template>
                    </q-select>
                </div>
                <div class="flex center">
                    <template v-if="!flipperStore.flags.updateInProgress">
                        <q-btn v-if="fwModel" @click="update()" class="full-width q-mt-sm text-pixelated text-h5"
                            unelevated color="positive" padding="12px 30px">Install</q-btn>
                    </template>
                    <template v-else>
                        <div class="column flex-center text-center full-width">
                            <p style="color: white;">{{ updateStage }}</p>
                            <q-btn v-if="updateError" outline class="q-mt-md" @click="cancelUpdate()">Cancel</q-btn>
                            <ProgressBar v-else-if="write.filename.length > 0" class="full-width"
                                :title="write.filename" :progress="write.progress" color="positive" trackColor="green-4"
                                size="56px" interpolated />
                        </div>
                    </template>
                </div>
            </div>
            <q-btn v-if="installFromFile" @click="
                () => {
                    uploadPopup = true
                    uploadedFile = undefined
                }
            " :disable="flipperStore.flags.updateInProgress" class="q-mt-lg" outline color="grey-8">
                Install from file
            </q-btn>
        </template>
        <template v-else>
            <div class="flex center" style="color: white;">
                <span v-if="flipperStore.info?.storage.sdcard?.status">Your firmware doesn't support self-update.
                    Install latest release
                    using <b>repair mode</b>.</span>
                <span v-else>Self-update is impossible without an SD card.</span>
            </div>
        </template>

        <q-dialog v-model="uploadPopup">
            <q-card>
                <q-card-section class="q-pt-none">
                    <q-file outlined v-model="uploadedFile" label="Drop or select files" accept=".tgz" class="q-pt-md"
                        :style="$q.screen.width > 380 ? 'width: 300px;' : ''">
                        <template v-slot:prepend>
                            <q-icon name="file_upload"></q-icon>
                        </template>
                    </q-file>
                </q-card-section>

                <q-card-actions align="right">
                    <q-btn flat label="Upload" v-close-popup @click="update(true)"></q-btn>
                    <q-btn flat label="Cancel" color="negative" v-close-popup></q-btn>
                </q-card-actions>
            </q-card>
        </q-dialog>

        <q-dialog v-model="changelogDialog" class="dialog-wide">
            <q-layout view="HHH lpr FFF" container class="bg-white">
                <q-header class="column flex-center q-py-sm bg-white text-black" reveal>
                    <p class="q-mb-none text-h5 text-bold">What's New</p>
                    <p class="q-mb-none" :class="`text-${fwModel.color}`">
                        {{ fwModel.label }}
                        {{ fwModel.version }}
                    </p>
                </q-header>
                <q-page-container>
                    <q-page padding>
                        <q-markdown no-heading-anchor-links no-linkify no-typographer :src="fwModel.changelog" />
                    </q-page>
                </q-page-container>
                <q-footer class="bg-transparent">
                    <q-btn class="full-width q-mt-sm text-pixelated text-h5" v-close-popup @click="update()"
                        :disable="flipperStore.flags.updateInProgress" color="positive" padding="12px 30px"
                        unelevated>Install</q-btn>
                </q-footer>
            </q-layout>
        </q-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import asyncSleep from 'simple-async-sleep';

import { unpack } from 'shared/lib/utils/operation';

import { showNotif } from 'shared/lib/utils/useShowNotif';
import { logger } from 'shared/lib/utils/useLog';
import { rpcErrorHandler } from 'shared/lib/utils/useRpcUtils';
import { replaceGitHubLinksInMarkdown } from 'shared/lib/utils/useFormatUrl';

import { ProgressBar } from 'shared/components/ProgressBar';
import { FlipperModel, FlipperApi } from 'entity/Flipper';
const flipperStore = FlipperModel.useFlipperStore();
const { fetchChannels, fetchFirmware } = FlipperApi;

const componentName = 'FlipperUpdate';

const ableToUpdate = ref(true);

const installFromFile = ref(true);
const uploadedFile = ref<File>();
const uploadPopup = ref(false);
const changelogDialog = ref(false);

const updateError = ref(false);

const channels = ref<FlipperModel.Channel[]>([]);
const getChannel = (channelId: string) => channels.value.length
    ? channels.value.find(channel => channel.id === channelId)
    : undefined;
const isTgzCustomFile = ref(false);
const isTargetCustomFile = ref(false);

const fwOptions = ref<FlipperModel.FwOptions>({
    release: {
        label: 'Release',
        selectLabel: 'Release',
        selectDescription: 'Stable release (recommended)',
        value: 'release',
        version: '',
        changelog: '',
        color: 'positive'
    },
    dev: {
        label: 'Dev',
        selectLabel: 'Development',
        selectDescription: 'Pre release builds, might contain bugs',
        value: 'development',
        version: '',
        changelog: '',
        color: 'negative'
    }
});
const fwModel = ref(fwOptions.value.release);

const fwPacks = ref({
    default: {
        label: "Default",
        selectDescription: "Base pack",
        value: "default"
    },
    clean: {
        label: "Clean",
        selectDescription: "No apps",
        value: "c"
    },
    extra: {
        label: "Extra",
        selectDescription: "Base + extra apps",
        value: "e"
    }
})
const fwPack = ref(fwPacks.value.default);
const DONT_RUN_UPDATE_ON_FLIPPER = ref(false);

const emit = defineEmits<{ (event: 'updateInProgress'): Promise<void> }>();

onMounted(async () => {
    channels.value = await fetchChannels().catch((error) => {
        showNotif({
            message: 'Unable to load firmware channels from the build server.',
            color: 'negative',
            actions: [
                {
                    label: 'Reload',
                    color: 'white',
                    handler: () => location.reload()
                }
            ]
        });
        logger.error({
            context: componentName,
            message: 'failed to fetch update channels'
        });
        throw error;
    });

    if (channels.value.length) {
        fwOptions.value.release.version = getChannel('release')?.versions[0]!.version || '';
        //fwOptions.value.rc.version = getChannel('release-candidate')?.versions[0]!.version || '';
        //fwOptions.value.dev.version = getChannel('development')?.versions[0]!.version || '';

        const firstVersion = getChannel('development')?.versions?.[0];
        const updateFile = firstVersion?.files?.find(i => i.type === "update_tgz");

        let version = "";

        if (updateFile?.url && typeof updateFile.url === "string") {
            const match = updateFile.url.match(/update-(\d+)\.tgz$/);
            if (match) version = match[1]!;
        }

        if (!version && firstVersion?.version) version = firstVersion.version;

        fwOptions.value.dev.version = version;

        fwOptions.value.release.changelog = replaceGitHubLinksInMarkdown(getChannel('release')?.versions[0]!.changelog || '');
        //fwOptions.value.rc.changelog = replaceGitHubLinksInMarkdown(getChannel('release-candidate')?.versions[0]!.changelog || '');
        fwOptions.value.dev.changelog = replaceGitHubLinksInMarkdown(getChannel('development')?.versions[0]!.changelog || '');

        const customChannel = getChannel('custom');
        const customFile = customChannel?.versions[0]?.files.find(_file => _file.url.endsWith('tgz'));
        if (customFile) {
            isTgzCustomFile.value = true;

            if (customFile.target === flipperStore.target) isTargetCustomFile.value = true;
            else isTargetCustomFile.value = false;
        }
        else isTgzCustomFile.value = false;
        if (customChannel && customFile && isTgzCustomFile.value && isTargetCustomFile.value) {
            fwOptions.value.custom = {
                label: customChannel.title,
                selectLabel: customChannel.title,
                selectDescription: '',
                value: 'custom',
                version: customChannel.versions[0]!.version,
                changelog: '',
                color: 'dark'
            }

            fwModel.value = fwOptions.value.custom;
        }
    }
});

const update = async (fromFile = false) => {
    updateStage.value = '';

    if (!flipperStore.info?.storage.sdcard?.status.isInstalled) {
        flipperStore.dialogs.microSDcardMissing = true;
        return;
    }

    flipperStore.onUpdateStage('start');

    if (fromFile) {
        if (!uploadedFile.value) {
            updateError.value = true;
            flipperStore.onUpdateStage('end');
            updateStage.value = 'No file selected';
            throw new Error(updateStage.value);
        } else if (!uploadedFile.value.name.endsWith('.tgz')) {
            updateError.value = true;
            flipperStore.onUpdateStage('end');
            updateStage.value = 'Wrong file format';
            throw new Error(updateStage.value);
        }
        logger.info({
            context: componentName,
            message: 'Uploading firmware from file'
        });
    }

    await emit('updateInProgress');
    await loadFirmware().catch((error: Error) => {
        updateError.value = true;
        updateStage.value = error.message || error.toString();

        flipperStore.onUpdateStage('end');

        throw error;
    });
}

const updateStage = ref('');
const write = ref({
    filename: '',
    progress: 0
});
const loadFirmware = async () => {
    updateStage.value = 'Loading firmware bundle...';
    if (updateError.value) return;

    const channel = getChannel(fwModel.value.value);
    const pack = fwPack.value

    if (uploadedFile.value || channel) {
        let files;
        if (uploadedFile.value) {
            const buffer = await uploadedFile.value.arrayBuffer()
            files = await unpack(buffer).then((value: object) => {
                logger.debug({
                    context: componentName,
                    message: 'Unpacked firmware'
                });
                return value;
            });
        } else {
            //const file = channel?.versions[0]!.files.find(_file => _file.target === flipperStore.target && _file.type === 'update_tgz');
            let file = null;
            const defaultFile = channel?.versions?.[0]?.files?.find(_file => _file.target === flipperStore.target && _file.type === 'update_tgz');
            if (pack.value === 'default') file = defaultFile;
            else {
                file = {
                    url: `https://unleashedflip.com/fw_extra_apps/flipper-z-${flipperStore.target}-update-${fwModel.value.version}${pack.value}.tgz`
                }
            }
            if (!file?.url && defaultFile) file = defaultFile;

            if (file) {
                files = await fetchFirmware(file.url).then((value) => {
                    logger.debug({
                        context: componentName,
                        message: `Downloaded firmware from ${file.url}`
                    });
                    return value;
                }).catch((error: Error) => {
                    updateError.value = true;
                    updateStage.value = error.toString();
                    showNotif({
                        message: 'Failed to fetch firmware: ' + error.toString(),
                        color: 'negative',
                        actions: [
                            {
                                label: 'Reload',
                                color: 'white',
                                handler: () => location.reload()
                            }
                        ]
                    });

                    const message = `${componentName}: Failed to fetch firmware: ${error.toString()}`;
                    logger.error({
                        context: componentName,
                        message
                    });
                    throw new Error(message);
                });
            }
        }

        updateStage.value = 'Loading firmware files';

        if (updateError.value) return;
        if (DONT_RUN_UPDATE_ON_FLIPPER.value) return cancelUpdate();

        let path = '/ext/update/';
        const updateDir = await flipperStore.flipper?.RPC('storageStat', { path: '/ext/update' }).catch(async (error: Error) => {
            if (error.toString() !== 'ERROR_STORAGE_NOT_EXIST') {
                const command = 'storageStat';
                rpcErrorHandler({ componentName, error, command });

                throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
            } else logger.debug({
                context: componentName,
                message: 'Storage /ext/update not exist'
            });
        });

        if (!updateDir) {
            await flipperStore.flipper?.RPC('storageMkdir', { path: '/ext/update' })
                .then(() => logger.debug({
                    context: componentName,
                    message: 'storageMkdir: /ext/update'
                })).catch((error: Error) => {
                    const command = 'storageMkdir';
                    rpcErrorHandler({ componentName, error, command });

                    throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
                });
        }

        for (const file of files) {
            if (updateError.value) return;
            if (file.size === 0) {
                path = '/ext/update/' + file.name;
                if (file.name.endsWith('/')) path = path.slice(0, -1);

                const updateVersionDir = await flipperStore.flipper?.RPC('storageStat', { path }).catch(async (error: Error) => {
                    if (error.toString() !== 'ERROR_STORAGE_NOT_EXIST') {
                        const command = 'storageStat';
                        rpcErrorHandler({ componentName, error, command });

                        throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
                    } else logger.debug({
                        context: componentName,
                        message: 'Storage /ext/update not exist'
                    });
                });

                if (!updateVersionDir) {
                    await flipperStore.flipper?.RPC('storageMkdir', { path }).then(() =>
                        logger.debug({
                            context: componentName,
                            message: `storageMkdir: ${path}`
                        })
                    ).catch((error: Error) => {
                        const command = 'storageMkdir';
                        rpcErrorHandler({ componentName, error, command });

                        throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
                    });
                }
            } else {
                write.value.filename = file.name.slice(file.name.lastIndexOf('/') + 1);
                const unbind = flipperStore.flipper?.emitter.on(
                    'storageWriteRequest/progress',
                    (e: { progress: number; total: number }) => {
                        if (!flipperStore.flipper?.connected) throw new Error(`Flipper ${flipperStore.flipper?.name} not connected`);

                        write.value.progress = e.progress / e.total;
                    }
                );
                await flipperStore.flipper?.RPC('storageWrite', {
                    path: '/ext/update/' + file.name,
                    buffer: file.buffer
                }).then(() =>
                    logger.debug({
                        context: componentName,
                        message: `storageWrite: /ext/update/${file.name}`
                    })
                ).catch((error: Error) => {
                    const command = 'storageWrite';
                    rpcErrorHandler({ componentName, error, command });

                    throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
                });

                if (unbind) unbind();
            }
            await asyncSleep(300);
        }

        write.value.filename = '';
        write.value.progress = 0;

        updateStage.value = 'Loading manifest...';

        if (updateError.value) return;

        await flipperStore.flipper?.RPC('systemUpdate', { path: path + '/update.fuf' }).then(() =>
            logger.debug({
                context: componentName,
                message: 'systemUpdate: OK'
            })
        ).catch((error: Error) => {
            const command = 'systemUpdate';
            rpcErrorHandler({ componentName, error, command });

            throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
        });

        updateStage.value = 'Update in progress, pay attention to your Flipper';
        await flipperStore.flipper?.RPC('systemReboot', { mode: 'UPDATE' }).catch((error: Error) => {
            const command = 'systemReboot';
            rpcErrorHandler({ componentName, error, command });

            throw new Error(`${componentName}: RPC error in command '${command}': ${error.toString()}`);
        });

        flipperStore.flags.waitForReconnect = true;
        flipperStore.flags.autoReconnect = true;
    } else {
        updateError.value = true;
        updateStage.value = 'Failed to fetch channel';

        showNotif({
            message: 'Unable to load firmware channel from the build server.',
            color: 'negative',
            actions: [
                {
                    label: 'Reload',
                    color: 'white',
                    handler: () => location.reload()
                }
            ]
        });
        throw new Error(updateStage.value);
    }
}

const cancelUpdate = () => {
    flipperStore.flags.waitForReconnect = false;
    flipperStore.flags.updateInProgress = false;
    updateError.value = false;
    updateStage.value = '';
    // reload()
}
</script>
<style>
.dialog-wide .q-dialog__inner>div {
    max-width: 960px;
    width: 100%;
}
</style>