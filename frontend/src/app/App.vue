<template>
    <router-view />
</template>

<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { useQuasar } from 'quasar';

defineOptions({ name: 'App' });

type Icons = { [k: string]: string; }

const getPathToIcon = (file: string, path: string, viewBox?: string) => `svguse:/${file}.svg#${path}${viewBox ? '|' + viewBox : ''}`;

const myIcons: Icons = {
    'flipper:device': getPathToIcon('common-icons', 'device'),
    'flipper:delete': getPathToIcon('common-icons', 'delete'),
    'flipper:settings': getPathToIcon('common-icons', 'settings'),
    'flipper:switch': getPathToIcon('common-icons', 'switch'),
    'flipper:connect': getPathToIcon('common-icons', 'connect'),
    'flipper:connected': getPathToIcon('common-icons', 'connected'),
    'flipper:logs': getPathToIcon('common-icons', 'logs'),
    'flipper:info': getPathToIcon('common-icons', 'info'),
    'flipper:info-small': getPathToIcon('common-icons', 'info-small'),
    'flipper:info-big': getPathToIcon('common-icons', 'info-big'),
    'flipper:save-symbolic': getPathToIcon('common-icons', 'save-symbolic'),
    'flipper:chevron-left': getPathToIcon('common-icons', 'chevron-left'),
    'flipper:chevron-left-small': getPathToIcon('common-icons', 'chevron-left-small'),

    'flipper:control-back': getPathToIcon('controls', 'back'),
    'flipper:control-back-down': getPathToIcon('controls', 'back-down'),
    'flipper:control-back-hover': getPathToIcon('controls', 'back-hover'),
    'flipper:control-circle': getPathToIcon('controls', 'circle'),
    'flipper:control-circle-down': getPathToIcon('controls', 'circle-down'),
    'flipper:control-circle-hover': getPathToIcon('controls', 'circle-hover'),
    'flipper:control-triangle': getPathToIcon('controls', 'triangle'),
    'flipper:control-triangle-down': getPathToIcon('controls', 'triangle-down'),
    'flipper:control-triangle-hover': getPathToIcon('controls', 'triangle-hover'),

    'flipper:steaming-help': getPathToIcon('streaming-help', 'default', '0 0 207 102'),
    'flipper:steaming-help-mac': getPathToIcon('streaming-help', 'mac', '0 0 207 102')
}

onBeforeMount(() => {
    const $q = useQuasar();

    $q.iconMapFn = (iconName) => {
        const icon = myIcons[iconName];
        if (icon !== undefined) return { icon };
    }
});
</script>
