import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  return (
    <div className="relative">
      <button
        type="button"
        className="btn"
        data-testid="install-app"
        onClick={async () => {
          if (!promptEvent) {
            setShowHint((value) => !value)
            return
          }
          await promptEvent.prompt()
          const choice = await promptEvent.userChoice
          if (choice.outcome === 'accepted') setInstalled(true)
          setPromptEvent(null)
        }}
      >
        Instalar app
      </button>
      {showHint && !promptEvent ? (
        <p
          className="absolute right-0 top-full z-40 mt-1 w-64 rounded-md border border-panel-line bg-panel p-2 text-[0.68rem] leading-snug text-ink-dim shadow-lg"
          role="status"
        >
          En Chrome o Edge de escritorio usa el icono de instalar de la barra de direcciones. En
          Android, menú → Añadir a pantalla de inicio. Se abre con tu logo y sin barra del navegador.
        </p>
      ) : null}
    </div>
  )
}
