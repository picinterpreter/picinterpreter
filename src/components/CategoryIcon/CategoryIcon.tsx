import { useState } from 'react'
import type { Category } from '@/types'
import { isRenderableImageUrl } from '@/utils/generate-placeholder-svg'

export function CategoryIcon({
  category,
  className = '',
  textClassName = '',
}: {
  category: Category
  className?: string
  textClassName?: string
}) {
  const [imgFailed, setImgFailed] = useState(false)

  if (isRenderableImageUrl(category.icon) && !imgFailed) {
    return (
      <img
        src={category.icon}
        alt={category.name}
        className={className || 'h-7 w-7 rounded-lg object-contain'}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <span className={textClassName || 'text-lg leading-none'}>
      {category.name.slice(0, 2)}
    </span>
  )
}
