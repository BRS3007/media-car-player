'use client'

import { BackIcon } from './icons'

function SiteLink({ href, name, note }: { href: string; name: string; note?: string }) {
  return (
    <li className="rounded-xl bg-slate-900 p-4">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-base font-semibold text-sky-400 underline decoration-sky-800 underline-offset-4"
      >
        {name}
      </a>
      {note && <p className="mt-1 text-sm text-slate-400">{note}</p>}
    </li>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 mt-6 text-lg font-bold text-slate-200 first:mt-0">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

export default function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="pt-safe flex shrink-0 items-center gap-3 p-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white active:bg-slate-700"
          aria-label="Cerrar ayuda"
        >
          <BackIcon className="h-8 w-8" />
        </button>
        <span className="px-2 text-lg font-semibold">¿De dónde descargo?</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 no-scrollbar">
        <Section title="Cómo funciona">
          <li className="rounded-xl bg-sky-950/60 p-4 text-slate-300">
            El botón <b>Descargar por URL</b> solo funciona con{' '}
            <b>enlaces directos al archivo</b> (la dirección termina en <code>.mp3</code>,{' '}
            <code>.mp4</code>…). Si el sitio solo reproduce sin darte ese enlace, no servirá para el
            botón: descarga el archivo en tu computadora y súbelo con <b>Subir archivos</b>.
          </li>
        </Section>

        <Section title="Música">
          <SiteLink href="https://pixabay.com/music/" name="Pixabay Music" note="Botón de descarga directa del archivo" />
          <SiteLink href="https://www.jamendo.com/start" name="Jamendo" note="Música libre legal, descarga con tu cuenta gratis" />
          <SiteLink href="https://freemusicarchive.org/" name="Free Music Archive" note="Música libre, descarga directa" />
          <SiteLink href="https://incompetech.com/" name="Incompetech" note="Música de Kevin MacLeod, descarga en MP3" />
          <SiteLink href="https://www.bensound.com/" name="BenSound" note="Música libre, descarga en MP3" />
          <SiteLink href="https://archive.org/details/audio" name="Internet Archive — Audio" note="Música y audios de dominio público" />
        </Section>

        <Section title="Videos">
          <SiteLink href="https://www.pexels.com/es-es/videos/" name="Pexels" note="Videos gratis en MP4 con descarga directa" />
          <SiteLink href="https://mixkit.co/free-stock-video/" name="Mixkit" note="Videos MP4 directos, gratis sin regístrate" />
          <SiteLink href="https://archive.org/details/moviesandfilms" name="Internet Archive — Películas" note="Películas clásicas de dominio público" />
          <SiteLink href="https://www.nasa.gov/" name="NASA" note="Videos de dominio público" />
          <SiteLink href="https://vimeo.com/" name="Vimeo" note="Solo si el autor lo publica con descarga habilitada" />
        </Section>

        <Section title="YouTube y redes sociales">
          <li className="rounded-xl bg-slate-900 p-4 text-slate-300">
            No funcionan con «Descargar por URL». La app no descarga de YouTube, Spotify, TikTok,
            etc. Para esos, descarga el MP3/MP4 en tu computadora y luego usa{' '}
            <b>Subir archivos</b> desde el iPad.
          </li>
        </Section>

        <Section title="Consejos">
          <li className="rounded-xl bg-slate-900 p-4 text-slate-300">
            Si la descarga por URL se corta sola, puede ser un archivo muy grande; subirlo directo
            desde el dispositivo es lo más confiable y sin límite.
          </li>
          <li className="rounded-xl bg-slate-900 p-4 text-slate-300">
            El iPad reproduce MP3, M4A, AAC y MP4/MOV (H.264). Formatos como MKV o AVI no se podrán
            reproducir.
          </li>
        </Section>
      </div>
    </div>
  )
}