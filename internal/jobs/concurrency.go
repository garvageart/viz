package jobs

import (
	"runtime"

	"github.com/ThreeDotsLabs/watermill/message"
)

type ConcurrencyToken struct{}

// ConcurrencyManager restricts the number of concurrent running jobs.
type ConcurrencyManager struct {
	maxConcurrent int
	tokens        chan ConcurrencyToken
}

func (t *ConcurrencyManager) GetNumberOfTokens() int {
	return len(t.tokens)
}

// Acquire blocks until a slot is available.
func (l *ConcurrencyManager) Acquire() {
	l.tokens <- ConcurrencyToken{}
}

// Release frees up a slot.
func (l *ConcurrencyManager) Release() {
	<-l.tokens
}

// SetMaxConcurrent sets the maximum number of concurrent jobs.
func (l *ConcurrencyManager) SetMaxConcurrent(max int) {
	l.maxConcurrent = max
}

// NewConcurrencyManager creates a new manager with the given max concurrency.
func NewConcurrencyManager() *ConcurrencyManager {
	max := runtime.NumCPU()
	if max < 1 { // is this even possible haha?
		max = 1
	}

	return &ConcurrencyManager{
		maxConcurrent: max,
		tokens:        make(chan ConcurrencyToken, max),
	}
}

// ConcurrencyMiddleware creates a middleware that limits the number of concurrent message handlers
func (l *ConcurrencyManager) Middleware(h message.HandlerFunc) message.HandlerFunc {
	return func(msg *message.Message) ([]*message.Message, error) {
		l.Acquire()
		defer l.Release()

		return h(msg)
	}
}
