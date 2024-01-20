import curses
import time
import random
import threading
import sys
import os
from network_listener import NetworkMonitor

class MatrixStream:
    def __init__(self, x, y, max_y, code_lines):
        self.x = x
        self.y = y
        self.max_y = max_y
        self.code_lines = code_lines
        self.speed = random.randint(1, 3)
        self.length = random.randint(10, 25)
        self.active_line = random.choice(self.code_lines) if self.code_lines else "0101010101"
        self.chars = list(self.active_line[:max_y]) # Trim to screen height
        self.head = 0

    def update(self):
        self.head += 1
        if self.head - self.length > self.max_y:
            self.head = 0
            self.y = random.randint(-10, 0)
            self.active_line = random.choice(self.code_lines) if self.code_lines else "010101"
            self.chars = list(self.active_line[:self.max_y])
            self.speed = random.randint(1, 3)
            self.length = random.randint(10, 25)
            
def load_local_code():
    code_lines = []
    # Read files from the current directory
    for root, _, files in os.walk('.'):
        for f in files:
            if f.endswith(('.py', '.js', '.go', '.html', '.css', '.md')):
                try:
                    with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                        for line in file:
                            cleaned = line.strip()
                            if len(cleaned) > 5:
                                code_lines.append(cleaned)
                except:
                    pass
    return code_lines

def draw_matrix(stdscr, code_lines, net_monitor):
    curses.start_color()
    curses.use_default_colors()
    
    # Color pairs
    curses.init_pair(1, curses.COLOR_GREEN, -1) # Normal
    curses.init_pair(2, curses.COLOR_WHITE, -1) # Head of stream
    curses.init_pair(3, curses.COLOR_RED, -1)   # Network Alert
    
    max_y, max_x = stdscr.getmaxyx()
    
    # Initialize streams across the screen width
    streams = [MatrixStream(x, random.randint(-max_y, 0), max_y, code_lines) for x in range(0, max_x, 2)]
    
    stdscr.nodelay(True)
    
    while True:
        stdscr.erase()
        
        # Check network status
        is_alert = net_monitor.has_recent_traffic()
        
        for stream in streams:
            # Randomly change some characters for glitch effect
            if random.random() < 0.1 and len(stream.chars) > 0:
                idx = random.randint(0, len(stream.chars)-1)
                stream.chars[idx] = chr(random.randint(33, 126))
                
            for i in range(stream.length):
                pos_y = stream.y + stream.head - i
                
                if 0 <= pos_y < max_y:
                    char_idx = (stream.head - i) % len(stream.chars) if len(stream.chars) > 0 else 0
                    char = stream.chars[char_idx] if len(stream.chars) > 0 else '0'
                    
                    if is_alert:
                        color = curses.color_pair(3) | curses.A_BOLD
                        if i == 0: char = '!' # Alert pulse at head
                    else:
                        if i == 0:
                            color = curses.color_pair(2) | curses.A_BOLD
                        else:
                            color = curses.color_pair(1)
                            if i > stream.length - 3:
                                color = color | curses.A_DIM
                                
                    try:
                        stdscr.addch(pos_y, stream.x, char, color)
                    except curses.error:
                        pass
                        
            if int(time.time() * 20) % stream.speed == 0:
                stream.update()
                
        if is_alert:
            alert_msg = " [!] INCOMING NETWORK TRAFFIC DETECTED [!] "
            try:
                stdscr.addstr(max_y // 2, (max_x - len(alert_msg)) // 2, alert_msg, curses.color_pair(3) | curses.A_REVERSE | curses.A_BLINK)
            except curses.error:
                pass

        stdscr.refresh()
        
        # Exit on 'q'
        if stdscr.getch() == ord('q'):
            break
            
        time.sleep(0.05)

def main(stdscr):
    curses.curs_set(0) # Hide cursor
    code_lines = load_local_code()
    
    net_monitor = NetworkMonitor()
    net_thread = threading.Thread(target=net_monitor.start_sniffing, daemon=True)
    net_thread.start()
    
    draw_matrix(stdscr, code_lines, net_monitor)

if __name__ == "__main__":
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass
