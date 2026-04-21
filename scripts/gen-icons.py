"""
生成 PWA 图标：public/icons/icon-192.png 和 icon-512.png
使用纯 Python 标准库，无需第三方依赖。
"""
import struct, zlib, os
from pathlib import Path

def make_png(size: int, bg: tuple, text_color: tuple, char: str) -> bytes:
    """生成带单字符的纯色 PNG（简单实现，不依赖 Pillow）"""
    # 画布数据：RGBA
    pixels = []
    # 用简单的圆角矩形背景 + 白色文字模拟
    # 为简单起见直接生成纯色图（实际 icon 用 SVG 转换工具更好）
    for y in range(size):
        row = []
        for x in range(size):
            # 圆角：四角 mask
            r = size * 0.18
            in_corner = (
                (x < r and y < r and (x-r)**2 + (y-r)**2 > r**2) or
                (x > size-r and y < r and (x-(size-r))**2 + (y-r)**2 > r**2) or
                (x < r and y > size-r and (x-r)**2 + (y-(size-r))**2 > r**2) or
                (x > size-r and y > size-r and (x-(size-r))**2 + (y-(size-r))**2 > r**2)
            )
            if in_corner:
                row.extend([0, 0, 0, 0])  # transparent
            else:
                row.extend([*bg, 255])
        pixels.append(bytes(row))

    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    # IHDR
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    # IDAT
    raw = b''.join(b'\x00' + row for row in pixels)
    idat = zlib.compress(raw, 9)

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', idat)
        + chunk(b'IEND', b'')
    )

OUT = Path(r'D:/used-by-Claude/tuyujia/public/icons')
OUT.mkdir(parents=True, exist_ok=True)

BG = (29, 78, 216)   # blue-700
FG = (255, 255, 255)

for size in [192, 512]:
    png = make_png(size, BG, FG, '语')
    path = OUT / f'icon-{size}.png'
    path.write_bytes(png)
    print(f'Generated {path} ({len(png)} bytes)')

print('Done.')
