import { ITagHandler } from '@cc98/ubb-core'
import React from 'react'

const handler: ITagHandler<React.ReactNode> = {
  isRecursive: true,

  render(node, __, children) {
    const { tagData } = node
    const { cursor } = tagData

    const style = {
      cursor,
    } as React.CSSProperties

    return <span style={style}>{children}</span>
  },
}

export default handler
