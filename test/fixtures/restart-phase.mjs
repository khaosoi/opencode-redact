// Runs outside the test process with a fresh module state, so the in-process
// vault is empty every time: "rehydrate" simulates a service restart whose
// plugin setup re-seeds *KEY env vars from the environment.
import { readFileSync } from "node:fs"

const hooks = {}
const ctx = {
  session: {
    hook(name, cb) {
      hooks[name] = cb
      return Promise.resolve()
    },
  },
  tool: {
    hook(name, cb) {
      hooks[name] = cb
      return Promise.resolve()
    },
  },
}

const plugin = await import(new URL("../../dist/index.js", import.meta.url))
await plugin.default.setup(ctx)

const mode = process.argv[2]

if (mode === "capture") {
  const ev = { prompt: { text: "check STRIPE_KEY=" + process.env.STRIPE_KEY } }
  await hooks.prompt(ev)
  process.stderr.write("DEBUG text=" + JSON.stringify(ev.prompt.text) + " argv=" + process.argv[2] + "\n")
  process.stdout.write(ev.prompt.text.match(/\[REDACTED:[a-z0-9-]+:[0-9a-f]{12}\]/)?.[0] ?? "")
} else if (mode === "rehydrate") {
  const token = readFileSync(0, "utf8").trim()
  const toolEvent = { input: { command: 'curl -H "Authorization: ' + token + '"' } }
  await hooks["execute.before"](toolEvent)
  process.stdout.write(toolEvent.input.command)
}
