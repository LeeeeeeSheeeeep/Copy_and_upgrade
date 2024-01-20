# Neural-Matrix 🟢

**Neural-Matrix** is an advanced terminal code rain visualizer.

## The Upgrade
The original `cmatrix` is a beautiful classic, but it streams random, meaningless ASCII characters. 

`neural-matrix` takes this into the real world:
- **Actual Code**: It scans your local directory and streams your *actual source code files* as the matrix rain. 
- **Network Awareness**: It monitors your system's network I/O in a background thread. If it detects a sudden spike in traffic (simulating a hack or heavy load), the matrix rain turns angry red and flashes an alert.

## Inspiration & Credit
Based entirely on the aesthetic of [cmatrix](https://github.com/abishekvashok/cmatrix). We simply made it context-aware.

## Usage
1. Install dependencies: `pip install psutil windows-curses` (if on Windows)
2. Run the visualizer: `python matrix.py`
3. Press `q` to exit.
