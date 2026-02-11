'use client'

/**
 * Title Edit Form Component
 *
 * T148-T154: Edit form with all title metadata fields
 */

import { useState } from 'react'

interface TitleData {
  asin: string
  title: string
  subtitle: string | null
  description: string | null
  summary: string | null
  image: string | null
  runtimeLengthMin: number | null
  rating: string | null
  releaseDate: string | null
  publisherName: string | null
  isbn: string | null
  language: string | null
  region: string | null
  seriesPosition: string | null
}

interface TitleEditFormProps {
  title: TitleData
  onUpdate: () => void
}

export default function TitleEditForm({ title, onUpdate }: TitleEditFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // T149-T151: Form state for all editable fields
  const [formData, setFormData] = useState({
    title: title.title,
    subtitle: title.subtitle || '',
    description: title.description || '',
    summary: title.summary || '',
    image: title.image || '',
    runtimeLengthMin: title.runtimeLengthMin?.toString() || '',
    rating: title.rating || '',
    releaseDate: title.releaseDate
      ? new Date(title.releaseDate).toISOString().split('T')[0]
      : '',
    publisherName: title.publisherName || '',
    isbn: title.isbn || '',
    language: title.language || '',
    region: title.region || '',
    seriesPosition: title.seriesPosition || '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // T153: Submit form to PUT API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updateData: any = {}

      // Only send changed fields
      if (formData.title !== title.title) updateData.title = formData.title
      if (formData.subtitle !== (title.subtitle || ''))
        updateData.subtitle = formData.subtitle || null
      if (formData.description !== (title.description || ''))
        updateData.description = formData.description || null
      if (formData.summary !== (title.summary || ''))
        updateData.summary = formData.summary || null
      if (formData.image !== (title.image || ''))
        updateData.image = formData.image || null
      if (formData.runtimeLengthMin !== (title.runtimeLengthMin?.toString() || ''))
        updateData.runtimeLengthMin = formData.runtimeLengthMin
          ? parseInt(formData.runtimeLengthMin)
          : null
      if (formData.rating !== (title.rating || ''))
        updateData.rating = formData.rating || null
      if (formData.releaseDate) {
        const formDate = new Date(formData.releaseDate).toISOString().split('T')[0]
        const titleDate = title.releaseDate
          ? new Date(title.releaseDate).toISOString().split('T')[0]
          : ''
        if (formDate !== titleDate) updateData.releaseDate = formData.releaseDate
      }
      if (formData.publisherName !== (title.publisherName || ''))
        updateData.publisherName = formData.publisherName || null
      if (formData.isbn !== (title.isbn || ''))
        updateData.isbn = formData.isbn || null
      if (formData.language !== (title.language || ''))
        updateData.language = formData.language || null
      if (formData.region !== (title.region || ''))
        updateData.region = formData.region || null
      if (formData.seriesPosition !== (title.seriesPosition || ''))
        updateData.seriesPosition = formData.seriesPosition || null

      const response = await fetch(`/api/admin/titles/${title.asin}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update title')
      }

      // T154: Display success and refresh
      setSuccess('Title updated successfully!')
      setIsEditing(false)
      onUpdate()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Edit Metadata</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* T149: Title, subtitle, description, summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <input
              type="text"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Summary
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* T150: Runtime, image, rating, release date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Runtime (minutes)
              </label>
              <input
                type="number"
                name="runtimeLengthMin"
                value={formData.runtimeLengthMin}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <input
                type="text"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                placeholder="e.g., 4.5 out of 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Release Date
            </label>
            <input
              type="date"
              name="releaseDate"
              value={formData.releaseDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* T151: Publisher, ISBN, language, region */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher
              </label>
              <input
                type="text"
                name="publisherName"
                value={formData.publisherName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISBN
              </label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                type="text"
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* T152: Series position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Series Position
            </label>
            <input
              type="text"
              name="seriesPosition"
              value={formData.seriesPosition}
              onChange={handleChange}
              placeholder="e.g., 1, 2, 3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setError(null)
                setSuccess(null)
              }}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-gray-600 text-sm">
          Click "Edit" to modify title metadata fields.
        </p>
      )}
    </div>
  )
}
