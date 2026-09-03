<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const props = defineProps<{
  modelValue: CalendarDate | null
}>()
const emit = defineEmits<{
  'update:modelValue': [value: CalendarDate | null]
}>()
const inputRef = useTemplateRef('inputRef')

const value = computed({
  get: () => props.modelValue,
  set: (val: any) => {
    if (!val || !val.year || !val.month || !val.day) {
      return emit('update:modelValue', null)
    }
    // Reconstruction = vraie instance CalendarDate avec #private
    emit('update:modelValue', new CalendarDate(val.year, val.month, val.day))
  }
})
</script>

<template>
  <UInputDate
    ref="inputRef"
    v-model="value"
    class="w-full"
    :ui="{
      base: 'w-full justify-start text-left'
    }"
    size="xl"
    locale="fr-FR"
  >
    <template #trailing>
      <UPopover :reference="inputRef?.inputsRef[3]?.$el">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-calendar"
          class="cursor-pointer px-0"
        />
        <template #content>
          <UCalendar
            :model-value="value"
            @update:model-value="(val: any) => (value = val)"
          />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>
