import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { imagesService } from '../services/images.service'
import type { DockerImage } from '../types/image'

export function ImagesPage() {
  const [images, setImages] = useState<DockerImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true)
        const data = await imagesService.list()
        setImages(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar images')
      } finally {
        setLoading(false)
      }
    }

    loadImages()
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">Docker Images</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && images.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhuma image encontrada</p>
        </div>
      )}

      {!loading && !error && images.length > 0 && (
        <div className="space-y-3">
          {images.map((image) => (
            <Card key={image.id} className="p-4">
              <div className="space-y-2">
                <div>
                  <h3 className="font-semibold text-slate-50 break-all">{image.id}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Tags</p>
                    <p className="text-slate-300">{image.repoTags?.length ?? 0} tags</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Size</p>
                    <p className="text-slate-300">{formatBytes(image.size)}</p>
                  </div>
                </div>
                {image.repoTags && image.repoTags.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-1">Tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {image.repoTags.map((tag) => (
                        <span key={tag} className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
