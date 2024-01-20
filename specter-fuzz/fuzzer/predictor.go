package fuzzer

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Engine struct {
	Client     *http.Client
	TargetURL  string
	Queue      []string
	QueueMutex sync.Mutex
	Threads    int
	JitterMs   int
	FoundPaths map[string]bool
	
	// A simple heuristic map: if we find key, we dynamically inject values into queue
	Predictions map[string][]string
}

func NewEngine(client *http.Client, target string, baseWords []string, threads int, jitter int) *Engine {
	// Normalize target
	if !strings.HasSuffix(target, "/") {
		target += "/"
	}

	e := &Engine{
		Client:     client,
		TargetURL:  target,
		Queue:      append([]string{}, baseWords...),
		Threads:    threads,
		JitterMs:   jitter,
		FoundPaths: make(map[string]bool),
		Predictions: map[string][]string{
			"api":    {"v1", "v2", "users", "auth", "graphql"},
			"v1":     {"users", "admin", "login", "status"},
			"admin":  {"dashboard", "login", "users", "settings", "config.php"},
			"backup": {"db.sql", "config.bak", ".env", "archive.zip"},
		},
	}
	return e
}

func (e *Engine) Run() {
	var wg sync.WaitGroup

	for i := 0; i < e.Threads; i++ {
		wg.Add(1)
		go e.worker(&wg)
	}

	wg.Wait()
}

func (e *Engine) worker(wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		// 1. Dequeue
		e.QueueMutex.Lock()
		if len(e.Queue) == 0 {
			e.QueueMutex.Unlock()
			return
		}
		path := e.Queue[0]
		e.Queue = e.Queue[1:]
		e.QueueMutex.Unlock()

		// 2. Anti-WAF Jitter
		if e.JitterMs > 0 {
			time.Sleep(time.Duration(rand.Intn(e.JitterMs)) * time.Millisecond)
		}

		// 3. Make Request
		url := e.TargetURL + path
		resp, err := e.Client.Get(url)
		if err != nil {
			continue // network error, skip
		}
		
		status := resp.StatusCode
		resp.Body.Close()

		// 4. Handle Result
		if status == 200 || status == 301 || status == 302 || status == 403 {
			fmt.Printf("\033[32m[+] %d - /%s\033[0m\n", status, path)
			
			e.QueueMutex.Lock()
			if !e.FoundPaths[path] {
				e.FoundPaths[path] = true
				
				// PREDICTION LOGIC:
				// If we found a path that exists in our heuristic map, inject new paths to explore!
				if injected, exists := e.Predictions[path]; exists {
					fmt.Printf("\033[36m[*] Prediction Engine Triggered for '/%s'. Injecting %d new paths...\033[0m\n", path, len(injected))
					for _, newPath := range injected {
						fullPath := path + "/" + newPath
						e.Queue = append([]string{fullPath}, e.Queue...) // Prioritize by pushing to front
					}
				}
			}
			e.QueueMutex.Unlock()
		}
	}
}
