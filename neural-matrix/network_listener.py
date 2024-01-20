import psutil
import time

class NetworkMonitor:
    def __init__(self):
        self.last_bytes = 0
        self.alert_active_until = 0
        
    def start_sniffing(self):
        # Initialize
        net_io = psutil.net_io_counters()
        self.last_bytes = net_io.bytes_recv + net_io.bytes_sent
        
        while True:
            time.sleep(1)
            net_io = psutil.net_io_counters()
            current_bytes = net_io.bytes_recv + net_io.bytes_sent
            
            # Delta in bytes per second
            delta = current_bytes - self.last_bytes
            self.last_bytes = current_bytes
            
            # If traffic spikes above a threshold (e.g. 500 KB/s), trigger alert
            if delta > 500 * 1024:
                # Keep alert active for 2 seconds
                self.alert_active_until = time.time() + 2.0

    def has_recent_traffic(self):
        return time.time() < self.alert_active_until
