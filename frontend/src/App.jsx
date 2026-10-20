import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

// Same name always gets the same colour, so people are easy to recognise.
function colorFor(name = "") {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360} 70% 62%)`
}

function Avatar({ name, size = "h-9 w-9" }) {
  return (
    <span
      className={`${size} shrink-0 rounded-full grid place-items-center text-sm font-semibold text-[#12141c]`}
      style={{ backgroundColor: colorFor(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function App() {
  const editorRef = useRef(null)
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const [users, setUsers] = useState([])
  const [copied, setCopied] = useState(false)

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  const handleBeforeMount = (monaco) => {
    monaco.editor.defineTheme("codesync", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#12141c",
        "editorGutter.background": "#12141c",
        "editor.lineHighlightBackground": "#1a1d28",
        "editorLineNumber.foreground": "#4b5268",
        "editorLineNumber.activeForeground": "#aab0c6",
      },
    })
  }

  const handleMount = (editor) => {
    editorRef.current = editor

    new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current])
    )
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const name = e.target.username.value.trim()
    if (!name) return
    setUsername(name)
    window.history.pushState({}, "", "?username=" + encodeURIComponent(name))
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + window.location.pathname
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error("Could not copy link", err)
    }
  }

  useEffect(() => {
    if (username) {
      const provider = new SocketIOProvider("/", "monaco", ydoc, {
        autoConnect: true,
      })

      provider.awareness.setLocalStateField("user", { username })

      const readUsers = () => {
        const states = Array.from(provider.awareness.getStates().values())
        setUsers(
          states
            .filter((state) => state.user && state.user.username)
            .map((state) => state.user)
        )
      }

      readUsers()
      provider.awareness.on("change", readUsers)

      function handleBeforeUnload() {
        provider.awareness.setLocalStateField("user", null)
      }

      window.addEventListener("beforeunload", handleBeforeUnload)

      return () => {
        provider.disconnect()
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }
  }, [username])

  /* ---------- Join screen ---------- */
  if (!username) {
    return (
      <main className="min-h-screen w-full bg-[#0c0e14] flex items-center justify-center p-4">
        <form
          onSubmit={handleJoin}
          className="w-full max-w-sm flex flex-col gap-6 rounded-2xl bg-[#12141c] border border-[#2a2f3f] p-8 shadow-2xl shadow-black/40"
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#e6e8f0]">
              Code Sync
            </h1>
            <p className="text-sm leading-relaxed text-[#8a90a6]">
              Pick a name so others can see you in the editor.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-medium text-[#c4c9da]">
              Your name
            </label>
            <input
              id="username"
              type="text"
              name="username"
              autoFocus
              autoComplete="off"
              placeholder="e.g. Aarav"
              className="w-full rounded-lg bg-[#1a1d28] border border-[#2a2f3f] px-3.5 py-2.5 text-[#e6e8f0] placeholder:text-[#5b6178] outline-none transition focus:border-[#7c8cff] focus:ring-2 focus:ring-[#7c8cff]/30"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[#7c8cff] px-4 py-2.5 font-semibold text-[#0c0e14] transition hover:bg-[#95a2ff] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c8cff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]"
          >
            Join editor
          </button>
        </form>
      </main>
    )
  }

  /* ---------- Editor screen ---------- */
  return (
    <main className="h-screen w-full bg-[#0c0e14] flex flex-col md:flex-row gap-3 p-3 text-[#e6e8f0]">
      <aside className="md:h-full md:w-72 md:shrink-0 max-h-56 md:max-h-none flex flex-col rounded-xl bg-[#12141c] border border-[#2a2f3f] overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-4 border-b border-[#2a2f3f]">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Code Sync</h1>
            <p className="text-xs text-[#8a90a6]">
              {users.length} {users.length === 1 ? "person" : "people"} online
            </p>
          </div>
          <span className="relative flex h-2.5 w-2.5" title="Connected">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
        </header>

        <ul className="flex-1 overflow-y-auto p-2">
          {users.map((user, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[#1a1d28] transition-colors"
            >
              <Avatar name={user.username} />
              <span className="truncate text-sm font-medium">
                {user.username}
              </span>
              {user.username === username && (
                <span className="ml-auto rounded-full bg-[#7c8cff]/15 px-2 py-0.5 text-xs text-[#aab4ff]">
                  You
                </span>
              )}
            </li>
          ))}
        </ul>

        <footer className="p-3 border-t border-[#2a2f3f]">
          <button
            onClick={handleCopyLink}
            className="w-full rounded-lg border border-[#2a2f3f] bg-[#1a1d28] px-3 py-2 text-sm font-medium text-[#c4c9da] transition hover:border-[#7c8cff] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c8cff]/50"
          >
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </footer>
      </aside>

      <section className="flex-1 min-h-0 rounded-xl bg-[#12141c] border border-[#2a2f3f] overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme="codesync"
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            fontSize: 14,
            lineHeight: 22,
            fontLigatures: true,
            minimap: { enabled: false },
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
          }}
        />
      </section>
    </main>
  )
}

export default App