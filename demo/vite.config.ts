import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const contentSecurityPolicy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'; frame-ancestors https://missionsurface.com http://localhost:* http://127.0.0.1:*"
const bridgeVersion = 2
const [repositoryOwner = '', repositoryName = ''] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
const githubBuild = process.env.GITHUB_ACTIONS === 'true'

if (githubBuild && (!repositoryOwner || !repositoryName)) {
  throw new Error('GITHUB_REPOSITORY must identify the repository during a GitHub Actions build.')
}

const pagesOrigin = process.env.MISSION_SURFACE_PAGES_ORIGIN
  ?? (githubBuild ? `https://${repositoryOwner}.github.io/${repositoryName}` : 'http://localhost')

export default defineConfig({
  base: githubBuild ? `/${repositoryName}/demo/` : './',
  plugins: [react(), {
    name: 'mission-surface-deployment-descriptor',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'mission-surface-deployment.json', source: JSON.stringify({
        schemaVersion: 1,
        protocol: 'mission-surface-prototype',
        version: bridgeVersion,
        buildRevision: process.env.GITHUB_SHA ?? '0000000000000000000000000000000000000000',
        pagesOrigin,
        livePrototypeKeys: ['mobile-sample', 'agent-builder-self-improvement'],
        contentSecurityPolicy,
      }, null, 2) })
    },
  }],
})
