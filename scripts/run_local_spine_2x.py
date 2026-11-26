#!/usr/bin/env python3
import os
import re
import shutil
import sys
import time
from pathlib import Path
import numpy as np
from PIL import Image
import torch
import torch_directml
from spandrel import ModelLoader
from spandrel.architectures.SPAN.__arch.span import Conv3XC

def scale_atlas_text(text: str, factor: int) -> str:
    if factor == 1:
        return text
    pat = re.compile(r"^(\s*(?:size|xy|orig|offset)\s*:\s*)(-?\d+)\s*,\s*(-?\d+)(.*)$")
    out_lines = []
    for line in text.splitlines():
        m = pat.match(line.rstrip("\r"))
        if m:
            prefix, a, b, rest = m.groups()
            out_lines.append(f"{prefix}{int(a) * factor}, {int(b) * factor}{rest}")
        else:
            out_lines.append(line.rstrip("\r"))
    return "\n".join(out_lines) + "\n"

def parse_atlas_regions(atlas_text: str, png_name: str):
    feather_keywords = ('mask', 'cheek', 'shadow', 'hoho', 'shade')
    regions = []
    lines = atlas_text.splitlines()
    i = 0
    in_page = False
    while i < len(lines):
        raw = lines[i].rstrip("\r\n")
        s = raw.strip()
        if not s:
            in_page = False
            i += 1
            continue
        if not raw.startswith(" ") and not raw.startswith("\t") and ":" not in s:
            if s.lower().endswith((".png", ".jpg", ".webp")):
                in_page = (Path(s).name.lower() == png_name.lower())
                i += 1
                while i < len(lines) and ":" in lines[i]:
                    i += 1
                continue
            if in_page:
                reg = {"name": s, "xy": None, "size": None, "rotate": False}
                i += 1
                while i < len(lines) and (lines[i].startswith(" ") or lines[i].startswith("\t")):
                    kv = lines[i].strip()
                    if ":" in kv:
                        k, v = [p.strip() for p in kv.split(":", 1)]
                        if k == "xy":
                            a, b = [int(x.strip()) for x in v.split(",")[:2]]
                            reg["xy"] = (a, b)
                        elif k == "size":
                            a, b = [int(x.strip()) for x in v.split(",")[:2]]
                            reg["size"] = (a, b)
                        elif k == "rotate":
                            reg["rotate"] = v.lower() in ("true", "90", "270")
                    i += 1
                if reg["xy"] and reg["size"]:
                    rx, ry = reg["xy"]
                    rw, rh = reg["size"]
                    pw, ph = (rh, rw) if reg["rotate"] else (rw, rh)
                    is_feather = any(kw in s.lower() for kw in feather_keywords)
                    regions.append((rx, ry, rx + pw, ry + ph, is_feather))
                continue
        i += 1
    return regions

def alpha_bleed(rgba: np.ndarray, iterations: int = 8) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3]
    mask = alpha > 4
    if mask.all() or not mask.any():
        return rgba[:, :, :3].copy()
    filled = rgb.copy()
    valid = mask.copy()
    for _ in range(iterations):
        if valid.all():
            break
        acc = np.zeros_like(filled)
        cnt = np.zeros(valid.shape, dtype=np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            v_shift = np.zeros_like(valid)
            f_shift = np.zeros_like(filled)
            ys_dst = slice(max(0, dy), valid.shape[0] + min(0, dy))
            ys_src = slice(max(0, -dy), valid.shape[0] + min(0, -dy))
            xs_dst = slice(max(0, dx), valid.shape[1] + min(0, dx))
            xs_src = slice(max(0, -dx), valid.shape[1] + min(0, -dx))
            v_shift[ys_dst, xs_dst] = valid[ys_src, xs_src]
            f_shift[ys_dst, xs_dst] = filled[ys_src, xs_src]
            acc += f_shift * v_shift[:, :, None]
            cnt += v_shift.astype(np.float32)
        newly = (~valid) & (cnt > 0)
        if not newly.any():
            break
        filled[newly] = acc[newly] / cnt[newly, None]
        valid[newly] = True
    return np.clip(filled, 0, 255).astype(np.uint8)

@torch.no_grad()
def run_model(model, rgb_np: np.ndarray, device) -> np.ndarray:
    t = torch.from_numpy(rgb_np).permute(2, 0, 1).unsqueeze(0).float().div_(255.0).to(device)
    y = model(t).float().clamp_(0.0, 1.0).squeeze(0).permute(1, 2, 0).cpu().numpy()
    return (y * 255.0 + 0.5).astype(np.uint8)

def upscale_region(model, scale: int, patch_rgba: np.ndarray, device) -> np.ndarray:
    h, w, _ = patch_rgba.shape
    out_w, out_h = w * scale, h * scale
    alpha_orig = patch_rgba[:, :, 3]
    if not (alpha_orig > 0).any():
        return np.zeros((out_h, out_w, 4), dtype=np.uint8)

    bled_rgb = alpha_bleed(patch_rgba, iterations=8)
    pad = min(8, max(2, min(h, w)))
    padded_rgb = np.pad(bled_rgb, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    up_padded = run_model(model, padded_rgb, device)
    up_rgb = up_padded[pad * scale:(pad + h) * scale, pad * scale:(pad + w) * scale, :].astype(np.float32)

    base_rgb = np.array(Image.fromarray(bled_rgb).resize((out_w, out_h), Image.Resampling.BICUBIC), dtype=np.float32)
    up_alpha = np.array(Image.fromarray(alpha_orig).resize((out_w, out_h), Image.Resampling.BICUBIC), dtype=np.uint8)

    # Low-freq color lock
    diff = up_rgb - base_rgb
    sigma = 6.0 * (scale / 2.0)
    k = int(round(sigma * 3)) * 2 + 1
    kx = torch.arange(k, dtype=torch.float32, device=device) - k // 2
    g1d = torch.exp(-(kx ** 2) / (2 * sigma * sigma))
    g1d = g1d / g1d.sum()
    t_diff = torch.from_numpy(diff).permute(2, 0, 1).unsqueeze(0).to(device)
    t_pad = torch.nn.functional.pad(t_diff, (k // 2, k // 2, k // 2, k // 2), mode="replicate")
    w_h = g1d.view(1, 1, 1, k).expand(3, 1, 1, k)
    w_v = g1d.view(1, 1, k, 1).expand(3, 1, k, 1)
    blur = torch.nn.functional.conv2d(t_pad, w_h, groups=3)
    blur = torch.nn.functional.conv2d(blur, w_v, groups=3)
    low_freq_drift = blur.squeeze(0).permute(1, 2, 0).cpu().numpy()

    locked_rgb = np.clip(up_rgb - low_freq_drift, 0.0, 255.0)
    a_f = up_alpha.astype(np.float32)[:, :, None]
    feather_w = np.clip(a_f / 245.0, 0.0, 1.0)
    final_rgb = np.clip(locked_rgb * feather_w + base_rgb * (1.0 - feather_w) + 0.5, 0.0, 255.0).astype(np.uint8)
    return np.dstack([final_rgb, up_alpha])

def main():
    src_root = Path(r"F:\sc\cache\spine")
    dst_root = Path(r"F:\sc\cache-4k\spine")
    model_path = Path(r"F:\sc\sr4k-pipeline\models\2xHFA2k_LUDVAE_SPAN.safetensors")

    dev = torch_directml.device()
    print(f"=== 本地显卡全量 Spine 2x 重跑 | 设备: DirectML ({torch_directml.device_name(0)}) ===", flush=True)

    desc = ModelLoader().load_from_file(str(model_path))
    model = desc.model.eval()

    import types
    fused = 0
    for m in model.modules():
        if isinstance(m, Conv3XC):
            m.update_params()
            def _fast_fwd(self, x):
                out = self.eval_conv(x)
                if self.has_relu:
                    out = torch.nn.functional.leaky_relu(out, negative_slope=0.05)
                return out
            m.forward = types.MethodType(_fast_fwd, m)
            fused += 1
    print(f"[权重固化] 成功加固 {fused} 个 Conv3XC 卷积层，彻底锁定权重防竞态！", flush=True)
    model = model.to(dev)

    pngs = sorted(src_root.rglob("data.png"))
    total = len(pngs)
    print(f"待处理全量立绘: {total} 套\n", flush=True)

    t_start = time.time()
    for idx, p_src in enumerate(pngs):
        rel = p_src.relative_to(src_root)
        p_dst = dst_root / rel
        p_dst.parent.mkdir(parents=True, exist_ok=True)
        tmp_dst = p_dst.with_suffix(".png.tmp")
        src_atlas = p_src.with_suffix(".atlas")
        dst_atlas = p_dst.with_suffix(".atlas")
        src_json = p_src.with_suffix(".json")
        dst_json = p_dst.with_suffix(".json")

        t0 = time.time()
        with Image.open(p_src) as im:
            w, h = im.size
            rgba = np.array(im.convert("RGBA"))
        
        regs = parse_atlas_regions(src_atlas.read_text(encoding="utf-8", errors="ignore"), p_src.name) if src_atlas.exists() else []
        out_canvas = np.zeros((h * 2, w * 2, 4), dtype=np.uint8)

        if regs:
            for (rx0, ry0, rx1, ry1, is_f) in regs:
                x0, y0 = max(0, rx0), max(0, ry0)
                x1, y1 = min(w, rx1), min(h, ry1)
                if x1 <= x0 or y1 <= y0:
                    continue
                patch_out = upscale_region(model, 2, rgba[y0:y1, x0:x1, :], dev)
                if is_f:
                    ph, pw, _ = patch_out.shape
                    alpha_p = patch_out[:, :, 3].astype(np.float32)
                    if (alpha_p[0, :] > 0).any() or (alpha_p[-1, :] > 0).any() or (alpha_p[:, 0] > 0).any() or (alpha_p[:, -1] > 0).any():
                        y_idx = np.arange(ph)
                        x_idx = np.arange(pw)
                        dist_y = np.minimum(y_idx, ph - 1 - y_idx)
                        dist_x = np.minimum(x_idx, pw - 1 - x_idx)
                        min_dist = np.minimum(dist_y[:, None], dist_x[None, :])
                        ramp = np.clip(min_dist / 6.0, 0.0, 1.0)
                        patch_out[:, :, 3] = np.round(alpha_p * ramp).astype(np.uint8)
                out_canvas[y0 * 2:y1 * 2, x0 * 2:x1 * 2, :] = patch_out
        else:
            out_canvas = upscale_region(model, 2, rgba, dev)

        Image.fromarray(out_canvas).save(tmp_dst, format="PNG", compress_level=4)
        os.replace(tmp_dst, p_dst)

        if src_atlas.exists():
            atlas_txt = src_atlas.read_text(encoding="utf-8", errors="ignore")
            scaled_txt = scale_atlas_text(atlas_txt, 2)
            tmp_atlas = dst_atlas.with_suffix(".atlas.tmp")
            tmp_atlas.write_text(scaled_txt, encoding="utf-8")
            os.replace(tmp_atlas, dst_atlas)

        if src_json.exists():
            shutil.copy2(src_json, dst_json)

        dt = time.time() - t0
        elapsed = time.time() - t_start
        done_cnt = idx + 1
        rate = done_cnt / elapsed
        remain_s = (total - done_cnt) / rate
        eta_min = remain_s / 60.0

        if done_cnt % 10 == 0 or done_cnt == 1 or done_cnt == total:
            print(f"[{done_cnt:4d}/{total}] ({done_cnt/total*100:5.1f}%) | 单套: {dt:4.2f}s | 耗时: {elapsed/60:4.1f}m | 预计剩余: {eta_min:4.1f}m | {rel}", flush=True)

    print(f"\n=== 全部 {total} 套立绘 2x 无缝超分完成！总耗时: {(time.time() - t_start)/60:.1f} 分钟 ===", flush=True)

if __name__ == "__main__":
    main()
