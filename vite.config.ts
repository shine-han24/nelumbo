import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

/**
 * 개발 서버에서 /api/* 를 실행해 준다.
 *
 * 배포에서는 Vercel이 api/ 폴더를 서버리스 함수로 돌리지만, vite dev는
 * 그걸 모른다. 이게 없으면 로컬에서 맞춤법 검사가 404가 나서
 * "배포해 봐야 아는" 상태가 된다.
 *
 * 키는 .env.local 에서 읽어 이 프로세스 안에서만 쓴다.
 * 클라이언트 번들에는 들어가지 않는다 (VITE_ 접두사가 아니므로).
 */
function apiRoutes(): Plugin {
  return {
    name: 'nelumbo-api-routes',
    apply: 'serve',
    configureServer(server) {
      // .env.local 을 process.env 로 (Vercel의 런타임 환경을 흉내)
      const envPath = path.resolve(__dirname, '.env.local')
      if (fs.existsSync(envPath)) {
        for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
          const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
          if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
        }
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const name = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '')
        const file = path.resolve(__dirname, 'api', `${name}.ts`)
        if (!fs.existsSync(file)) return next()

        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8')

          const mod = await server.ssrLoadModule(file)
          await mod.default(
            { method: req.method, headers: req.headers, body: raw ? JSON.parse(raw) : undefined },
            {
              status(code: number) {
                res.statusCode = code
                return this
              },
              setHeader: (k: string, v: string) => res.setHeader(k, v),
              json(body: unknown) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(body))
              },
            },
          )
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'dev api error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiRoutes()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
