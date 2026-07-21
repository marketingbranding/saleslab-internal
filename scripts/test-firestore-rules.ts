import { spawn, type ChildProcess } from 'node:child_process'
import { rmSync } from 'node:fs'
import { connect } from 'node:net'
import { resolve } from 'node:path'

const isWindows = process.platform === 'win32'
const firebaseCli = resolve('node_modules/firebase-tools/lib/bin/firebase.js')
const tsxCli = resolve('node_modules/tsx/dist/cli.mjs')
const emulatorProjectId = `demo-saleslab-${process.pid}`

function waitForPort(port: number, timeoutMs: number) {
  const startedAt = Date.now()
  return new Promise<void>((resolve, reject) => {
    const check = () => {
      const socket = connect({ host: '127.0.0.1', port })
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - startedAt >= timeoutMs) reject(new Error('Firestore Emulator tidak siap dalam batas waktu.'))
        else setTimeout(check, 250)
      })
    }
    check()
  })
}

function portIsOpen(port: number) {
  return new Promise<boolean>(resolvePort => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolvePort(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolvePort(false)
    })
  })
}

function run(command: string, args: string[], environment = process.env) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: environment, shell: false })
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
}

async function stopProcessTree(child: ChildProcess) {
  if (!child.pid) return
  if (isWindows) {
    await run('taskkill', ['/pid', String(child.pid), '/T', '/F']).catch(() => 0)
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

async function main() {
  for (const port of [4400, 8080, 9099]) {
    if (await portIsOpen(port)) throw new Error(`Port emulator ${port} sudah digunakan. Hentikan emulator lain sebelum menjalankan test.`)
  }

  const emulator = spawn(process.execPath, [firebaseCli,
    'emulators:start',
    '--config', 'firebase.test.json',
    '--project', emulatorProjectId,
    '--only', 'firestore,auth',
  ], {
    stdio: 'inherit',
    shell: false,
    detached: !isWindows,
  })

  try {
    await waitForPort(8080, 60_000)
    await waitForPort(9099, 60_000)
    const code = await run(process.execPath, [tsxCli, '--test', 'tests/firestore/**/*.test.ts'], {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIREBASE_PROJECT_ID: emulatorProjectId,
      FIRESTORE_DATABASE_ID: '(default)',
      GROQ_API_KEY: 'test-groq-key',
      OPENROUTER_API_KEY: 'test-openrouter-key',
      GCLOUD_PROJECT: emulatorProjectId,
    })
    if (code !== 0) process.exitCode = code
  } finally {
    await stopProcessTree(emulator)
    rmSync('firestore-debug.log', { force: true })
    rmSync('firebase-debug.log', { force: true })
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
