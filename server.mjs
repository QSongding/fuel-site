// 静态文件服务器
import { createServer } from 'http'
import { readFile, stat, access, mkdir, writeFile } from 'fs/promises'
import { join, extname, normalize, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, 'site-crawl', 'cherished-happen-241290.framer.app')
const crawlRoot = join(__dirname, 'site-crawl')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
}

const port = 5180
const injectedCSS = '#__framer-badge-container{display:none!important}'

function sendHTML(res, data) {
  let content = data.toString('utf-8')
  content = content.replaceAll('2025', '2026')
  if (content.includes('<!doctype html>') || content.includes('<!DOCTYPE html>')) {
    const injected = content.replace('</head>', '<style>' + injectedCSS + '</style>\n</head>')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(injected)
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(content)
  }
}

async function fileExists(p) {
  try { await access(p); return true } catch { return false }
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode))
        return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0])

  // 处理 framerusercontent.com 资源请求（本地优先，缺失时自动下载）
  if (urlPath.startsWith('/framerusercontent.com/')) {
    const assetPath = join(crawlRoot, urlPath.replace(/^\//, ''))
    const ext = extname(assetPath)
    const mime = mimeTypes[ext] || 'application/octet-stream'
    try {
      let data = await readFile(assetPath)
      if (mime.startsWith('text/') || mime.includes('javascript')) {
        data = Buffer.from(data.toString('utf-8').replaceAll('2025', '2026'), 'utf-8')
      }
      res.writeHead(200, { 'Content-Type': mime })
      res.end(data)
      return
    } catch {
      try {
        const remoteUrl = 'https://' + urlPath.substring(1)
        console.log('  Downloading:', urlPath)
        const data = await downloadFile(remoteUrl)
        await mkdir(dirname(assetPath), { recursive: true })
        await writeFile(assetPath, data)
        console.log('  Cached:', urlPath)
        let out = data
        if (mime.startsWith('text/') || mime.includes('javascript')) {
          out = Buffer.from(data.toString('utf-8').replaceAll('2025', '2026'), 'utf-8')
        }
        res.writeHead(200, { 'Content-Type': mime })
        res.end(out)
        return
      } catch (e) {
        console.log('  Download failed:', urlPath, e.message)
        res.writeHead(404)
        res.end('Asset not found: ' + urlPath)
        return
      }
    }
  }

  if (urlPath.startsWith('/events.framer.com/')) {
    res.writeHead(200, { 'Content-Type': 'text/javascript' })
    res.end('')
    return
  }

  if (urlPath === '/') urlPath = '/index.html'

  const filePath = normalize(join(root, urlPath))

  if (!filePath.startsWith(root)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  try {
    if (!filePath.endsWith('.html')) {
      const htmlPath = filePath + '.html'
      if (await fileExists(htmlPath)) {
        const data = await readFile(htmlPath)
        sendHTML(res, data)
        return
      }
    }

    const stats = await stat(filePath).catch(() => null)

    if (stats) {
      if (stats.isDirectory()) {
        const indexPath = join(filePath, 'index.html')
        if (await fileExists(indexPath)) {
          const data = await readFile(indexPath)
          sendHTML(res, data)
          return
        }
        res.writeHead(404)
        res.end('Not found: ' + urlPath)
        return
      }

      const ext = extname(filePath)
      const mime = mimeTypes[ext] || 'application/octet-stream'

      if (ext === '.html' || ext === '') {
        const data = await readFile(filePath)
        sendHTML(res, data)
        return
      }

      const data = await readFile(filePath)
      res.writeHead(200, { 'Content-Type': mime })
      res.end(data)
      return
    }

    res.writeHead(404)
    res.end('Not found: ' + urlPath)
  } catch {
    res.writeHead(404)
    res.end('Not found: ' + urlPath)
  }
})

server.listen(port, () => {
  console.log('\n  Fuel Studio running at:')
  console.log('  -> http://localhost:' + port + '/')
  console.log('\n  Missing assets will be auto-downloaded and cached.\n')
})
