import '@/styles/styles.css'
import '@/styles/tailwind.css'

import type { Component, JSX } from 'solid-js'

export const Layout: Component<{ children: JSX.Element }> = (props) => {
  return (
    <div class="flex min-h-screen flex-col">
      <div class="flex-1">
        <main class="mx-auto max-w-7xl">
          {props.children}
        </main>
      </div>
    </div>
  )
}
