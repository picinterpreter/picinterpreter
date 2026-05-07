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
  if (isRenderableImageUrl(category.icon)) {
    return (
      <img
        src={category.icon}
        alt={category.name}
        className={className || 'h-7 w-7 rounded-lg object-contain'}
      />
    )
  }

  return (
    <span className={textClassName || 'text-lg leading-none'}>
      {category.icon}
    </span>
  )
}
