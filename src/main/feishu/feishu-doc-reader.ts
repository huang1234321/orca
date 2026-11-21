import { feishuRequest } from './feishu-request'

/** A /docx/{id} URL carries the token directly; wiki URLs resolve through the node API. */
async function resolveDocToken(docUrl: string): Promise<string | null> {
  const direct = /\/docx\/([A-Za-z0-9]+)/.exec(docUrl)
  if (direct?.[1]) {
    return direct[1]
  }
  const wiki = /\/wiki\/([A-Za-z0-9]+)/.exec(docUrl)
  if (!wiki?.[1]) {
    return null
  }
  const node = await feishuRequest<{ node?: { obj_type?: unknown; obj_token?: unknown } }>(
    `/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(wiki[1])}`
  )
  const n = node.ok ? node.data.node : undefined
  return n?.obj_type === 'docx' && typeof n.obj_token === 'string' ? n.obj_token : null
}

type RawBlock = {
  block_id?: string
  block_type?: number
  text?: { elements?: { text_run?: { content?: unknown } }[] }
  heading1?: { elements?: { text_run?: { content?: unknown } }[] }
  heading2?: { elements?: { text_run?: { content?: unknown } }[] }
  heading3?: { elements?: { text_run?: { content?: unknown } }[] }
  heading4?: { elements?: { text_run?: { content?: unknown } }[] }
  heading5?: { elements?: { text_run?: { content?: unknown } }[] }
  bullet?: { elements?: { text_run?: { content?: unknown } }[] }
  ordered?: { elements?: { text_run?: { content?: unknown } }[] }
  code?: { elements?: { text_run?: { content?: unknown } }[] }
}

function blockText(block: RawBlock): string {
  const body =
    block.text ??
    block.heading1 ??
    block.heading2 ??
    block.heading3 ??
    block.heading4 ??
    block.heading5 ??
    block.bullet ??
    block.ordered ??
    block.code
  return (body?.elements ?? [])
    .map((element) =>
      typeof element.text_run?.content === 'string' ? element.text_run.content : ''
    )
    .join('')
}

/** Blocks to Markdown: headings, paragraphs, list items, and code fences; other blocks fall back to their text. */
function blockToMarkdown(block: RawBlock): string | null {
  const text = blockText(block)
  switch (block.block_type) {
    case 1:
      return null
    case 2:
      return text
    case 3:
      return `# ${text}`
    case 4:
      return `## ${text}`
    case 5:
      return `### ${text}`
    case 6:
      return `#### ${text}`
    case 7:
      return `##### ${text}`
    case 8:
      return `###### ${text}`
    case 12:
      return `1. ${text}`
    case 13:
      return `- ${text}`
    case 14:
      return `\`\`\`\n${text}\n\`\`\``
    case undefined:
      return text || null
    default:
      return text || null
  }
}

/** Read a linked Feishu doc's blocks as Markdown so the detail page can render it inline. */
export async function readFeishuDocMarkdown(docUrl: string): Promise<string | null> {
  const docToken = await resolveDocToken(docUrl)
  if (!docToken) {
    return null
  }
  const lines: string[] = []
  let pageToken: string | undefined
  do {
    const page = await feishuRequest<{
      items?: RawBlock[]
      page_token?: string
      has_more?: boolean
    }>(
      `/open-apis/docx/v1/documents/${encodeURIComponent(docToken)}/blocks?page_size=500${
        pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''
      }`
    )
    if (!page.ok) {
      return null
    }
    for (const block of page.data.items ?? []) {
      const markdown = blockToMarkdown(block)
      if (markdown !== null) {
        lines.push(markdown)
      }
    }
    pageToken = page.data.has_more ? page.data.page_token : undefined
  } while (pageToken)
  return lines.join('\n\n')
}
