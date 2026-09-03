<script setup lang="ts">
import { Time } from '@internationalized/date'

const props = defineProps<{
  modelValue: Time | null
}>()
const emit = defineEmits<{
  'update:modelValue': [value: Time | null]
}>()
const inputRef = useTemplateRef('inputRef')

const value = computed({
  get: () => props.modelValue,
  set: (val: any) => {
    if (!val || val.hour === undefined || val.minute === undefined) {
      return emit('update:modelValue', null)
    }
    emit('update:modelValue', new Time(val.hour, val.minute))
  }
})

const selectTime = (h: number) => {
  value.value = new Time(h, 0)
}
</script>

<template>
  <UInputTime
    ref="inputRef"
    v-model="value"
    :hour-cycle="24"
    class="w-full"
    size="xl"
  >
    <template #trailing>
      <UPopover :reference="inputRef?.inputsRef[0]?.$el">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-clock"
          class="cursor-pointer px-0"
        />
        <template #content>
          <div class="flex h-48 flex-col gap-1 overflow-y-auto p-2">
            <UButton
              v-for="h in 24"
              :key="h"
              :label="`${h - 1}:00`"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="selectTime(h - 1)"
            />
          </div>
        </template>
      </UPopover>
    </template>
  </UInputTime>
</template>
