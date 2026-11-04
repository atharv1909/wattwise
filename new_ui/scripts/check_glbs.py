#!/usr/bin/env python3
"""Validate all appliance GLBs and emit normalized bounds + placement metadata."""
import json
import os

import numpy as np
import trimesh

DIR = "/home/z/my-project/public/assets/simready"
out = {}
for f in sorted(os.listdir(DIR)):
    if not f.endswith(".glb"):
        continue
    try:
        scene = trimesh.load(os.path.join(DIR, f), force="scene")
        geoms = list(scene.geometry.values())
        tris = sum(g.faces.shape[0] for g in geoms if hasattr(g, "faces"))
        # world-space bounds across scene graph
        pts = []
        for node_name in scene.graph.nodes_geometry:
            T, geom_name = scene.graph[node_name]
            g = scene.geometry[geom_name]
            if g.vertices.shape[0] == 0:
                continue
            v = g.vertices @ T[:3, :3].T + T[:3, 3]
            pts.append(v)
        V = np.vstack(pts)
        mn, mx = V.min(axis=0), V.max(axis=0)
        size = mx - mn
        out[f.replace(".glb", "")] = {
            "ok": True,
            "triangles": int(tris),
            "min": [round(float(x), 4) for x in mn],
            "max": [round(float(x), 4) for x in mx],
            "size": [round(float(x), 4) for x in size],
            "sizeMB": round(os.path.getsize(os.path.join(DIR, f)) / 1e6, 2),
        }
        print(f"{f:22s} tris={tris:>8,} size=({size[0]:.2f},{size[1]:.2f},{size[2]:.2f}) m")
    except Exception as e:  # noqa: BLE001
        out[f.replace(".glb", "")] = {"ok": False, "error": str(e)}
        print(f"{f}: FAILED {e}")

with open(os.path.join(DIR, "bounds.json"), "w") as fh:
    json.dump(out, fh, indent=2)
print("wrote bounds.json")
