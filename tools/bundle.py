#!/usr/bin/env python3
"""Squash the game into a single self-contained HTML file.

The game normally loads styles.css and nine .js files. That's good for
reading and editing, but sometimes you want ONE file you can email, drop on
a USB stick, or host anywhere. This script inlines everything.

    python3 tools/bundle.py             -> dist/cold-chain.html
    python3 tools/bundle.py --artifact  -> dist/cold-chain.body.html

The --artifact form leaves out the <html>/<head>/<body> wrapper, for hosts
that supply their own.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8').rstrip()


def main():
    html = read('index.html')

    # Swap each <link>/<script src> for the file's actual contents. Passing a
    # function to re.sub means the replacement text is used verbatim, so
    # backslashes in the JS (’ and friends) survive intact.
    html = re.sub(
        r'<link rel="stylesheet" href="([^"]+)">',
        lambda m: '<style>\n%s\n</style>' % read(m.group(1)),
        html,
    )
    html = re.sub(
        r'<script src="([^"]+)"></script>',
        lambda m: '<script>\n%s\n</script>' % read(m.group(1)),
        html,
    )

    if '--artifact' in sys.argv:
        head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
        body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
        head = re.sub(r'\s*<meta[^>]*>', '', head)   # the host supplies these
        html = head.strip() + '\n\n' + body.strip() + '\n'
        name = 'cold-chain.body.html'
    else:
        name = 'cold-chain.html'

    out = ROOT / 'dist' / name
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print('wrote %s (%.1f KB)' % (out.relative_to(ROOT), len(html) / 1024))


if __name__ == '__main__':
    main()
