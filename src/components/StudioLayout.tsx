'use client';

import React, { useCallback, useRef, useState } from 'react';
import ModelViewer from './ModelViewer';

export default function StudioLayout() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [models, setModels] = useState<{ id: string; name: string; url: string; format: 'gltf'|'glb'; position: [number,number,number]; scale: [number,number,number]; }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const canvas = el.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'screen.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.gltf') && !lower.endsWith('.glb')) {
      alert('Only glTF or GLB supported for import.');
      return;
    }
    const url = URL.createObjectURL(file);
    const id = (globalThis.crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const name = file.name;
    const format: 'gltf'|'glb' = lower.endsWith('.glb') ? 'glb' : 'gltf';
    const item = { id, name, url, format, position: [0,0,0] as [number,number,number], scale: [1,1,1] as [number,number,number] };
    setModels(prev => [...prev, item]);
    setSelectedId(id);
    e.currentTarget.value = '';
  }, []);

  const selected = models.find(m => m.id === selectedId) || null;

  const setSelectedPosition = useCallback((axis: 0|1|2, value: number) => {
    setModels(prev => prev.map(m => m.id === selectedId ? { ...m, position: (m.position.map((v,i)=> i===axis? value: v) as [number,number,number]) } : m));
  }, [selectedId]);

  const setSelectedScale = useCallback((axis: 0|1|2, value: number) => {
    setModels(prev => prev.map(m => m.id === selectedId ? { ...m, scale: (m.scale.map((v,i)=> i===axis? value: v) as [number,number,number]) } : m));
  }, [selectedId]);

  return (
    <div className="w-full h-screen bg-neutral-950 text-neutral-100 flex">
      {/* Left panel */}
      <aside className="hidden md:block w-[260px] h-full p-4">
        <div className="h-full rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-900/60 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
          <div className="p-4 text-lg font-semibold">Items</div>
          <div className="px-4 space-y-2 overflow-auto max-h-[calc(100%-56px)] pb-4">
            {models.length === 0 && (
              <div className="text-xs text-neutral-400">Use File to import glTF/GLB</div>
            )}
            {models.map((it) => (
              <button key={it.id} onClick={() => setSelectedId(it.id)} className={`w-full text-left flex items-center gap-3 rounded-xl p-3 border ${selectedId===it.id? 'bg-neutral-700/50 border-indigo-500/40':'bg-neutral-800/30 border-white/10'}`}>
                <div className="h-14 w-20 rounded-lg bg-neutral-700/40" />
                <div className="text-sm">
                  <div className="font-medium truncate max-w-[120px]">{it.name}</div>
                  <div className="text-neutral-400">{it.format.toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Center area */}
      <main className="flex-1 relative px-2 sm:px-3 md:px-4 flex flex-col">
        {/* dotted background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* top toolbar */}
        <div className="relative z-10 flex justify-center py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 rounded-full bg-neutral-900/80 backdrop-blur border border-white/10 px-2 sm:px-3 py-2 shadow-lg">
            {/* mobile toggles */}
            <button onClick={() => setShowLeft(true)} className="md:hidden h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10" aria-label="Open left panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h6M4 12h6M4 18h6"/><path d="M14 6h6M14 12h6M14 18h6"/></svg>
            </button>

            {/* Toolbar icons matching the reference */}
            <button title="Grid" className="h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-300">
                <circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="18" cy="6" r="1"/>
                <circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>
                <circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="18" r="1"/>
              </svg>
            </button>

            <button title="Cube" className="h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-300">
                <path d="M12 2l8 4-8 4-8-4 8-4z"/><path d="M4 6v8l8 4 8-4V6"/></svg>
            </button>

            <button title="Wireframe" className="h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-300">
                <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/></svg>
            </button>

            <button title="Camera" className="h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-300">
                <path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="14" r="3"/></svg>
            </button>

            <label title="Import (glTF/GLB)" className="ml-1 h-8 rounded-full bg-neutral-800/70 hover:bg-neutral-700 border border-white/10 px-2 sm:px-3 text-xs font-medium cursor-pointer relative overflow-hidden flex items-center gap-2">
              <input type="file" accept=".gltf,.glb" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Import model" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-neutral-300">
                <path d="M12 12V3"/><path d="M8 7l4-4 4 4"/><path d="M4 14v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3"/>
              </svg>
              <span className="hidden sm:inline">File</span>
            </label>

            <button title="Save Screen" onClick={handleSave} className="h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 px-3 text-xs font-medium">Save Screen</button>

            <button title="Close" className="h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-300"><path d="M6 6l12 12M18 6l-12 12"/></svg>
            </button>

            <button onClick={() => setShowRight(true)} className="md:hidden h-8 w-8 grid place-items-center rounded-full bg-neutral-800/70 border border-white/10" aria-label="Open right panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h10M4 18h16"/></svg>
            </button>
          </div>
        </div>

        {/* stage */}
        <div className="relative z-0 flex-1 flex items-center justify-center pb-2 sm:pb-3 md:pb-4">
          <div ref={stageRef} className="w-full h-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl">
            <ModelViewer models={models.map(m => ({ id: m.id, url: m.url, format: m.format, position: m.position, scale: m.scale }))} />
          </div>
        </div>
      </main>

      {/* Right panel */}
      <aside className="hidden md:block w-[260px] h-full p-4">
        <div className="h-full rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-900/60 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
          <div className="p-4 text-lg font-semibold">Create</div>

          <div className="px-4 space-y-4">
            <div>
              <div className="text-xs uppercase text-neutral-400 mb-2">Tools</div>
              <select className="w-full bg-neutral-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option>Pen</option>
              </select>
            </div>

            <div>
              <div className="text-xs uppercase text-neutral-400 mb-2">Position</div>
              {(['x','y','z'] as const).map((axis, idx) => (
                <div key={axis} className="flex items-center gap-3 py-2">
                  <div className="w-6 text-xs text-neutral-400">{axis}:</div>
                  <input type="range" min={-5} max={5} step={0.1} value={selected? selected.position[idx]: 0} onChange={(e)=> setSelectedPosition(idx as 0|1|2, parseFloat(e.target.value))} className="flex-1 accent-indigo-500" />
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs uppercase text-neutral-400 mb-2">Scale</div>
              {(['x','y','z'] as const).map((axis, idx) => (
                <div key={axis} className="flex items-center gap-3 py-2">
                  <div className="w-6 text-xs text-neutral-400">{axis}:</div>
                  <input type="range" min={0.1} max={3} step={0.1} value={selected? selected.scale[idx]: 1} onChange={(e)=> setSelectedScale(idx as 0|1|2, parseFloat(e.target.value))} className="flex-1 accent-indigo-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlays */}
      {showLeft && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setShowLeft(false)}>
          <div className="absolute left-0 top-0 h-full w-[80%] max-w-[320px] p-3" onClick={(e)=>e.stopPropagation()}>
            <div className="h-full rounded-2xl bg-neutral-900 border border-white/10">
              <div className="p-4 text-lg font-semibold flex items-center justify-between">
                <span>Items</span>
                <button onClick={() => setShowLeft(false)} className="h-8 w-8 rounded-full bg-neutral-800/70 border border-white/10" aria-label="Close" />
              </div>
              <div className="px-4 space-y-2 pb-4">
                {models.length === 0 && (
                  <div className="text-xs text-neutral-400">Use File to import glTF/GLB</div>
                )}
                {models.map((it) => (
                  <button key={it.id} onClick={() => setSelectedId(it.id)} className={`w-full text-left flex items-center gap-3 rounded-xl p-3 border ${selectedId===it.id? 'bg-neutral-700/50 border-indigo-500/40':'bg-neutral-800/30 border-white/10'}`}>
                    <div className="h-14 w-20 rounded-lg bg-neutral-700/40" />
                    <div className="text-sm">
                      <div className="font-medium truncate max-w-[120px]">{it.name}</div>
                      <div className="text-neutral-400">{it.format.toUpperCase()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRight && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setShowRight(false)}>
          <div className="absolute right-0 top-0 h-full w-[80%] max-w-[320px] p-3" onClick={(e)=>e.stopPropagation()}>
            <div className="h-full rounded-2xl bg-neutral-900 border border-white/10">
              <div className="p-4 text-lg font-semibold flex items-center justify-between">
                <span>Create</span>
                <button onClick={() => setShowRight(false)} className="h-8 w-8 rounded-full bg-neutral-800/70 border border-white/10" aria-label="Close" />
              </div>
              <div className="px-4 space-y-4 pb-4">
                <div>
                  <div className="text-xs uppercase text-neutral-400 mb-2">Tools</div>
                  <select className="w-full bg-neutral-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <option>Pen</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs uppercase text-neutral-400 mb-2">Position</div>
                  {(['x','y','z'] as const).map((axis, idx) => (
                    <div key={axis} className="flex items-center gap-3 py-2">
                      <div className="w-6 text-xs text-neutral-400">{axis}:</div>
                      <input type="range" min={-5} max={5} step={0.1} value={selected? selected.position[idx]: 0} onChange={(e)=> setSelectedPosition(idx as 0|1|2, parseFloat(e.target.value))} className="flex-1 accent-indigo-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


