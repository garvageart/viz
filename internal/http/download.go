package http

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"sync"
	"time"
)

var (
	ErrGetFile       = errors.New("error getting file")
	ErrReadingBody   = errors.New("error reading body")
	ErrCreatingFile  = errors.New("error creating file")
	ErrWritingToFile = errors.New("error writing to file")
)

// SafeHTTPClient returns an http.Client configured to prevent SSRF and DNS rebinding
// by validating IP addresses at the time of connection.
func SafeHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   timeout,
				KeepAlive: 30 * time.Second,
				Control:   SafeDialerControl,
			}).DialContext,
			ResponseHeaderTimeout: timeout,
		},
	}
}

func DownloadFile(URL string) ([]byte, error) {
	if err := ValidateURL(URL); err != nil {
		return nil, fmt.Errorf("unsafe URL: %w", err)
	}

	client := SafeHTTPClient(30 * time.Second)
	resp, err := client.Get(URL)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bad status: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func SaveToFile(path string, fileBytes []byte) (file *os.File, err error) {
	file, err = os.Create(path)
	if err != nil {
		return nil, fmt.Errorf("error creating file: %s", err.Error())
	}

	defer file.Close()

	if _, err := file.Write(fileBytes); err != nil {
		return nil, fmt.Errorf("error writing to file: %s", err.Error())
	}

	return file, nil
}

func DownloadMultipleFiles(urls []string) (allFiles [][]byte, failedUrls []string, err error) {
	var wg sync.WaitGroup
	allFiles = make([][]byte, 0, len(urls))
	failedUrls = make([]string, 0, len(urls))

	for _, url := range urls {
		// Increment the WaitGroup counter.
		wg.Add(1)
		// Launch a goroutine to fetch the URL.
		go func(url string) {
			// Decrement the counter when the goroutine completes.
			defer wg.Done()
			// Fetch the URL.
			fileBytes, err := DownloadFile(url)
			if err != nil {
				failedUrls = append(failedUrls, url)
				return
			}

			allFiles = append(allFiles, fileBytes)
		}(url)
	}
	wg.Wait()

	return allFiles, failedUrls, nil
}
