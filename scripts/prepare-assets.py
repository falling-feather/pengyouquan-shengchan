"""Rebuild demo images and, optionally, the OFL font from local sources."""
from pathlib import Path
from PIL import Image
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('reference_directory', type=Path)
parser.add_argument('--font-source', type=Path, help='Local Noto Sans SC variable font for regenerating the font subset')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
images = root / 'public' / 'samples'
fonts = root / 'src' / 'assets' / 'fonts'
for directory in (images, fonts):
    if not directory.resolve().is_relative_to(root):
        raise ValueError('Output directory must remain in the project.')
    directory.mkdir(parents=True, exist_ok=True)


def save_crop(source, rectangle, name):
    image = source.crop(rectangle).convert('RGB')
    image.save(images / name, format='WEBP', quality=94, method=6)


with Image.open(args.reference_directory / '062482f45414632e9d0effba4bb8ebf7.jpg') as source:
    save_crop(source, (36, 330, 162, 456), 'author.webp')
    for index in range(59):
        row, column = divmod(index, 9)
        left, top = round(186 + column * 109), round(925 + row * 114)
        save_crop(source, (left, top, left + 96, top + 96), f'friend-{index + 1:02}.webp')
with Image.open(args.reference_directory / 'b8a4e685f51e6e521564991097591eaa.png') as source:
    save_crop(source, (205, 510, 338, 645), 'link-cover.webp')
with Image.open(args.reference_directory / '9d545d7f7069de3edee81ac71b0b8a6c.jpg') as source:
    for index, left in enumerate((194, 248, 303, 359, 413), start=1):
        save_crop(source, (left, 65, left + 43, 108), f'status-1-{index}.webp')
with Image.open(args.reference_directory / 'e693c6404f845ea8cba40972bb2e2d3e.jpg') as source:
    for index, left in enumerate((217, 272), start=1):
        save_crop(source, (left, 34, left + 46, 80), f'status-2-{index}.webp')
with Image.open(args.reference_directory / '062482f45414632e9d0effba4bb8ebf7.jpg') as source:
    save_crop(source, (198, 49, 244, 95), 'status-4-1.webp')

if args.font_source:
    from fontTools.ttLib import TTFont
    from fontTools import subset
    from fontTools.varLib.instancer import instantiateVariableFont
    font = TTFont(args.font_source)
    instantiateVariableFont(font, {'wght': 400}, inplace=True)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=set(range(0x0000, 0x0530)) | set(range(0x1E00, 0x3200)) | set(range(0x3400, 0xA000)) | set(range(0xF900, 0x10000)))
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(fonts / 'noto-sans-sc-regular.woff2')
    print(f'Prepared font subset: {round((fonts / "noto-sans-sc-regular.woff2").stat().st_size / 1024 / 1024, 2)} MiB.')
print('Prepared 69 demo images.')
