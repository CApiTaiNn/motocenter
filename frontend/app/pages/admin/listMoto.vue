<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import CardMoto from '../../components/admin/CardMoto.vue'
import type { IMotorcycle } from '~/types/motorcycles'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { ColumnDef } from '@tanstack/vue-table'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})
const table = useTemplateRef('table')
const UBadge = resolveComponent('UBadge')
const apiBase = useRuntimeConfig().public.apiBase
const motos = ref<IMotorcycle[]>([])
const selectedMoto = ref<IMotorcycle | null>(null)
const search = ref<string>('')
const panelOpen = ref<boolean>(false)
const refreshing = ref<boolean>(false)
const UButton = resolveComponent('UButton')

const columns: ColumnDef<IMotorcycle>[] = [
  {
    accessorKey: 'brand',
    header: ({ column }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Marque',
        icon:
          column.getIsSorted() === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : column.getIsSorted() === 'desc'
              ? 'i-lucide-arrow-down-wide-narrow'
              : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
  },
  {
    accessorKey: 'name',
    header: ({ column }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Modèle',
        icon:
          column.getIsSorted() === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : column.getIsSorted() === 'desc'
              ? 'i-lucide-arrow-down-wide-narrow'
              : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
  },
  {
    accessorKey: 'year',
    header: ({ column }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Année',
        icon:
          column.getIsSorted() === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : column.getIsSorted() === 'desc'
              ? 'i-lucide-arrow-down-wide-narrow'
              : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
  },
  {
    accessorKey: 'withAllField',
    header: ({ column }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Statut',
        icon:
          column.getIsSorted() === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : column.getIsSorted() === 'desc'
              ? 'i-lucide-arrow-down-wide-narrow'
              : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      }),
    cell: ({ row }) => {
      const value = row.getValue('withAllField') as boolean
      return h(
        UBadge,
        {
          variant: 'subtle',
          color: value ? 'success' : 'error',
          class: 'capitalize'
        },
        () => (value ? 'Complète' : 'Incomplète')
      )
    }
  },
  {
    accessorKey: 'is_public',
    header: ({ column }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Publiée',
        icon:
          column.getIsSorted() === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : column.getIsSorted() === 'desc'
              ? 'i-lucide-arrow-down-wide-narrow'
              : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      }),
    cell: ({ row }) => h(() => (row.getValue('is_public') ? 'Oui' : 'Non'))
  }
]

async function fetchData() {
  try {
    const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
      `${apiBase}motorcycles`,
      {
        //http://localhost:5000/api/v1/motorcycles?project=name,year,is_new,withAllField
        params: {
          project: 'name,year,is_public,withAllField',
          limit: 10000
        }
      }
    )
    if (data?.motorcycles) {
      motos.value = data.motorcycles.map((moto) => ({
        _id: moto._id,
        brand: moto.brand?.name || '',
        name: moto.name || '',
        year: moto.year || '',
        is_public: moto.is_public,
        withAllField: moto.withAllField
      }))
    }
  } catch (err) {
    console.error('Erreur fetch motos:', err)
  }
}

function openPanel() {
  panelOpen.value = true
}

function closePanel() {
  panelOpen.value = false
  selectedMoto.value = null
}

async function refreshAll() {
  refreshing.value = true
  await fetchData()
  refreshing.value = false
}

function onRowClick(row) {
  const rowIndex = row.srcElement.parentElement.rowIndex

  const moto = listMotosearch.value[rowIndex - 2]

  if (!moto) return console.error('moto introuvable')
  selectedMoto.value = moto
  openPanel()
}

const listMotosearch = computed(() => {
  if (search.value) {
    return motos.value.filter(
      (moto) =>
        moto.name.toLowerCase().includes(search.value.toLowerCase()) ||
        moto.brand.toLowerCase().includes(search.value.toLowerCase())
    )
  } else {
    return motos.value
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

const items = ref([10, 20, 50, 100])

onMounted(() => {
  fetchData()
})

watch(
  () => pagination.value.pageSize,
  (newSize) => {
    table.value?.tableApi?.setPageSize(newSize)
  }
)
</script>

<template>
  <div>
    <main>
      <div class="header-page">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          size="md"
          variant="outline"
          placeholder="Rechercher une moto..."
        />
        <UButton size="md" color="primary" label="Open" @click="openPanel"
          >Ajouter une moto</UButton
        >
      </div>

      <h3 class="header-list">Liste des motos</h3>
      <div class="main-content max-lg:flex-col">
        <div class="table-moto">
          <UTable
            ref="table"
            v-model:pagination="pagination"
            sticky
            :data="listMotosearch"
            :columns="columns"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel()
            }"
            :ui="{
              tr: 'cursor-pointer hover:bg-gray-50'
            }"
            @select="onRowClick"
          >
            <template #empty>
              <div
                class="flex flex-col items-center justify-center py-10 gap-2 text-gray-400"
              >
                <img src="/svg/motorcycleIcon.svg" width="46" height="25" />

                <p>Aucune moto trouvée</p>
              </div>
            </template>
          </UTable>

          <div class="flex justify-end p-4 px-4">
            <USelect v-model="pagination.pageSize" :items="items" />
          </div>

          <div class="flex justify-end border-t border-default pt-4 px-4">
            <UPagination
              :page="
                (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
              "
              :items-per-page="table?.tableApi?.getState().pagination.pageSize"
              :total="table?.tableApi?.getFilteredRowModel().rows.length"
              @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
            />
          </div>
        </div>
        <div v-if="panelOpen" class="panel-moto max-lg:w-full! max-lg:static!">
          <header class="panel-header">
            <UIcon
              :name="selectedMoto ? 'i-lucide-pencil' : 'i-lucide-plus-circle'"
              class="size-5 text-(--ui-primary)"
            />
            <h4>
              {{ selectedMoto ? `Modifier · ${selectedMoto.name}` : 'Nouvelle moto' }}
            </h4>
          </header>
          <CardMoto
            :key="selectedMoto?._id ?? 'create'"
            :mode="selectedMoto ? 'edit' : 'create'"
            :moto="selectedMoto"
            :on-close-panel="closePanel"
            :on-refresh="refreshAll"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.header-page {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: var(--space-2xl);
}

.table-moto {
  flex: 1;
  padding: var(--space-md);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding-bottom: var(--space-sm);
  margin-bottom: var(--space-md);
  border-bottom: var(--border-thin) solid var(--color-gray-light);
}

.main-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-list {
  margin-left: var(--space-md);
}

.panel-moto {
  margin: var(--space-xl);
  border: var(--border-thin) solid var(--border-gray);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  height: calc(150vh - 200px);
  overflow-y: auto;
  position: sticky;
  top: 60px;
}
</style>
