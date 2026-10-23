// Files go to the backend, which checks the real file type and stores them
// in Supabase. The frontend host cannot keep uploaded files on disk.
export function useUpload() {
  const apiBase = useRuntimeConfig().public.apiBase

  async function upload(file: File, kind: 'image' | 'sound'): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const { url } = await $fetch<{ url: string }>(
      kind === 'image' ? `${apiBase}images` : `${apiBase}images/sound`,
      { method: 'POST', body: formData, credentials: 'include' }
    )
    return url
  }

  return {
    uploadImage: (file: File) => upload(file, 'image'),
    uploadSound: (file: File) => upload(file, 'sound')
  }
}
