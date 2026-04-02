#!/usr/bin/env python3
"""Generate Branchly Chrome extension icons as PNG files.

Uses only the Python standard library (no external dependencies).
Generates a minimal valid PNG with the branch/fork icon.
"""

import struct
import zlib
import math

def create_png(width, height, pixels):
    """Create a PNG file from raw RGBA pixel data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA

    # IDAT - build raw image data with filter bytes
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter: none
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])

    compressed = zlib.compress(raw)

    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')


def blend(bg, fg, alpha):
    """Alpha-blend fg over bg."""
    a = alpha / 255.0
    return int(bg * (1 - a) + fg * a)


def draw_icon(size):
    """Draw the Branchly branch icon at the given size."""
    # Colors
    bg_r, bg_g, bg_b = 0x1a, 0x1a, 0x2e
    fg_r, fg_g, fg_b = 0x63, 0x66, 0xf1

    pixels = [0] * (size * size * 4)

    def set_pixel(x, y, r, g, b, a):
        if 0 <= x < size and 0 <= y < size:
            idx = (y * size + x) * 4
            # Alpha blend over existing
            existing_r = pixels[idx]
            existing_g = pixels[idx + 1]
            existing_b = pixels[idx + 2]
            existing_a = pixels[idx + 3]
            if existing_a == 0:
                pixels[idx] = r
                pixels[idx + 1] = g
                pixels[idx + 2] = b
                pixels[idx + 3] = a
            else:
                fa = a / 255.0
                pixels[idx] = int(existing_r * (1 - fa) + r * fa)
                pixels[idx + 1] = int(existing_g * (1 - fa) + g * fa)
                pixels[idx + 2] = int(existing_b * (1 - fa) + b * fa)
                pixels[idx + 3] = min(255, existing_a + a)

    def fill_circle(cx, cy, r, red, green, blue):
        """Fill a circle with anti-aliasing."""
        for y in range(int(cy - r - 2), int(cy + r + 3)):
            for x in range(int(cx - r - 2), int(cx + r + 3)):
                dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                if dist <= r - 0.5:
                    set_pixel(x, y, red, green, blue, 255)
                elif dist <= r + 0.5:
                    alpha = int(255 * (r + 0.5 - dist))
                    set_pixel(x, y, red, green, blue, alpha)

    def draw_thick_line(x1, y1, x2, y2, thickness, red, green, blue):
        """Draw an anti-aliased thick line."""
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx * dx + dy * dy)
        if length == 0:
            return
        steps = int(length * 3) + 1
        half = thickness / 2.0
        for i in range(steps + 1):
            t = i / steps
            cx = x1 + dx * t
            cy = y1 + dy * t
            fill_circle(cx, cy, half, red, green, blue)

    def fill_rounded_rect(x, y, w, h, r, red, green, blue):
        """Fill a rounded rectangle."""
        for py in range(size):
            for px in range(size):
                # Check if inside the rounded rect
                inside = False
                alpha = 255

                # Inner rectangles (no rounding needed)
                if x + r <= px <= x + w - r and y <= py <= y + h:
                    inside = True
                elif x <= px <= x + w and y + r <= py <= y + h - r:
                    inside = True
                else:
                    # Check corners
                    corners = [
                        (x + r, y + r),
                        (x + w - r, y + r),
                        (x + r, y + h - r),
                        (x + w - r, y + h - r),
                    ]
                    for cx, cy in corners:
                        dist = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
                        if dist <= r - 0.5:
                            inside = True
                            break
                        elif dist <= r + 0.5:
                            inside = True
                            alpha = int(255 * (r + 0.5 - dist))
                            break

                if inside:
                    set_pixel(px, py, red, green, blue, alpha)

    # Scale factor
    s = size / 128.0

    # Draw rounded background
    corner_r = 20 * s
    fill_rounded_rect(0, 0, size - 1, size - 1, corner_r, bg_r, bg_g, bg_b)

    # Line thickness
    thick = max(2, 6 * s)

    # Key coordinates (scaled from 128x128 design)
    trunk_bottom_y = 100 * s
    trunk_top_y = 28 * s
    branch_y = 58 * s
    left_x = 42 * s
    right_x = 86 * s
    center_x = 64 * s
    branch_end_y = 40 * s

    # Draw trunk (vertical line)
    draw_thick_line(center_x, trunk_bottom_y, center_x, trunk_top_y, thick, fg_r, fg_g, fg_b)

    # Draw left branch (curve approximated with line segments)
    steps = 12
    for i in range(steps):
        t1 = i / steps
        t2 = (i + 1) / steps
        # Quadratic bezier: P0=(center_x, branch_y), P1=(50*s, branch_y), P2=(left_x, branch_end_y)
        cp_x = 50 * s
        cp_y = branch_y
        bx1 = (1-t1)**2 * center_x + 2*(1-t1)*t1 * cp_x + t1**2 * left_x
        by1 = (1-t1)**2 * branch_y + 2*(1-t1)*t1 * cp_y + t1**2 * branch_end_y
        bx2 = (1-t2)**2 * center_x + 2*(1-t2)*t2 * cp_x + t2**2 * left_x
        by2 = (1-t2)**2 * branch_y + 2*(1-t2)*t2 * cp_y + t2**2 * branch_end_y
        draw_thick_line(bx1, by1, bx2, by2, thick, fg_r, fg_g, fg_b)

    # Draw right branch
    for i in range(steps):
        t1 = i / steps
        t2 = (i + 1) / steps
        cp_x = 78 * s
        cp_y = branch_y
        bx1 = (1-t1)**2 * center_x + 2*(1-t1)*t1 * cp_x + t1**2 * right_x
        by1 = (1-t1)**2 * branch_y + 2*(1-t1)*t1 * cp_y + t1**2 * branch_end_y
        bx2 = (1-t2)**2 * center_x + 2*(1-t2)*t2 * cp_x + t2**2 * right_x
        by2 = (1-t2)**2 * branch_y + 2*(1-t2)*t2 * cp_y + t2**2 * branch_end_y
        draw_thick_line(bx1, by1, bx2, by2, thick, fg_r, fg_g, fg_b)

    # Draw node circles
    node_r = max(2, 7 * s)
    fill_circle(center_x, trunk_bottom_y, node_r, fg_r, fg_g, fg_b)  # Bottom
    fill_circle(left_x, branch_end_y, node_r, fg_r, fg_g, fg_b)      # Top-left
    fill_circle(right_x, branch_end_y, node_r, fg_r, fg_g, fg_b)     # Top-right
    fill_circle(center_x, trunk_top_y, node_r, fg_r, fg_g, fg_b)     # Top-center

    return pixels


def main():
    import os
    out_dir = '/Users/zane/DeepDive/public/icons'
    os.makedirs(out_dir, exist_ok=True)

    for size in [16, 48, 128]:
        print(f'Generating icon{size}.png ...')
        pixels = draw_icon(size)
        png_data = create_png(size, size, pixels)
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'  Written {len(png_data)} bytes to {path}')

    print('Done!')


if __name__ == '__main__':
    main()
