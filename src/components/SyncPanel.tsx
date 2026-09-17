'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'

export default function SyncPanel() {
  const { cloudActive, syncing, cloudError, lastSync, syncStatus, activateCloud, syncNow, deactivateCloud } =
    useApp()
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const close = () => {
    setOpen(false)
    setPin('')
    setErr(null)
  }

  const onActivate = async () => {
    setBusy(true)
    setErr(null)
    const e = await activateCloud(pin)
    if (e) {
      setErr(e)
    } else {
      const s = await syncNow()
      if (s) setErr(s)
      else close()
    }
    setBusy(false)
  }

  const onSync = async () => {
    setBusy(true)
    setErr(null)
    const e = await syncNow()
    if (e) setErr(e)
    setBusy(false)
  }

  const onDeactivate = async () => {
    await deactivateCloud()
    close()
  }

  const errorText = err || cloudError

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={syncing}
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          cloudActive
            ? 'bg-sky-600 text-white active:bg-sky-500'
            : 'bg-slate-800/80 text-slate-300 active:bg-slate-700'
        }`}
        aria-label="Sincronizar en la nube"
      >
        {syncing ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 8.5 4.5 4.5 0 0 1 17.5 18H7z" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M12 15v-5" strokeLinecap="round" />
            <path d="M9.5 12.5 12 10l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={close}>
          <div
            className="w-full max-w-3xl rounded-t-3xl border-t border-slate-700 bg-slate-900 p-6 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-700" />
            <h2 className="text-lg font-bold text-white">
              {cloudActive ? 'Sincronización en la nube' : 'Activar sincronización en la nube'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Tu biblioteca se guarda en la nube (R2 + TiDB) y se sincroniza entre PC y iPad con este mismo usuario.
            </p>

            {errorText && (
              <p className="mt-3 rounded-xl bg-rose-950/70 px-4 py-3 text-sm font-medium text-rose-300">{errorText}</p>
            )}

            {(syncing || syncStatus?.phase === 'done') && syncStatus && (
              <div className="mt-4 rounded-2xl bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-200">{syncStatus.label}</span>
                  <span className="shrink-0 text-slate-400">
                    {syncStatus.total > 0
                      ? `${Math.min(syncStatus.current, syncStatus.total)}/${syncStatus.total}`
                      : ''}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{
                      width: `${
                        syncStatus.total > 0
                          ? Math.round((Math.min(syncStatus.current, syncStatus.total) / syncStatus.total) * 100)
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {!cloudActive ? (
              <div className="mt-4">
                <label className="text-sm text-slate-400">PIN de 4 a 6 dígitos (el mismo en todos tus dispositivos)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-center text-2xl tracking-widest text-white outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  disabled={busy || pin.length < 4}
                  onClick={onActivate}
                  className="mt-4 w-full rounded-2xl bg-sky-600 py-4 text-lg font-bold text-white active:bg-sky-500 disabled:opacity-40"
                >
                  {busy ? 'Conectando…' : 'Activar y sincronizar ahora'}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSync}
                  className="w-full rounded-2xl bg-sky-600 py-4 text-lg font-bold text-white active:bg-sky-500 disabled:opacity-60"
                >
                  {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{lastSync ? `Última: ${new Date(lastSync).toLocaleTimeString()}` : 'Sin sincronizar aún'}</span>
                  <button type="button" onClick={onDeactivate} className="font-semibold text-rose-400">
                    Desactivar nube
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}