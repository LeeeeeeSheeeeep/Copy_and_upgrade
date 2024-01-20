const canvas = document.getElementById('universe');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

let width, height;
let center_x, center_y;
let sysMetrics = null;
let planets = [];
let lasers = [];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    center_x = width / 2;
    center_y = height / 2;
}
window.addEventListener('resize', resize);
resize();

// Connect WebSocket
const ws = new WebSocket('ws://localhost:8765');
ws.onmessage = (event) => {
    sysMetrics = JSON.parse(event.data);
    updateHUD();
    updatePlanets();
};

function updateHUD() {
    if (!sysMetrics) return;
    document.getElementById('cpu-total').textContent = `${sysMetrics.cpu_total.toFixed(1)}%`;
    if (sysMetrics.cpu_total > 80) document.getElementById('cpu-total').className = 'warning';
    else document.getElementById('cpu-total').className = '';

    document.getElementById('ram-total').textContent = `${sysMetrics.ram_used.toFixed(1)} / ${sysMetrics.ram_total.toFixed(1)} GB (${sysMetrics.ram_percent}%)`;
}

class Planet {
    constructor(pid, name, cpu, ram, threads) {
        this.pid = pid;
        this.name = name;
        this.cpu = cpu;
        this.ram = ram;
        this.threads = threads;
        
        // Visual mappings
        this.angle = Math.random() * Math.PI * 2;
        // Orbit radius based on PID to scatter them, but offset so they don't hit the sun
        this.orbitRadius = 150 + (pid % 500); 
        // Speed based on CPU usage
        this.angularVelocity = 0.005 + (cpu * 0.001);
        // Size based on RAM usage
        this.radius = Math.max(3, Math.min(25, Math.sqrt(ram) * 0.8));
        
        // Color based on thread count
        const hue = (threads * 5) % 360;
        this.color = `hsl(${hue}, 80%, 60%)`;
        
        this.x = 0;
        this.y = 0;
    }

    updateData(cpu, ram, threads) {
        this.cpu = cpu;
        this.ram = ram;
        this.threads = threads;
        this.angularVelocity = 0.005 + (cpu * 0.001);
        this.radius = Math.max(3, Math.min(25, Math.sqrt(ram) * 0.8));
        this.orbitRadius = Math.max(100, 150 + (this.pid % 500) - (cpu * 2)); // High CPU pulls closer to sun
    }

    update() {
        this.angle += this.angularVelocity;
        this.x = center_x + Math.cos(this.angle) * this.orbitRadius;
        this.y = center_y + Math.sin(this.angle) * this.orbitRadius;
    }

    draw(ctx) {
        ctx.beginPath();
        // Orbit path
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.arc(center_x, center_y, this.orbitRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Planet
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.cpu > 10 ? 15 : 5;
        ctx.shadowColor = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Label if CPU > 5%
        if (this.cpu > 5.0) {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.font = '10px Consolas';
            ctx.fillText(this.name, this.x + this.radius + 2, this.y);
        }
    }
}

class Laser {
    constructor(target) {
        this.target = target;
        this.progress = 0;
    }
    update() {
        this.progress += 0.1;
        return this.progress >= 1;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.moveTo(center_x, center_y);
        
        const currentX = center_x + (this.target.x - center_x) * this.progress;
        const currentY = center_y + (this.target.y - center_y) * this.progress;
        
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        // Impact explosion
        if (this.progress > 0.8) {
            ctx.beginPath();
            ctx.fillStyle = '#ff0055';
            ctx.arc(currentX, currentY, 20 * (this.progress - 0.8)*5, 0, Math.PI*2);
            ctx.fill();
        }
    }
}

function updatePlanets() {
    if (!sysMetrics) return;
    
    // Sync active processes
    const incomingPids = new Set(sysMetrics.processes.map(p => p.pid));
    
    // Remove dead processes
    planets = planets.filter(p => incomingPids.has(p.pid));
    
    // Update or add processes
    sysMetrics.processes.forEach(proc => {
        let existing = planets.find(p => p.pid === proc.pid);
        if (existing) {
            existing.updateData(proc.cpu, proc.ram, proc.threads);
        } else {
            planets.push(new Planet(proc.pid, proc.name, proc.cpu, proc.ram, proc.threads));
        }
    });
}

// Mouse interaction
let mouseX = 0, mouseY = 0;
let hoveredPlanet = null;

canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

canvas.addEventListener('click', (e) => {
    if (hoveredPlanet) {
        // Fire laser from sun to planet
        lasers.push(new Laser(hoveredPlanet));
        // Simulate kill by removing visually
        planets = planets.filter(p => p.pid !== hoveredPlanet.pid);
        tooltip.style.display = 'none';
        
        // Note: Real implementation would send a kill command to backend via WS here.
        // ws.send(JSON.stringify({action: 'kill', pid: hoveredPlanet.pid}));
    }
});

function drawSun(ctx) {
    let sunRadius = 40;
    let cpuTotal = sysMetrics ? sysMetrics.cpu_total : 0;
    
    // Sun pulses with CPU load
    let pulse = Math.sin(Date.now() / (200 - cpuTotal)) * 5;
    let actualRadius = sunRadius + pulse + (cpuTotal * 0.2);
    
    // Color heat based on CPU
    let r = Math.min(255, 150 + cpuTotal * 2);
    let g = Math.max(50, 200 - cpuTotal * 2);
    let b = 50;
    
    ctx.beginPath();
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.shadowBlur = 40 + cpuTotal;
    ctx.shadowColor = `rgb(${r}, 0, 0)`;
    ctx.arc(center_x, center_y, actualRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.arc(center_x, center_y, actualRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Consolas';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CPU', center_x, center_y);
}

function loop() {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.3)'; // Trail effect
    ctx.fillRect(0, 0, width, height);
    
    drawSun(ctx);
    
    hoveredPlanet = null;
    
    planets.forEach(p => {
        p.update();
        p.draw(ctx);
        
        // Collision detection for tooltip
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        if (Math.hypot(dx, dy) < p.radius + 5) {
            hoveredPlanet = p;
        }
    });
    
    // Render lasers
    lasers = lasers.filter(l => {
        l.draw(ctx);
        return !l.update();
    });

    if (hoveredPlanet) {
        tooltip.style.display = 'block';
        tooltip.style.left = (mouseX + 15) + 'px';
        tooltip.style.top = (mouseY + 15) + 'px';
        document.getElementById('tt-name').textContent = hoveredPlanet.name;
        document.getElementById('tt-pid').textContent = hoveredPlanet.pid;
        document.getElementById('tt-cpu').textContent = hoveredPlanet.cpu.toFixed(1);
        document.getElementById('tt-ram').textContent = hoveredPlanet.ram.toFixed(1);
        document.getElementById('tt-threads').textContent = hoveredPlanet.threads;
        canvas.style.cursor = 'crosshair';
    } else {
        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
    }
    
    requestAnimationFrame(loop);
}

loop();
