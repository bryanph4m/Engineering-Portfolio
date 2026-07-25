(() => {
  if (window.__probe) return 'already installed'
  const gl = window.__gl
  const scene = window.__scene
  if (!gl || !scene) return 'ERROR: no __gl/__scene (DEV hooks missing or desk not mounted)'

  const ctx = gl.getContext()
  const P = { frames: [], recording: false, label: null, log: [] }

  const ext = ctx.getExtension('EXT_disjoint_timer_query_webgl2')
  P.gpuSupported = !!ext
  let pending = []
  P.gpuSamples = []

  const origRender = gl.render.bind(gl)
  gl.render = function (sc, cam) {
    let q = null
    if (ext && P.recording) {
      q = ctx.createQuery()
      ctx.beginQuery(ext.TIME_ELAPSED_EXT, q)
    }
    const t0 = performance.now()
    origRender(sc, cam)
    const t1 = performance.now()
    if (q) { ctx.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q) }
    P.lastRenderMs = t1 - t0
  }

  const drainGpu = () => {
    if (!ext) return
    const still = []
    for (const q of pending) {
      const avail = ctx.getQueryParameter(q, ctx.QUERY_RESULT_AVAILABLE)
      const disjoint = ctx.getParameter(ext.GPU_DISJOINT_EXT)
      if (avail && !disjoint) { P.gpuSamples.push(ctx.getQueryParameter(q, ctx.QUERY_RESULT) / 1e6); ctx.deleteQuery(q) }
      else if (disjoint) { ctx.deleteQuery(q) }
      else still.push(q)
    }
    pending = still
  }

  let last = performance.now()
  const tick = () => {
    const now = performance.now()
    const dt = now - last
    last = now
    if (P.recording) {
      P.frames.push({ dt, renderMs: P.lastRenderMs || 0, calls: gl.info.render.calls, tris: gl.info.render.triangles })
      drainGpu()
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  const bytesOf = (tex) => {
    const img = tex.image
    if (!img) return 0
    const w = img.width || img.videoWidth || 0
    const h = img.height || img.videoHeight || 0
    if (!w || !h) return 0
    let b = w * h * 4
    if (tex.generateMipmaps !== false) b = Math.round((b * 4) / 3)
    return b
  }

  P.sceneStats = () => {
    const texes = new Map()
    const geos = new Map()
    let meshes = 0, visibleMeshes = 0, lights = 0
    scene.traverse((o) => {
      if (o.isLight) lights++
      if (!o.isMesh && !o.isSkinnedMesh) return
      meshes++
      let vis = o.visible, p = o.parent
      while (vis && p) { if (!p.visible) vis = false; p = p.parent }
      if (vis) visibleMeshes++
      if (o.geometry) geos.set(o.geometry.uuid, o.geometry)
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (!m) continue
        for (const k of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap','envMap','lightMap']) {
          const t = m[k]
          if (t && t.isTexture) texes.set(t.uuid, t)
        }
      }
    })
    let texBytes = 0
    const texList = []
    for (const t of texes.values()) {
      const b = bytesOf(t)
      texBytes += b
      texList.push({ w: t.image?.width, h: t.image?.height, mb: +(b / 1048576).toFixed(2), kind: t.constructor.name })
    }
    texList.sort((a, b) => b.mb - a.mb)

    let tris = 0, verts = 0, geoBytes = 0
    for (const g of geos.values()) {
      const pos = g.attributes.position
      if (!pos) continue
      verts += pos.count
      tris += g.index ? g.index.count / 3 : pos.count / 3
      for (const k in g.attributes) geoBytes += g.attributes[k].array.byteLength
      if (g.index) geoBytes += g.index.array.byteLength
    }

    let shadowBytes = 0
    scene.traverse((o) => {
      if (o.isLight && o.shadow && o.castShadow) {
        const s = o.shadow.mapSize
        shadowBytes += s.width * s.height * 4
      }
    })

    return {
      meshes, visibleMeshes, lights,
      uniqueGeometries: geos.size,
      uniqueTextures: texes.size,
      sceneTriangles: Math.round(tris),
      sceneVertices: verts,
      textureMB: +(texBytes / 1048576).toFixed(2),
      geometryMB: +(geoBytes / 1048576).toFixed(2),
      shadowMapMB: +(shadowBytes / 1048576).toFixed(2),
      programs: gl.info.programs?.length,
      glGeometries: gl.info.memory.geometries,
      glTextures: gl.info.memory.textures,
      dpr: gl.getPixelRatio(),
      drawingBuffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
      topTextures: texList.slice(0, 24),
    }
  }

  const pct = (arr, p) => {
    if (!arr.length) return null
    const s = arr.slice().sort((a, b) => a - b)
    return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2)
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

  P.start = (label) => {
    P.label = label; P.frames = []; P.gpuSamples = []; pending = []; P.recording = true
    return 'recording:' + label
  }

  P.stop = () => {
    P.recording = false
    drainGpu()
    const f = P.frames.slice(3)
    if (!f.length) return { label: P.label, frames: 0 }
    const dts = f.map((x) => x.dt)
    const rms = f.map((x) => x.renderMs)
    const r = {
      label: P.label,
      frames: f.length,
      fps: +(1000 / avg(dts)).toFixed(1),
      frameMs: { avg: +avg(dts).toFixed(2), p50: pct(dts, 0.5), p95: pct(dts, 0.95), max: +Math.max(...dts).toFixed(2) },
      renderMs: { avg: +avg(rms).toFixed(2), p95: pct(rms, 0.95), max: +Math.max(...rms).toFixed(2) },
      gpuMs: P.gpuSamples.length ? { avg: +avg(P.gpuSamples).toFixed(2), p95: pct(P.gpuSamples, 0.95), n: P.gpuSamples.length } : 'unsupported',
      drawCalls: Math.round(avg(f.map((x) => x.calls))),
      trianglesPerFrame: Math.round(avg(f.map((x) => x.tris))),
      longFrames_gt20ms: dts.filter((d) => d > 20).length,
      veryLongFrames_gt50ms: dts.filter((d) => d > 50).length,
    }
    P.log.push(r)
    return r
  }

  window.__probe = P
  return 'installed; gpuTimer=' + !!ext
})()
