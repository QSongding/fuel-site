// 修复 GitHub Pages 部署的路径和 CSS 注入
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const root = 'd:/素采/ai/ximu/fuel-site'

// 找到所有 HTML 文件（排除子目录中的）
const htmlFiles = readdirSync(root).filter(f => f.endsWith('.html'))
const blogDir = join(root, 'blog')
const workDir = join(root, 'work')
const portfolioDir = join(workDir, 'portfolio')

const allHtml = [
  ...htmlFiles.map(f => join(root, f)),
  ...readdirSync(blogDir).filter(f => f.endsWith('.html')).map(f => join(blogDir, f)),
  ...readdirSync(workDir).filter(f => f.endsWith('.html')).map(f => join(workDir, f)),
  ...readdirSync(portfolioDir).filter(f => f.endsWith('.html')).map(f => join(portfolioDir, f)),
]

const injectedCSS = '<style>#__framer-badge-container{display:none!important}</style>'

for (const file of allHtml) {
  let content = readFileSync(file, 'utf-8')
  const original = content

  // 1. 修复路径：../framerusercontent.com → framerusercontent.com（仅对根目录文件）
  // 子目录文件（blog/, work/）保持 ../framerusercontent.com
  const isSubdir = file.includes('/blog/') || file.includes('/work/')
  if (!isSubdir) {
    content = content.replaceAll('../framerusercontent.com/', 'framerusercontent.com/')
  }

  // 2. 注入隐藏 Framer 角标的 CSS
  if (!content.includes('__framer-badge-container')) {
    content = content.replace('</head>', injectedCSS + '\n</head>')
  }

  // 3. 替换 2025 → 2026（和 server.mjs 行为一致）
  content = content.replaceAll('2025', '2026')

  if (content !== original) {
    writeFileSync(file, content, 'utf-8')
    console.log('✓ 修复:', file.replace(root, ''))
  }
}

// 同样处理 framerusercontent.com 目录中的 mjs 文件（路径修复）
const sitesDir = join(root, 'framerusercontent.com/sites/3vMzCbXyoRFU6rdWl7Auts')
import { readdirSync as rds } from 'fs'
for (const f of rds(sitesDir)) {
  if (!f.endsWith('.mjs') || f.endsWith('.map')) continue
  const file = join(sitesDir, f)
  let content = readFileSync(file, 'utf-8')
  const original = content
  // 修复相对路径
  content = content.replaceAll('../framerusercontent.com/', 'framerusercontent.com/')
  if (content !== original) {
    writeFileSync(file, content, 'utf-8')
    console.log('✓ 修复JS:', f)
  }
}

console.log('\n完成！')
