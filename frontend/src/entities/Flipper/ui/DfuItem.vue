<template>
  <q-item class="row rounded-borders">
    <q-item-section class="col-5">
      <img src="~assets/flipper_white.svg" style="width: 100%" />
    </q-item-section>
    <q-item-section class="col-5 q-pl-md">
      <div>
        <div class="text-h6">{{ flipper.name }}</div>
        <div class="text-caption text-blue-14">Recovery mode</div>
      </div>
    </q-item-section>
    <q-item-section v-if="$slots.default" class="col-2">
      <slot name="default" v-bind="{ flipper }" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { FlipperModel } from 'entity/Flipper'

interface Props {
  flipper: FlipperModel.DataDfuFlipperElectron
}

defineProps<Props>()
</script>
