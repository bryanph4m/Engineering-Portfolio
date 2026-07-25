import json, sys
d = json.load(open(sys.argv[1]))
print(f"=== {sys.argv[1]} ===")
for r in d['runs']:
    if not r.get('frames'):
        print(f"{r['label']:26s} (no frames)"); continue
    f = r['frameMs']; rm = r['renderMs']
    print(f"{r['label']:24s} fps={r['fps']:6.1f}  frame avg={f['avg']:7.2f} p95={f['p95']:7.2f} max={f['max']:8.2f} | "
          f"render avg={rm['avg']:7.2f} max={rm['max']:8.2f} | calls={r['drawCalls']:4d} tris={r['trianglesPerFrame']:6d} | "
          f">20ms:{r['longFrames_gt20ms']:3d} >50ms:{r['veryLongFrames_gt50ms']:3d}")
print()
for k, v in d['stats'].items():
    print(f"{k:18s} meshes={v['meshes']:4d} vis={v['visibleMeshes']:4d} tris={v['sceneTriangles']:6d} "
          f"texMB={v['textureMB']:8.2f} nTex={v['uniqueTextures']:3d} progs={v['programs']:3d} glTex={v['glTextures']:3d} "
          f"dpr={v['dpr']} buf={v['drawingBuffer']}")
print()
print("top textures (idle):")
for t in d['stats']['idle']['topTextures'][:14]:
    print(f"   {t['w']:5d}x{t['h']:<5d} {t['mb']:7.2f} MB  {t['kind']}")
if 'rocketOpen' in d['stats']:
    print("top textures (rocket open):")
    for t in d['stats']['rocketOpen']['topTextures'][:14]:
        print(f"   {t['w']:5d}x{t['h']:<5d} {t['mb']:7.2f} MB  {t['kind']}")

print()
print("canvas paints (>1ms):")
for p in d.get('paints', []):
    if p['ms'] > 1.0:
        print(f"   {p['key']:28s} {p['ms']:8.2f} ms   {p['w']}x{p['h']}")
tot = sum(p['ms'] for p in d.get('paints', []))
print(f"   TOTAL paint time across session: {tot:.1f} ms across {len(d.get('paints',[]))} paints")
