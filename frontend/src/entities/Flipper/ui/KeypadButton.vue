<template>
    <div ref="button" class="control cursor-pointer" @mousedown="handlePressStart" @mouseup="handlePressEnd"
        @mouseleave="handleLeaveMouse">
        <q-icon class="control--default" :name="icon" :size="size" color="transparent" />
        <q-icon class="control--hover" :name="iconHover || icon" :size="size" color="transparent" />
        <q-icon class="control--active" :name="iconActive || icon" :size="size" color="transparent" />
    </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';

type Props = {
    icon: string
    iconHover: string
    iconActive: string
    size: string
    keys: string[]
}

const props = defineProps<Props>();
const emit = defineEmits(['onShortPress', 'onLongPress', 'onRepeat']);

const button = ref<HTMLElement>();

const isPressed = ref(false);
const isLongPress = ref(false);
const timers = ref<ReturnType<typeof setTimeout>>();
const repeatInterval = ref<ReturnType<typeof setTimeout>>();

const handlePressStart = () => {
    isPressed.value = true;
    isLongPress.value = false;

    timers.value = setTimeout(() => {
        isLongPress.value = true;
        emit('onLongPress');
    }, 300);

    repeatInterval.value = setInterval(() => {
        if (isLongPress.value) emit('onRepeat');
    }, 150);
}

const handlePressEnd = () => {
    isPressed.value = false;
    isLongPress.value = false;

    clearTimeout(timers.value);
    clearInterval(repeatInterval.value);

    if (!isLongPress.value) emit('onShortPress');
}

const handleLeaveMouse = () => {
    if (isPressed.value) handlePressEnd();
}

const handleKeydown = (event: KeyboardEvent) => props.keys.forEach((key) => {
    if (event.code === key) {
        if (!timers.value) {
            handlePressStart();

            button.value?.classList.add('active');
        }
    }
});

const handleKeyup = (event: KeyboardEvent) => props.keys.forEach((key) => {
    if (event.code === key) {
        handlePressEnd();

        timers.value = undefined;

        button.value?.classList.remove('active');
    }
});

document.addEventListener('keydown', handleKeydown);
document.addEventListener('keyup', handleKeyup);

onUnmounted(() => {
    clearTimeout(timers.value);
    clearInterval(repeatInterval.value);

    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('keyup', handleKeyup);
});
</script>

<style lang="scss" scoped>
@import 'styles';
</style>
