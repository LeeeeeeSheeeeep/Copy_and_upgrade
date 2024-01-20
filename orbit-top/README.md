# Orbit-Top 🪐

**Orbit-Top** is an N-body planetary simulation system monitor.

## The Upgrade
Traditional system monitors display text or bar charts. While functional, they lack the raw sci-fi aesthetic of a command center. 

`orbit-top` reads your OS scheduler and maps it to a solar system:
- **The Sun**: Represents your CPU. The hotter your CPU, the larger and redder it gets. It pulses with your system load.
- **The Planets**: Each process is a planet. 
  - Size = RAM Usage
  - Orbital Speed = CPU Usage
  - Color = Thread Count
- **The Laser**: Click on a planet to fire a laser from the sun, simulating a `SIGKILL` on the process.

## Inspiration & Credit
Inspired by the legendary [htop](https://github.com/htop-dev/htop) and [btop](https://github.com/aristocratos/btop). We bow to their performance and reliability, and simply added WebGL insanity.

## Usage
1. Install dependencies: `pip install psutil websockets`
2. Run the server: `python server.py`
3. Open the browser to `http://localhost:8080/index.html`
