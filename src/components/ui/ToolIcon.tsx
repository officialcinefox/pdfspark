import React from 'react'
import { cn } from '../../lib/utils'

interface ToolIconProps {
  icon: React.ReactNode
  className?: string
}

export function ToolIcon({ icon, className }: ToolIconProps) {
  if (!React.isValidElement(icon)) return <>{icon}</>

  const element = icon as React.ReactElement<any>
  
  return React.cloneElement(element, {
    className: cn(element.props.className, className)
  })
}
