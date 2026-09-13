'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { MusicIcon, TrashIcon } from './icons'

export default function UserScreen() {
  const { users, loading, selectUser, addUser, removeUser } = useApp()

  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pinUserId, setPinUserId] = useState<string | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  async function handleAdd() {
    if (pin !== pinConfirm) {
      setError('Los PIN no coinciden')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const err = await addUser(name, pin || undefined)
      if (err) setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleSelect(userId: string, hasPin: boolean) {
    if (hasPin) {
      setPinUserId(userId)
      setPinValue('')
      setPinError(null)
      return
    }
    await selectUser(userId)
  }

  async function handlePinConfirm(userId: string) {
    const ok = await selectUser(userId, pinValue)
    if (!ok) {
      setPinError('PIN incorrecto')
      setPinValue('')
    }
  }

  const handleRemove = async (userId: string) => {
    const confirmed = window.confirm('¿Eliminar este usuario y todo su contenido?')
    if (!confirmed) return
    await removeUser(userId)
  }

  if (pinUserId) {
    return (
      <div className="mx-auto flex h-full min-h-dvh max-w-3xl flex-col items-center justify-start px-6 pt-16">
        <h1 className="text-xl font-bold text-slate-200">PIN de acceso</h1>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pinValue}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handlePinConfirm(pinUserId)
          }}
          placeholder="Escribe tu PIN"
          className="mt-6 w-full max-w-sm min-h-14 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-center text-2xl tracking-widest text-slate-100 placeholder:text-base placeholder:text-slate-600 placeholder:tracking-normal"
        />
        {pinError && <p className="mt-3 text-sm text-red-400">{pinError}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => handlePinConfirm(pinUserId)}
            className="min-h-14 rounded-2xl bg-sky-600 px-8 font-bold text-white active:bg-sky-500"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setPinUserId(null)}
            className="min-h-14 rounded-2xl bg-slate-800 px-6 font-semibold text-slate-300 active:bg-slate-700"
          >
            Atrás
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full min-h-dvh max-w-3xl flex-col overflow-y-auto px-6 py-10 no-scrollbar">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-600 text-white">
          <MusicIcon className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold">Media Car</h1>
        <p className="mt-2 text-slate-400">¿Quién va a usar el carro hoy?</p>
      </div>

      {loading ? (
        <p className="text-center text-slate-500">Cargando…</p>
      ) : (
        <>
          <ul className="space-y-3">
            {users.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelect(user.id, !!user.pinHash)}
                  className="flex min-h-20 flex-1 items-center gap-4 rounded-2xl bg-slate-900 p-4 text-left text-lg font-semibold active:bg-slate-800"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{user.name}</span>
                  {user.pinHash && <span className="text-sm text-slate-500">con PIN</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(user.id)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-500 active:text-red-400"
                  aria-label={`Eliminar ${user.name}`}
                >
                  <TrashIcon className="h-6 w-6" />
                </button>
              </li>
            ))}
            {users.length === 0 && (
              <li className="rounded-2xl bg-slate-900/60 p-6 text-center text-slate-400">
                No hay usuarios. Crea el primero abajo.
              </li>
            )}
          </ul>

          <section className="mt-8 rounded-2xl bg-slate-900/80 p-5">
            <h2 className="text-lg font-bold">Nuevo usuario</h2>
            <div className="mt-4 flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoCapitalize="words"
                className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-base text-slate-100 placeholder:text-slate-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN (opcional)"
                  className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-center tracking-widest text-slate-100 placeholder:text-base placeholder:text-slate-500 placeholder:tracking-normal"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repetir PIN"
                  className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-center tracking-widest text-slate-100 placeholder:text-base placeholder:text-slate-500 placeholder:tracking-normal"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || !name.trim()}
                className="min-h-14 rounded-xl bg-sky-600 font-bold text-white active:bg-sky-500 disabled:opacity-40"
              >
                {busy ? 'Creando…' : 'Crear usuario y entrar'}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}