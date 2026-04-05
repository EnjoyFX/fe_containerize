import React from 'react'
import { createRoot } from 'react-dom/client'
import Widget from './Widget'

const roots = new Map()

export function mount(container) {
  if (roots.has(container)) return
  const root = createRoot(container)
  root.render(React.createElement(Widget))
  roots.set(container, root)
}

export function unmount(container) {
  const root = roots.get(container)
  if (root) {
    root.unmount()
    roots.delete(container)
  }
}
