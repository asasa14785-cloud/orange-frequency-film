export default function App() {
  const done = [
    'Node 22 + FFmpeg + Chrome + HyperFrames 0.9.67 installed and smoke-tested',
    'Both repositories cloned, skills installed, OneTake motion tests pass',
    'Real Talabat icon, wordmark tag, store screenshots and food photography downloaded',
    'Original 60 s score + SFX synthesised (numpy/scipy), cue times shared with the visuals',
    'Full 60 s HyperFrames composition (8 scenes) rendered 1920×1080 · 30 fps · H.264 + AAC 48 kHz',
    'ffprobe / full decode / black & freeze checks, storyboard PDF, reports',
  ]
  const todo = [
    '60 fps master render (only 30 fps rendered)',
    '9:16 vertical re-composition',
    'Polish: S5 title overlap, S7 text/plate spacing, S6 city readability, motion blur',
    'Listening pass for audio–video sync and Egyptian-Arabic voice-over',
    'Re-render and promote DRAFT to MASTER after QA',
  ]
  return (
    <main className="min-h-screen bg-[#220402] text-[#F4EDE3] p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <p className="text-[#FF5A00] font-bold tracking-widest text-sm">TALABAT EGYPT · DRAFT v1</p>
        <h1 className="text-4xl md:text-6xl font-black mt-2">The Orange Frequency</h1>
        <p className="mt-3 text-lg opacity-80">60-second motion-graphics film rendered with HyperFrames (project: talabat-egypt-film/compositions/talabat-orange-frequency).</p>
        <video className="w-full mt-8 rounded-2xl shadow-2xl bg-black" src="film.mp4" controls playsInline />
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <section className="rounded-2xl bg-[#3a0f08] p-6">
            <h2 className="font-extrabold text-xl text-[#FF5A00]">Done</h2>
            <ul className="mt-3 space-y-2 list-disc ms-5">{done.map(d => <li key={d}>{d}</li>)}</ul>
          </section>
          <section className="rounded-2xl bg-[#3a0f08] p-6">
            <h2 className="font-extrabold text-xl text-[#FF5A00]">Still to do</h2>
            <ul className="mt-3 space-y-2 list-disc ms-5">{todo.map(d => <li key={d}>{d}</li>)}</ul>
          </section>
        </div>
      </div>
    </main>
  )
}
