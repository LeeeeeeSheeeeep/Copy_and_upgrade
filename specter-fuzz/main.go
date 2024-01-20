package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"specter-fuzz/fuzzer"
)

func main() {
	targetURL := flag.String("u", "", "Target URL (e.g. http://example.com)")
	wordlistPath := flag.String("w", "", "Path to base wordlist")
	threads := flag.Int("t", 10, "Number of concurrent threads")
	jitter := flag.Int("j", 50, "Max jitter delay in milliseconds (Anti-WAF)")
	
	flag.Parse()

	if *targetURL == "" || *wordlistPath == "" {
		fmt.Println("Usage: specter-fuzz -u <url> -w <wordlist> [-t threads] [-j jitter]")
		os.Exit(1)
	}

	// Read wordlist
	data, err := os.ReadFile(*wordlistPath)
	if err != nil {
		fmt.Printf("Error reading wordlist: %v\n", err)
		os.Exit(1)
	}
	
	words := strings.Split(string(data), "\n")
	var baseWords []string
	for _, w := range words {
		w = strings.TrimSpace(w)
		if w != "" && !strings.HasPrefix(w, "#") {
			baseWords = append(baseWords, w)
		}
	}

	fmt.Printf(`
  ___               _              ___             
 / __| _ __  ___ __| |_  ___ _ _  | __|_  _  ___ ___
 \__ \| '_ \/ -_) _|  _|/ -_) '_| | _|| || ||_ //_ /
 |___/| .__/\___\__|\__|\___|_|   |_|  \_,_|/__|/__|
      |_|                                           
    [ Predictive Stealth Fuzzer ]

:: Target URL: %s
:: Base Words: %d
:: Threads:    %d
:: Jitter:     %dms

Starting scan...
---------------------------------------------------
`, *targetURL, len(baseWords), *threads, *jitter)

	// Initialize HTTP Client
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Initialize Fuzzer
	engine := fuzzer.NewEngine(client, *targetURL, baseWords, *threads, *jitter)
	
	startTime := time.Now()
	engine.Run()
	
	fmt.Printf("---------------------------------------------------\n")
	fmt.Printf("Scan completed in %s.\n", time.Since(startTime))
}
