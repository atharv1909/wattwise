#!/usr/bin/env python3
"""Convert LG Electronics SimReady OpenUSD appliance packages to web-ready GLB.

Pipeline: usd-core (Pixar USD) traverses the composed stage; geometry, UVs,
world transforms and UsdPreviewSurface materials (constant colors or texture
maps, including GeomSubset face-region assignments) are extracted, large meshes
are decimated with fast-simplification and exported as one GLB per appliance
via trimesh.

Source: https://huggingface.co/datasets/LGElectronics/simready-assets (CC-BY-4.0)
"""
import json
import os
import sys
import urllib.request

import numpy as np
import trimesh
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf

CACHE = "/tmp/lg_usd"
OUT = "/home/z/my-project/public/assets/simready"
BASE_URL = "https://huggingface.co/datasets/LGElectronics/simready-assets/resolve/main"

PICKS = {
    "laundry_wm4000hwa": ("washer", 45_000),
    "air-purifier_as25gcbz0": ("air_purifier", 35_000),
    "cooking_mser1130b": ("microwave", 30_000),
    "cooking_ldgl6924s": ("gas_range", 45_000),
    "laptop_16z90tl": ("laptop", 30_000),
}


def fetch(pkg: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    local = os.path.join(CACHE, f"{pkg}.usd")
    if not os.path.exists(local) or os.path.getsize(local) < 1000:
        url = f"{BASE_URL}/{pkg}/simready_usd/{pkg}.usd"
        print(f"  fetching {pkg}.usd ...", flush=True)
        req = urllib.request.Request(url, headers={"User-Agent": "wattwise/1.0"})
        with urllib.request.urlopen(req, timeout=600) as r, open(local, "wb") as f:
            f.write(r.read())
    return local


def usd_texture(stage, shader: UsdShade.Shader, input_name: str, usd_dir: str):
    """Follow input -> UsdUVTexture -> file asset path."""
    attr = shader.GetInput(input_name)
    if not attr:
        return None
    val = attr.Get()
    if isinstance(val, Sdf.AssetPath):
        return os.path.realpath(os.path.join(usd_dir, val.path or val.resolvedPath))
    conns = attr.GetAttr().GetConnections()
    if not conns:
        return None
    src_prim_path = conns[0].GetPrimPath()
    src_prim = stage.GetPrimAtPath(src_prim_path)
    src = UsdShade.Shader(src_prim)
    if not src:
        return None
    if src.GetIdAttr().Get() == "UsdUVTexture":
        fattr = src.GetInput("file")
        if fattr:
            fv = fattr.Get()
            if isinstance(fv, Sdf.AssetPath):
                return os.path.realpath(os.path.join(usd_dir, fv.path or fv.resolvedPath))
    return None


def parse_material(stage, mat_prim, usd_dir: str):
    """Parse a UsdPreviewSurface into (PBRMaterial, base_tex, normal_tex)."""
    mat = UsdShade.Material(mat_prim)
    surface = mat.GetSurfaceOutput()
    shader = None
    raw_paths = surface.GetRawConnectedSourcePaths() if surface else []
    if len(raw_paths) > 0:
        sp = stage.GetPrimAtPath(raw_paths[0].GetPrimPath())
        s = UsdShade.Shader(sp)
        if s and s.GetIdAttr().Get() == "UsdPreviewSurface":
            shader = s
    if shader is None:
        for child in mat_prim.GetChildren():
            s = UsdShade.Shader(child)
            if s and s.GetIdAttr().Get() == "UsdPreviewSurface":
                shader = s
                break
    if shader is None:
        return None

    def rgb(name, default):
        a = shader.GetInput(name)
        if not a:
            return default
        v = a.Get()
        if isinstance(v, Gf.Vec3f):
            return [float(v[0]), float(v[1]), float(v[2])]
        if isinstance(v, Gf.Vec4f):
            return [float(v[0]), float(v[1]), float(v[2])]
        return default

    base = rgb("diffuseColor", [0.75, 0.75, 0.78])
    emis = rgb("emissiveColor", [0.0, 0.0, 0.0])

    def scalar(name, default):
        a = shader.GetInput(name)
        v = a.Get() if a else None
        try:
            return float(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    rough = scalar("roughness", 0.5)
    metal = scalar("metallic", 0.0)
    opacity = scalar("opacity", 1.0)
    base_tex = usd_texture(stage, shader, "diffuseColor", usd_dir)
    normal_tex = usd_texture(stage, shader, "normal", usd_dir)

    m = trimesh.visual.material.PBRMaterial(
        name=mat_prim.GetPrim().GetName(),
        baseColorFactor=[base[0], base[1], base[2], min(1.0, opacity)],
        metallicFactor=metal,
        roughnessFactor=rough,
        emissiveFactor=[emis[0], emis[1], emis[2]],
        alphaMode="OPAQUE" if opacity > 0.99 else "BLEND",
        doubleSided=False,
    )
    return m, base_tex, normal_tex


def collect(stage, usd_dir: str, mat_cache, tex_files):
    """Yield per-mesh dicts with world transforms and per-triangle material ids."""
    def mat_id(mat_prim, tex_bundle):
        if mat_prim is not None and not mat_prim.GetPrim().IsValid():
            mat_prim = None
        key = str(mat_prim.GetPath()) if mat_prim else "default"
        if key not in mat_cache:
            if mat_prim is None:
                m = trimesh.visual.material.PBRMaterial(name="default", baseColorFactor=[0.7, 0.7, 0.72, 1.0], metallicFactor=0.0, roughnessFactor=0.6)
                mat_cache[key] = (m, None, None)
            else:
                parsed = parse_material(stage, mat_prim, usd_dir)
                mat_cache[key] = parsed if parsed else (trimesh.visual.material.PBRMaterial(name=mat_prim.GetPrim().GetName()), None, None)
        m, base_t, norm_t = mat_cache[key]
        if base_t and base_t not in tex_files:
            tex_files[base_t] = len(tex_files) + 1
        if norm_t and norm_t not in tex_files:
            tex_files[norm_t] = len(tex_files) + 1
        return mat_cache[key]

    for prim in stage.Traverse():
        if not prim.IsA(UsdGeom.Mesh):
            continue
        mesh = UsdGeom.Mesh(prim)
        pts = np.array(mesh.GetPointsAttr().Get(), dtype=np.float64)
        counts = np.array(mesh.GetFaceVertexCountsAttr().Get(), dtype=np.int64)
        idx = np.array(mesh.GetFaceVertexIndicesAttr().Get(), dtype=np.int64)
        if len(pts) == 0 or len(counts) == 0:
            continue

        # fan-triangulate (only faces with >=3 verts)
        valid = counts >= 3
        counts_v = counts[valid]
        starts = np.concatenate([[0], np.cumsum(counts)[:-1]])[valid]
        tri_per_face_v = counts_v - 2
        total_tris = int(tri_per_face_v.sum())
        tri_face_ids_full = np.full(len(counts), -1, dtype=np.int64)
        tri_face_ids_full[valid] = np.repeat(np.arange(len(counts)), tri_per_face_v)
        tri_face_ids = tri_face_ids_full[tri_face_ids_full >= 0]

        tri_idx = np.zeros((total_tris, 3), dtype=np.int64)
        pos = 0
        for f in range(len(counts_v)):
            c = int(counts_v[f])
            s = int(starts[f])
            n = c - 2
            fan = idx[s + 1 : s + c]
            tri_idx[pos : pos + n, 0] = idx[s]
            tri_idx[pos : pos + n, 1] = fan[:-1]
            tri_idx[pos : pos + n, 2] = fan[1:]
            pos += n

        uv_attr = prim.GetAttribute("primvars:st")
        uvs = None
        if uv_attr:
            raw = uv_attr.Get()
            if raw is not None and len(raw) > 0:
                u = np.array(raw, dtype=np.float64)
                if u.shape[0] == len(pts):
                    uvs = u

        world = np.array(
            UsdGeom.Xformable(prim).ComputeLocalToWorldTransform(Usd.TimeCode.Default()),
            dtype=np.float64,
        )

        # --- material regions ---
        # tri -> material key
        tri_mat_keys = [None] * total_tris

        def register(mat_prim, tri_sel):
            m, bt, nt = mat_id(mat_prim, tex_files)
            for t in tri_sel:
                tri_mat_keys[t] = key_id = (m.name, id(m))
            return m, bt, nt

        prim_binding = UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()
        default_mat = None
        if prim_binding and prim_binding[0] is not None and prim_binding[0].GetPrim().IsValid():
            default_mat = prim_binding[0]

        subsets = UsdGeom.Subset.GetGeomSubsets(UsdGeom.Imageable(prim))
        covered = np.zeros(total_tris, dtype=bool)
        for sub in subsets:
            binding = UsdShade.MaterialBindingAPI(sub.GetPrim()).ComputeBoundMaterial()
            if not binding:
                continue
            elems = np.array(sub.GetIndicesAttr().Get() or [], dtype=np.int64)
            if len(elems) == 0:
                continue
            tri_mask = np.isin(tri_face_ids, elems)
            m, bt, nt = mat_id(binding[0], tex_files)
            for t in np.where(tri_mask)[0]:
                tri_mat_keys[t] = (m.name, id(m))
            covered |= tri_mask

        m_default, bt_d, nt_d = mat_id(default_mat, tex_files)
        for t in np.where(~covered)[0]:
            tri_mat_keys[t] = (m_default.name, id(m_default))

        yield {
            "name": prim.GetName(),
            "points": pts,
            "tri_idx": tri_idx,
            "uvs": uvs,
            "world": world,
            "tri_mat_keys": tri_mat_keys,
        }


def main():
    os.makedirs(OUT, exist_ok=True)
    report = []
    for pkg, (role, budget) in PICKS.items():
        try:
            usd_path = fetch(pkg)
            stage = Usd.Stage.Open(usd_path)
            usd_dir = os.path.dirname(usd_path)
            mat_cache, tex_files = {}, {}

            # group triangles by material across the whole appliance
            groups = {}  # matkey -> {"verts": [pts], "faces": [...]}
            raw_tris = 0
            for mdata in collect(stage, usd_dir, mat_cache, tex_files):
                pts = mdata["points"]
                tri_idx = mdata["tri_idx"]
                raw_tris += len(tri_idx)
                # apply world transform to points upfront
                P = pts @ mdata["world"][:3, :3].T + mdata["world"][:3, 3]
                for t, key in enumerate(mdata["tri_mat_keys"]):
                    g = groups.setdefault(key, {"verts": [], "faces": [], "offset": 0})
                    g["verts"].append(P[tri_idx[t]])
                    g["faces"].append([g["offset"], g["offset"] + 1, g["offset"] + 2])
                    g["offset"] += 3

            # merge same-material verts, decimate, add to scene
            scene = trimesh.Scene()
            mat_for_key = {k: next((m for m, _, _ in mat_cache.values() if (m.name, id(m)) == k), None) for k in groups}

            for key, g in groups.items():
                V = np.concatenate(g["verts"], axis=0).astype(np.float64)
                F = np.array(g["faces"], dtype=np.int64)
                # weld duplicate verts
                dec = trimesh.Trimesh(vertices=V, faces=F, process=True)
                dec.merge_vertices()
                dec.update_faces(dec.unique_faces())
                dec.remove_unreferenced_vertices()
                if len(dec.faces) == 0:
                    continue
                if len(dec.faces) > budget // max(1, len(groups)):
                    try:
                        import fast_simplification

                        target = max(500, budget // max(1, len(groups)))
                        v2, f2 = fast_simplification.simplify(
                            dec.vertices.astype(np.float32), dec.faces.astype(np.int64), target_count=target
                        )
                        dec = trimesh.Trimesh(vertices=v2, faces=f2, process=True)
                    except Exception as e:  # noqa: BLE001
                        print(f"    decimate skipped: {e}")
                dec.visual = trimesh.visual.TextureVisuals(material=mat_for_key.get(key))
                scene.add_geometry(dec, node_name=f"{key[0]}_{len(scene.graph.nodes)}")

            out = os.path.join(OUT, f"{role}.glb")
            scene.export(out)
            print(f"  {pkg} -> {role}.glb ({raw_tris:,} raw tris, {os.path.getsize(out)/1e6:.1f} MB)")
            report.append({"role": role, "source": f"LGElectronics/simready-assets:{pkg}", "rawTriangles": raw_tris})
        except Exception as e:  # noqa: BLE001
            print(f"  FAILED {pkg}: {e}", file=sys.stderr)
            import traceback

            traceback.print_exc()

    cat_path = os.path.join(OUT, "catalog.json")
    cat = {}
    if os.path.exists(cat_path):
        with open(cat_path) as f:
            cat = json.load(f)
    cat["items"] = cat.get("items", {})
    for r in report:
        cat["items"][r["role"]] = {
            "asset": r["source"],
            "file": f"{r['role']}.glb",
            "license": "CC-BY-4.0",
            "convertedFromUSD": True,
        }
    cat["lg_source"] = "LG Electronics SimReady assets, USD->GLB converted locally (usd-core + trimesh)"
    with open(cat_path, "w") as f:
        json.dump(cat, f, indent=2)
    print("DONE:", len(report), "LG assets converted")


if __name__ == "__main__":
    main()
